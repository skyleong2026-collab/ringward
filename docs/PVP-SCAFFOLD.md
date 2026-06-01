# Test 5 — Async-PvP MVP (scaffold)

Status: **scaffold only.** Schema + client are written; nothing is applied to a
live database and no UI is wired yet.

## Why async (not realtime)

The §19 battle engine is **deterministic**: `resolveBattle(squadA, squadB, seed)`
always produces the same result. So a "match" is fully reproducible from its
inputs — we store `(attacker, defenderSquad, seed)` and replay locally. No
realtime sockets, no server-side simulation. A player fights a *snapshot* of
another player's submitted squad, on their own machine, whenever they like.

## Pieces in this scaffold

| File | What it is |
|------|------------|
| `supabase/migrations/20260531_pvp.sql` | `pvp_squads` (defense pool + rating) and `pvp_matches` (reproducible match log) + MVP RLS. **Not applied.** |
| `src/engine/pvp.js` | Dependency-free Supabase REST client: `submitDefense`, `fetchOpponent`, `recordMatch` (ELO K=32), `fetchLeaderboard`. No-ops gracefully when unconfigured. |

## ⚠️ Before this can run

1. **Use a dedicated 8gents Supabase project.** The currently-connected project
   hosts an unrelated app (`profiles`, `payments`, `assessments`). Do **not** add
   game tables there. Spin up a fresh project (or schema) for 8gents.
2. Apply the migration to that project (`supabase db push` or the apply_migration
   MCP tool once it points at the right project).
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local`.

## Still to build (next session)

- **PvP screen**: "Submit Defense" (serialize current squad → `submitDefense`),
  "Find Match" (`fetchOpponent` near your rating → run BattleScreen vs that squad
  → `recordMatch`), and a leaderboard (`fetchLeaderboard`).
- **App nav** entry + rating display on the roster.
- **Auth**: replace the anonymous `pvpClientId()` + open RLS with real auth
  (`auth.uid() = player_id`). The open insert/update policies are a closed-beta
  compromise only.
- **Abuse/sanity**: validate submitted squads server-side (legal levels/units)
  before trusting them as opponents.
