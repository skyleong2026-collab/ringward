-- ════════════════════════════════════════════════════════════════════════════
-- 8gents · Test 5 — async-PvP MVP schema (SCAFFOLD — not yet applied)
-- ════════════════════════════════════════════════════════════════════════════
-- Async PvP: a player submits a "defense" squad to a shared pool; other players
-- pull an opponent's squad and fight it locally (the §19 engine is deterministic,
-- so a match is fully reproducible from squadA + squadB + seed — we store the
-- inputs, not a frame log). Win/loss adjusts a rating. No realtime needed.
--
-- ⚠️  Apply this to a DEDICATED 8gents Supabase project, NOT the existing project
--     (which hosts an unrelated app with profiles/payments). See PVP scaffolding
--     notes. Run via: supabase db push  (or the apply_migration MCP tool).

-- ── Submitted defense squads ────────────────────────────────────────────────
create table if not exists public.pvp_squads (
  id          uuid primary key default gen_random_uuid(),
  player_id   text not null,                 -- anonymous client id for the MVP
  player_name text not null default 'Anon',
  squad       jsonb not null,                -- serialized squad: [{id, name, archetype, level, gearId, moduleIds, signature}]
  rating      integer not null default 1000, -- ELO-ish; updated on each match
  wins        integer not null default 0,
  losses      integer not null default 0,
  active      boolean not null default true, -- only one active defense per player
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists pvp_squads_rating_idx on public.pvp_squads (rating) where active;
create index if not exists pvp_squads_player_idx on public.pvp_squads (player_id);

-- ── Match log (reproducible from inputs) ────────────────────────────────────
create table if not exists public.pvp_matches (
  id            uuid primary key default gen_random_uuid(),
  attacker_id   text not null,
  defender_squad uuid references public.pvp_squads (id) on delete set null,
  seed          text not null,               -- the engine seed → deterministic replay
  winner        text not null check (winner in ('A','B')),
  rounds        integer not null,
  rating_delta  integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists pvp_matches_attacker_idx on public.pvp_matches (attacker_id);

-- ── RLS: open read, self-scoped writes (MVP; tighten with real auth later) ──
alter table public.pvp_squads   enable row level security;
alter table public.pvp_matches  enable row level security;

-- Anyone may read the squad pool + leaderboard.
create policy "pvp_squads read"  on public.pvp_squads  for select using (true);
create policy "pvp_matches read" on public.pvp_matches for select using (true);

-- MVP write policy: anonymous inserts allowed (no auth yet). REPLACE with an
-- auth.uid() = player_id check once real auth lands — anonymous writes are a
-- known MVP compromise, acceptable only for a closed playtest pool.
create policy "pvp_squads insert" on public.pvp_squads  for insert with check (true);
create policy "pvp_squads update" on public.pvp_squads  for update using (true);
create policy "pvp_matches insert" on public.pvp_matches for insert with check (true);
