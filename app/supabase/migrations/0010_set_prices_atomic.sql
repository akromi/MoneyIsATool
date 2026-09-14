-- Make entering a day's closes atomic.
--
-- The guard added against one teacher silently overwriting another's close was
-- a read followed by a write: both requests could finish reading before either
-- wrote, neither would see a clash, and the later one replaced the earlier one
-- anyway. The same shape as the trade race 0006 fixed, and the same fix — do
-- the checking and the writing in one statement, under locks.
--
-- All or nothing. A teacher entering five closes and clashing on one gets none
-- of them written, rather than a half-filled day they then have to reason about.

create or replace function public.sim_set_prices(
  p_instrument_ids uuid[],
  p_closes numeric[],
  p_as_of date,
  p_entered_by uuid,
  p_replace boolean default false
)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conflicts text[] := '{}';
  v_symbol text;
  v_close numeric;
  v_source text;
  v_hit int;
  i int;
begin
  if array_length(p_instrument_ids, 1) is distinct from array_length(p_closes, 1) then
    raise exception 'one close per instrument';
  end if;

  -- Pass one: take a lock on every row involved, and collect what clashes.
  -- The locks are held to the end of the transaction, so nothing can change
  -- underneath between the checking and the writing.
  for i in 1 .. coalesce(array_length(p_instrument_ids, 1), 0) loop
    select p.close, p.source into v_close, v_source
    from public.sim_prices p
    where p.instrument_id = p_instrument_ids[i] and p.as_of = p_as_of
    for update;

    if found and v_source = 'manual' and not p_replace
       and abs(v_close - p_closes[i]) >= 0.00005 then
      select s.symbol into v_symbol from public.sim_instruments s where s.id = p_instrument_ids[i];
      v_conflicts := v_conflicts || (coalesce(v_symbol, '?') || '|' || v_close::text);
    end if;
  end loop;

  if array_length(v_conflicts, 1) > 0 then
    return v_conflicts;
  end if;

  -- Pass two: write. The same condition rides on the upsert, so a row that
  -- appeared between the two passes cannot be quietly replaced either — it
  -- fails here instead, and the exception rolls the whole entry back.
  for i in 1 .. coalesce(array_length(p_instrument_ids, 1), 0) loop
    insert into public.sim_prices as p (instrument_id, as_of, close, source, entered_by, entered_at)
    values (p_instrument_ids[i], p_as_of, p_closes[i], 'manual', p_entered_by, now())
    on conflict (instrument_id, as_of) do update
      set close = excluded.close,
          source = 'manual',
          entered_by = excluded.entered_by,
          entered_at = excluded.entered_at
      where p.source <> 'manual'
         or p_replace
         or abs(p.close - excluded.close) < 0.00005
    returning 1 into v_hit;

    if v_hit is null then
      raise exception 'a close for that day was entered by somebody else while this was saving. Nothing was changed — look again.';
    end if;
  end loop;

  return '{}';
end $$;

revoke execute on function public.sim_set_prices(uuid[], numeric[], date, uuid, boolean)
  from public, anon, authenticated;

comment on function public.sim_set_prices is
  'Writes a day''s closing prices all at once, under locks, so two teachers entering the same day cannot overwrite each other. Returns the clashes as SYMBOL|price, empty when everything was written.';
