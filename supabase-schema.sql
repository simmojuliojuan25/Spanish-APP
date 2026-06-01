-- Run this in the Supabase SQL editor to set up the database

create table if not exists vocabulary (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  translation text not null,
  example_sentence text,
  notes text,
  tags text[] default '{}',
  is_weekly_focus boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists srs_cards (
  id uuid primary key default gen_random_uuid(),
  vocabulary_id uuid not null references vocabulary(id) on delete cascade,
  ease_factor float not null default 2.5,
  interval_days int not null default 1,
  repetitions int not null default 0,
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Index for efficient "due for review" queries
create index if not exists srs_cards_next_review_idx on srs_cards(next_review_at);

-- Allow anonymous reads and writes (the app handles auth via PIN + cookie)
alter table vocabulary enable row level security;
alter table srs_cards enable row level security;

-- RLS policies: allow all operations for all roles
create policy "Allow all" on vocabulary for all using (true) with check (true);
create policy "Allow all" on srs_cards for all using (true) with check (true);

-- Table-level grants: PostgreSQL requires a GRANT *and* a passing RLS policy.
-- Without this, the anon role gets "permission denied" even with an allow-all policy.
grant select, insert, update, delete on table vocabulary to anon;
grant select, insert, update, delete on table srs_cards to anon;
