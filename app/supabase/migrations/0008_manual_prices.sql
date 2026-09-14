-- Real prices, typed in by the teacher.
--
-- 0004 seeded a deterministic walk because the TMX Datalinx licensing question
-- was unsettled, and an automated feed of TSX prices needs their authorisation.
-- A teacher reading a closing price off their own screen and typing it into
-- their classroom does not: nothing is redistributed, and the class trades
-- against a real number instead of an invented one.
--
-- One close per instrument per trading day, entered once for the whole class
-- group, so every student trades against the same figure and a ranking still
-- compares like with like. sim_prices already has exactly that shape; all it
-- was missing was a record of who put a number there.

alter table public.sim_prices add column if not exists entered_by uuid references auth.users(id) on delete set null;
alter table public.sim_prices add column if not exists entered_at timestamptz;

comment on column public.sim_prices.entered_by is
  'The teacher who typed this price in. Null for the seeded series and the generated fill.';
comment on column public.sim_prices.source is
  'manual = typed in by a teacher from a real quote. seeded = the generated walk from 0004 or the nightly fill.';

-- Finding a stale price is the common read: "what is the newest close we hold
-- for this instrument, and did somebody enter it today?"
create index if not exists sim_prices_recent_idx on public.sim_prices (instrument_id, as_of desc);
