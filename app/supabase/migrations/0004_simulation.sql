-- Money Is a Tool — Canadian Investment Challenge, first vertical slice.
--
-- One teacher, one class, five instruments, buy and sell, an append-only
-- ledger and a student dashboard. Everything here is prefixed sim_ so the
-- simulation never gets tangled with the book area's tables.
--
-- Two deliberate decisions, both from the development review:
--
--   Students have no email address and no auth account. A teacher creates the
--   roster; a student signs in with the class code, their name and a passcode
--   the teacher hands out. Holding no direct identifier is what keeps this
--   simple under Canadian school privacy law.
--
--   The trade ledger is append-only and stores the price AS USED, with the
--   timestamp that price was quoted. Portfolio history is replayed from what
--   happened, never recalculated from today's prices.
--
-- Writes happen server-side with the service role, as everywhere else in this
-- project. RLS is on with no permissive policy, so nothing is readable through
-- the public API.

create extension if not exists pgcrypto;

-- ---------- classes ----------
create table if not exists public.sim_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  join_code text not null unique,
  starting_cash numeric(14,2) not null default 25000 check (starting_cash > 0),
  -- hidden | top | full. Enforced when the data is fetched, never by hiding it
  -- in the page: a ranking the server sends is a ranking a student can read.
  leaderboard_mode text not null default 'hidden'
    check (leaderboard_mode in ('hidden', 'top', 'full')),
  trading_open boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists sim_classes_teacher_idx on public.sim_classes (teacher_id);

-- ---------- students (no email, by design) ----------
create table if not exists public.sim_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.sim_classes(id) on delete cascade,
  display_name text not null,
  passcode_salt text not null,
  passcode_hash text not null,
  -- The fictional household profile. Nothing here is real, and the interface
  -- says so where the student fills it in.
  province text,
  household_income numeric(12,2),
  goal text,
  horizon_years integer,
  account_type text check (account_type in ('TFSA', 'RRSP', 'FHSA', 'Non-registered')),
  created_at timestamptz not null default now(),
  unique (class_id, display_name)
);
create index if not exists sim_students_class_idx on public.sim_students (class_id);

-- ---------- instruments ----------
create table if not exists public.sim_instruments (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique,
  name text not null,
  kind text not null check (kind in ('stock', 'etf', 'bond')),
  -- The educational card, shown before a student may buy. The point is not to
  -- display a ticker symbol.
  what_it_is text not null,
  how_you_earn text not null,
  key_risks text not null,
  income_type text not null,
  fits text not null,
  sort_order integer not null default 100
);

-- ---------- daily prices ----------
-- One close per instrument per day. End-of-day pricing is the whole design:
-- it is cheaper, simpler, and it stops the simulation rewarding the
-- minute-by-minute trading the book argues against.
create table if not exists public.sim_prices (
  instrument_id uuid not null references public.sim_instruments(id) on delete cascade,
  as_of date not null,
  close numeric(12,4) not null check (close > 0),
  source text not null default 'seeded',
  primary key (instrument_id, as_of)
);

-- ---------- the ledger ----------
create table if not exists public.sim_trades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.sim_students(id) on delete cascade,
  instrument_id uuid not null references public.sim_instruments(id),
  side text not null check (side in ('buy', 'sell')),
  quantity numeric(14,4) not null check (quantity > 0),
  -- The price as used, and where it came from. Never recomputed.
  price_used numeric(12,4) not null check (price_used > 0),
  price_as_of date not null,
  price_delay text not null default 'end_of_day',
  price_source text not null default 'seeded',
  -- Why. Travels with the trade, because a reason recorded separately is a
  -- reason that goes missing, and the decision score cannot be computed without it.
  reason_code text not null,
  reason_text text,
  recorded_at timestamptz not null default now()
);
create index if not exists sim_trades_student_idx on public.sim_trades (student_id, recorded_at);

-- A trade is written once. A correction is an offsetting trade, never an edit:
-- a ledger that can be rewritten cannot be used to mark anybody.
create or replace function public.sim_trades_are_final()
returns trigger language plpgsql as $$
begin
  raise exception 'sim_trades is append-only. Correct with an offsetting trade, never an update or delete.';
end $$;

drop trigger if exists sim_trades_no_rewrite on public.sim_trades;
create trigger sim_trades_no_rewrite
  before update or delete on public.sim_trades
  for each row execute function public.sim_trades_are_final();

