-- Money Is a Tool — access schema.
-- Run once in the Supabase SQL editor (or `supabase db push`).
-- All writes happen server-side with the service role; row-level security
-- below only governs what a signed-in user may READ about themselves.

create extension if not exists pgcrypto;

-- ---------- profiles (one per auth user) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_email_idx on public.profiles (lower(email));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email on auth.users
  for each row execute function public.handle_new_user();

-- ---------- individual purchases (Stripe) ----------
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid references auth.users(id) on delete set null,
  product text not null default 'individual',
  stripe_checkout_session_id text unique,
  stripe_payment_intent text,
  amount_total integer,
  currency text,
  created_at timestamptz not null default now()
);
create index if not exists purchases_email_idx on public.purchases (lower(email));

-- ---------- school licences ----------
create table if not exists public.licences (
  id uuid primary key default gen_random_uuid(),
  school_name text not null,
  admin_email text not null,
  seats integer not null check (seats > 0),
  invite_code text not null unique,
  status text not null default 'active' check (status in ('active', 'suspended')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,            -- null = perpetual
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists licences_admin_email_idx on public.licences (lower(admin_email));

create table if not exists public.licence_members (
  licence_id uuid not null references public.licences(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'teacher' check (role in ('admin', 'teacher')),
  joined_at timestamptz not null default now(),
  primary key (licence_id, user_id)
);

-- ---------- downloadable resources ----------
-- Files live in the PRIVATE storage bucket "resources"; storage_path is the
-- object key inside it. audience: 'book' (individual + school) or 'teacher'
-- (school only).
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  audience text not null check (audience in ('book', 'teacher')),
  storage_path text not null,
  file_name text not null,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  resource_id uuid references public.resources(id) on delete set null,
  ip text,
  created_at timestamptz not null default now()
);

-- ---------- school licence requests (contact form) ----------
create table if not exists public.licence_requests (
  id uuid primary key default gen_random_uuid(),
  school_name text not null,
  contact_name text not null,
  email text not null,
  seats integer,
  message text,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- row-level security ----------
alter table public.profiles enable row level security;
alter table public.purchases enable row level security;
alter table public.licences enable row level security;
alter table public.licence_members enable row level security;
alter table public.resources enable row level security;
alter table public.downloads enable row level security;
alter table public.licence_requests enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "purchases: read own" on public.purchases;
create policy "purchases: read own" on public.purchases
  for select using (auth.uid() = user_id or lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "members: read own" on public.licence_members;
create policy "members: read own" on public.licence_members
  for select using (auth.uid() = user_id);

drop policy if exists "licences: read if member" on public.licences;
create policy "licences: read if member" on public.licences
  for select using (exists (
    select 1 from public.licence_members m where m.licence_id = id and m.user_id = auth.uid()
  ));

drop policy if exists "resources: read metadata" on public.resources;
create policy "resources: read metadata" on public.resources
  for select to authenticated using (true);

-- downloads and licence_requests: service role only (no policies).

-- ---------- private storage bucket ----------
insert into storage.buckets (id, name, public)
values ('resources', 'resources', false)
on conflict (id) do nothing;
