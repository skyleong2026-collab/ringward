// ─── Async PvP client (Test 5 — SCAFFOLD) ────────────────────────────────────
// Dependency-free Supabase REST (PostgREST) client. Submits a defense squad,
// pulls a rating-matched opponent, runs the fight LOCALLY (the §19 engine is
// deterministic), and reports the result with an ELO update. No realtime, no
// @supabase/supabase-js dependency — just fetch + the project's anon key.
//
// Config (a dedicated 8gents Supabase project — NOT the shared one):
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY  (in .env.local)
// When unset, every call no-ops gracefully so the rest of the app is unaffected.

const URL = import.meta.env?.VITE_SUPABASE_URL ?? '';
const ANON = import.meta.env?.VITE_SUPABASE_ANON_KEY ?? '';

export function isPvpConfigured() {
  return Boolean(URL && ANON);
}

// Stable anonymous client id for the MVP (no auth yet).
export function pvpClientId() {
  let id = localStorage.getItem('8gents_pvp_id');
  if (!id) { id = `p_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`; localStorage.setItem('8gents_pvp_id', id); }
  return id;
}

async function rest(path, { method = 'GET', body, prefer } = {}) {
  if (!isPvpConfigured()) return null;
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`PvP ${method} ${path} → ${res.status}`);
  return res.status === 204 ? null : res.json();
}

// Squad → the minimal serialized shape stored in pvp_squads.squad.
export function serializeSquad(units) {
  return units.map((u) => ({
    id: u.id, name: u.name, archetype: u.archetype,
    level: u.level ?? 1, gearId: u.gearId ?? null, moduleIds: u.moduleIds ?? [],
  }));
}

// Submit (or replace) this player's active defense squad.
export async function submitDefense(units, playerName = 'Anon') {
  const player_id = pvpClientId();
  // Deactivate any prior defense, then insert the new one.
  await rest(`pvp_squads?player_id=eq.${player_id}&active=eq.true`, {
    method: 'PATCH', body: { active: false }, prefer: 'return=minimal',
  });
  const rows = await rest('pvp_squads', {
    method: 'POST', prefer: 'return=representation',
    body: { player_id, player_name: playerName, squad: serializeSquad(units), active: true },
  });
  return rows?.[0] ?? null;
}

// Pull one opponent defense near `rating`, excluding the player's own squads.
export async function fetchOpponent(rating = 1000) {
  const me = pvpClientId();
  const rows = await rest(
    `pvp_squads?active=eq.true&player_id=neq.${me}&order=rating.asc&limit=20`,
  );
  if (!rows || rows.length === 0) return null;
  // Closest by rating (MVP matchmaking).
  return rows.reduce((best, r) =>
    Math.abs(r.rating - rating) < Math.abs(best.rating - rating) ? r : best);
}

// Standard ELO delta (K=32).
export function eloDelta(myRating, oppRating, won) {
  const expected = 1 / (1 + 10 ** ((oppRating - myRating) / 400));
  return Math.round(32 * ((won ? 1 : 0) - expected));
}

// Record a finished match: log it + bump both ratings.
export async function recordMatch({ defenderSquadRow, seed, winner, rounds, myRating }) {
  const attacker_id = pvpClientId();
  const won = winner === 'A';
  const delta = eloDelta(myRating, defenderSquadRow?.rating ?? 1000, won);
  await rest('pvp_matches', {
    method: 'POST', prefer: 'return=minimal',
    body: { attacker_id, defender_squad: defenderSquadRow?.id ?? null, seed: String(seed), winner, rounds, rating_delta: delta },
  });
  // Bump the defender's record (loser of an attacker win, etc.).
  if (defenderSquadRow?.id) {
    await rest(`pvp_squads?id=eq.${defenderSquadRow.id}`, {
      method: 'PATCH', prefer: 'return=minimal',
      body: {
        rating: (defenderSquadRow.rating ?? 1000) - delta,
        wins: (defenderSquadRow.wins ?? 0) + (won ? 0 : 1),
        losses: (defenderSquadRow.losses ?? 0) + (won ? 1 : 0),
        updated_at: new Date().toISOString(),
      },
    });
  }
  return delta;
}

export async function fetchLeaderboard(limit = 10) {
  return (await rest(`pvp_squads?active=eq.true&order=rating.desc&limit=${limit}`)) ?? [];
}