-- ---------- row level security ----------
-- Every read and write goes through the server with the service role, which
-- scopes by the signed-in teacher or the student's session cookie. No
-- permissive policy exists here, so the public API returns nothing.
alter table public.sim_classes enable row level security;
alter table public.sim_students enable row level security;
alter table public.sim_instruments enable row level security;
alter table public.sim_prices enable row level security;
alter table public.sim_trades enable row level security;

-- ---------- seed: five instruments ----------
-- A deliberate spread: two dividend-paying shares, a growth share, a broad
-- index ETF and a bond ETF, so diversification and income are visible choices
-- rather than theory.
insert into public.sim_instruments (symbol, name, kind, what_it_is, how_you_earn, key_risks, income_type, fits, sort_order)
values
  ('ENB.TO', 'Enbridge Inc.', 'stock',
   'A share in a Canadian energy infrastructure company that moves oil and natural gas through pipelines.',
   'A share of the profits paid out as dividends, and any rise in the share price.',
   'Energy demand, regulation, pipeline approvals, and interest rates, which affect how attractive the dividend looks.',
   'Eligible Canadian dividends, and capital gains when sold.',
   'Often held for income. One company in one industry, so rarely a whole plan on its own.', 10),
  ('RY.TO', 'Royal Bank of Canada', 'stock',
   'A share in Canada''s largest bank by market value.',
   'Dividends paid from profits, and any rise in the share price.',
   'The health of the economy, loan losses in a downturn, and competition.',
   'Eligible Canadian dividends, and capital gains when sold.',
   'Often held for income and long-term growth. Still a single company.', 20),
  ('SHOP.TO', 'Shopify Inc.', 'stock',
   'A share in a Canadian company whose software lets businesses sell online.',
   'Almost entirely through a rise in the share price. It pays no dividend.',
   'Price swings far larger than the market average, and a valuation that assumes rapid growth continues.',
   'Capital gains only. No dividend income.',
   'Suits a long horizon and a tolerance for large falls along the way.', 30),
  ('XIC.TO', 'iShares Core S&P/TSX Capped Composite Index ETF', 'etf',
   'One fund holding a slice of most public Canadian companies at once.',
   'Dividends passed through from the companies it holds, and any rise in the fund price.',
   'The Canadian market as a whole can fall. Heavily weighted to financials and energy, so it is less diversified than it first appears.',
   'Distributions, largely eligible Canadian dividends, and capital gains when sold.',
   'A common single holding for broad exposure, for someone who does not want to pick companies.', 40),
  ('XBB.TO', 'iShares Core Canadian Universe Bond Index ETF', 'etf',
   'One fund holding a wide range of Canadian government and corporate bonds.',
   'Interest passed through as distributions, plus price movement as interest rates change.',
   'When interest rates rise, existing bonds fall in price. Lower expected return than shares over long periods.',
   'Interest income, which is taxed in full outside a registered account.',
   'Usually held to steady a portfolio, or when the money is needed sooner.', 50)
on conflict (symbol) do nothing;

-- ---------- seed: sixty business days of prices ----------
-- Deliberately generated, not real market data: this slice has to run before
-- the TMX licensing question is settled. Each series is a deterministic walk
-- from a plausible starting price, so every environment gets the same numbers
-- and a class can be marked reproducibly. Replacing this with a vendor feed
-- means writing to the same table and changing `source`.
insert into public.sim_prices (instrument_id, as_of, close, source)
select
  i.id,
  d::date,
  round((
    i.base * (
      1
      + 0.10 * sin((row_number() over (partition by i.id order by d)) / 9.0 + i.phase)
      + 0.04 * sin((row_number() over (partition by i.id order by d)) / 2.7 + i.phase * 2)
      + 0.0009 * (row_number() over (partition by i.id order by d)) * i.drift
    )
  )::numeric, 4),
  'seeded'
from (
  select id, symbol,
    case symbol when 'ENB.TO' then 63.00 when 'RY.TO' then 178.00 when 'SHOP.TO' then 142.00
                when 'XIC.TO' then 42.00 else 29.00 end as base,
    case symbol when 'ENB.TO' then 0.0 when 'RY.TO' then 1.3 when 'SHOP.TO' then 2.6
                when 'XIC.TO' then 3.9 else 5.2 end as phase,
    -- Shares drift up over the period, the bond fund drifts gently down, so a
    -- student who holds only bonds has something real to ask about.
    case symbol when 'SHOP.TO' then 2.4 when 'XBB.TO' then -0.6 else 1.0 end as drift
  from public.sim_instruments
) i
cross join generate_series(current_date - interval '89 days', current_date, interval '1 day') d
where extract(isodow from d) < 6          -- weekdays only; markets close at the weekend
on conflict (instrument_id, as_of) do nothing;
