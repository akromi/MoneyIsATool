-- Make a trade atomic.
--
-- The server read the portfolio, checked the cash, then inserted. Two requests
-- arriving together — a student double-clicking Place buy is enough — both read
-- the same cash, both passed, and both inserted. Cash went negative, and on an
-- append-only ledger the bad row cannot be taken back out.
--
-- The check and the insert now happen in one statement, behind a lock on the
-- student's own row, so a second request waits for the first and then sees its
-- result. The application keeps its own check purely to give a friendly message
-- before it gets here; this function is the authority.

create or replace function public.sim_place_trade(
  p_student_id uuid,
  p_instrument_id uuid,
  p_side text,
  p_quantity numeric,
  p_price numeric,
  p_price_as_of date,
  p_reason_code text,
  p_reason_text text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_id uuid;
  v_starting numeric;
  v_open boolean;
  v_cash numeric;
  v_held numeric;
  v_id uuid;
begin
  if p_side not in ('buy', 'sell') then raise exception 'side must be buy or sell'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'quantity must be above zero'; end if;
  if p_price is null or p_price <= 0 then raise exception 'price must be above zero'; end if;
  if coalesce(btrim(p_reason_code), '') = '' then raise exception 'a reason is required'; end if;

  -- Serialises everything this student does. Two trades cannot interleave.
  select s.class_id into v_class_id
  from public.sim_students s where s.id = p_student_id for update;
  if v_class_id is null then raise exception 'no such student'; end if;

  select c.starting_cash, c.trading_open into v_starting, v_open
  from public.sim_classes c where c.id = v_class_id;
  if not v_open then raise exception 'trading is paused for this class'; end if;

  select v_starting
       - coalesce(sum(case when t.side = 'buy'  then t.quantity * t.price_used end), 0)
       + coalesce(sum(case when t.side = 'sell' then t.quantity * t.price_used end), 0)
    into v_cash
  from public.sim_trades t where t.student_id = p_student_id;

  if p_side = 'buy' and (p_quantity * p_price) > v_cash + 0.000000001 then
    raise exception 'not enough cash: % available', round(v_cash, 2);
  end if;

  if p_side = 'sell' then
    select coalesce(sum(case when t.side = 'buy' then t.quantity else -t.quantity end), 0)
      into v_held
    from public.sim_trades t
    where t.student_id = p_student_id and t.instrument_id = p_instrument_id;
    if v_held + 0.000000001 < p_quantity then
      raise exception 'not enough units held: % available', v_held;
    end if;
  end if;

  insert into public.sim_trades
    (student_id, instrument_id, side, quantity, price_used, price_as_of, price_delay, price_source, reason_code, reason_text)
  values
    (p_student_id, p_instrument_id, p_side, p_quantity, p_price, p_price_as_of, 'end_of_day', 'seeded', p_reason_code, p_reason_text)
  returning id into v_id;

  return v_id;
end $$;

-- Called by the server only, never straight from a browser.
revoke execute on function public.sim_place_trade(uuid, uuid, text, numeric, numeric, date, text, text)
  from public, anon, authenticated;

comment on function public.sim_place_trade is
  'Validates and records one trade atomically, under a lock on the student row, so two requests arriving together cannot both spend the same cash.';
