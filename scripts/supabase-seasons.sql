-- Execute uma vez no SQL Editor do Supabase antes do deploy de Temporadas.
alter table public.cob_users
  add column if not exists country text;

create table if not exists public.cob_ranked_seasons (
  id text primary key,
  username text not null references public.cob_users(username) on delete cascade,
  season_number integer not null,
  division text not null,
  status text not null,
  updated_at timestamptz not null default now(),
  state jsonb not null
);

create index if not exists cob_ranked_seasons_user_number_idx
  on public.cob_ranked_seasons(username, season_number desc);
create index if not exists cob_ranked_seasons_status_updated_idx
  on public.cob_ranked_seasons(status, updated_at desc);

create table if not exists public.cob_ranked_matches (
  id text primary key,
  idempotency_key text not null,
  username text not null references public.cob_users(username) on delete cascade,
  ranked_season_id text not null references public.cob_ranked_seasons(id) on delete cascade,
  match_number integer not null,
  completed_at timestamptz not null default now(),
  state jsonb not null,
  unique(username, idempotency_key),
  unique(ranked_season_id, match_number)
);

create index if not exists cob_ranked_matches_user_completed_idx
  on public.cob_ranked_matches(username, completed_at desc);
create index if not exists cob_ranked_matches_season_idx
  on public.cob_ranked_matches(ranked_season_id);

create table if not exists public.cob_ranked_rewards (
  id text primary key,
  username text not null references public.cob_users(username) on delete cascade,
  reward_id text not null,
  unlocked_at timestamptz not null default now(),
  state jsonb not null,
  unique(username, reward_id)
);

create index if not exists cob_ranked_rewards_user_idx
  on public.cob_ranked_rewards(username, unlocked_at desc);

-- A service role usada somente no servidor acessa as tabelas.
alter table public.cob_ranked_seasons enable row level security;
alter table public.cob_ranked_matches enable row level security;
alter table public.cob_ranked_rewards enable row level security;
