-- A deliberate way to delete a class, and only a deliberate one.
--
-- 0004 made sim_trades append-only with a trigger that refuses every update and
-- delete. That is right for a ledger somebody is marked against, but it also
-- made a class impossible to remove: deleting one cascades to its students and
-- then to their trades, and the trigger stopped the cascade.
--
-- That conflicts with the retention promise a school will ask about — classes
-- deleted on a schedule once the teacher has exported. So deletion gets its own
-- named path, separate from anything a page can do by accident: an ordinary
-- delete is still refused, and only this function may remove a class.

create or replace function public.sim_purge_class(p_class_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Dropped only inside this transaction, and only around this one statement.
  alter table public.sim_trades disable trigger sim_trades_no_rewrite;
  delete from public.sim_classes where id = p_class_id;
  alter table public.sim_trades enable trigger sim_trades_no_rewrite;
exception when others then
  -- Never leave the ledger unguarded because a delete failed part-way.
  alter table public.sim_trades enable trigger sim_trades_no_rewrite;
  raise;
end $$;

-- Never callable by a signed-in user or an anonymous one: retention is an
-- administrative act, run by the server, not something a page can trigger.
revoke execute on function public.sim_purge_class(uuid) from public, anon, authenticated;

comment on function public.sim_purge_class(uuid) is
  'Deletes a class and everything under it, including its append-only trades. The only supported way to remove simulation data. Export first: this cannot be undone.';
