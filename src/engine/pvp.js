// ─── Async PvP client (Test 5) ───────────────────────────────────────────────
// Async because the §19 engine is deterministic: a match replays from
// (squads, seed), so you fight a SNAPSHOT of another player's submitted squad
// locally. No realtime.
//
// Two backends behind ONE API (submitDefense / fetchOpponent / recordMatch /
// fetchLeaderboard):
//   • LIVE  — Supabase REST (PostgREST), when VITE_SUPABASE_URL + ANON_KEY are set
//   • MOCK  — localStorage pool seeded with bot squads, when unconfigured
// The UI is identical either way; flip to live by adding keys for a DEDICATED
// 8gents Supabase project (see docs/PVP-SCAFFOLD.md).

const URL = import.meta.env?.VITE_SUPABASE_URL ?? '';
const ANON = import.meta.env?.VITE_SUPABASE_ANON_KEY ?? '';

export function isPvpConfigured() {
  return Boolean(URL && ANON);
}

export function pvpClientId() {
  let id = localStorage.getItem('8gents_pvp_id');
  if (!id) { id = `p_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`; localStorage.setItem('8gents_pvp_id', id); }
  return id;
}

export function serializeSquad(units) {
  return units.map((u) => ({
    id: u.id, name: u.name, archetype: u.archetype,
    level: u.level ?? 1, gearId: u.gearId ?? null, moduleIds: u.moduleIds ?? [],
  }));
}

// Standard ELO delta (K=32).
export function eloDelta(myRating, oppRating, won) {
  const expected = 1 / (1 + 10 ** ((oppRating - myRating) / 400));
  return Math.round(32 * ((won ? 1 : 0) - expected));
}

// ─── LIVE backend (Supabase REST) ─────────────────────────────────────────────
async function rest(path, { method = 'GET', body, prefer } = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: ANON, Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`PvP ${method} ${path} → ${res.status}`);
  return res.status === 204 ? null : res.json();
}

const live = {
  async submitDefense(units, playerName) {
    const player_id = pvpClientId();
    await rest(`pvp_squads?player_id=eq.${player_id}&active=eq.true`, { method: 'PATCH', body: { active: false }, prefer: 'return=minimal' });
    const rows = await rest('pvp_squads', { method: 'POST', prefer: 'return=representation', body: { player_id, player_name: playerName, squad: serializeSquad(units), active: true } });
    return rows?.[0] ?? null;
  },
  async myDefense() {
    const rows = await rest(`pvp_squads?player_id=eq.${pvpClientId()}&active=eq.true&limit=1`);
    return rows?.[0] ?? null;
  },
  async fetchOpponent(rating) {
    const me = pvpClientId();
    const rows = await rest(`pvp_squads?active=eq.true&player_id=neq.${me}&order=rating.asc&limit=20`);
    if (!rows?.length) return null;
    return rows.reduce((b, r) => Math.abs(r.rating - rating) < Math.abs(b.rating - rating) ? r : b);
  },
  async recordMatch({ defenderSquadRow, seed, winner, rounds, myRating }) {
    const won = winner === 'A';
    const delta = eloDelta(myRating, defenderSquadRow?.rating ?? 1000, won);
    await rest('pvp_matches', { method: 'POST', prefer: 'return=minimal', body: { attacker_id: pvpClientId(), defender_squad: defenderSquadRow?.id ?? null, seed: String(seed), winner, rounds, rating_delta: delta } });
    if (defenderSquadRow?.id) {
      await rest(`pvp_squads?id=eq.${defenderSquadRow.id}`, { method: 'PATCH', prefer: 'return=minimal', body: { rating: (defenderSquadRow.rating ?? 1000) - delta, wins: (defenderSquadRow.wins ?? 0) + (won ? 0 : 1), losses: (defenderSquadRow.losses ?? 0) + (won ? 1 : 0), updated_at: new Date().toISOString() } });
    }
    return delta;
  },
  fetchLeaderboard: async (limit) => (await rest(`pvp_squads?active=eq.true&order=rating.desc&limit=${limit}`)) ?? [],
};

// ─── MOCK backend (localStorage) ──────────────────────────────────────────────
// Seeded bot pool so the loop is fully playable offline. Bot squads use real
// creature ids spanning the RPS archetypes so counter-picking matters.
const MOCK_KEY = '8gents_pvp_mock';
function mockStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(MOCK_KEY) || 'null');
    if (raw?.pool) return raw;
  } catch { /* reseed */ }
  const seed = {
    me: { rating: 1000, wins: 0, losses: 0, defense: null },
    pool: [
      { id: 'bot-tank',  player_name: 'Wardens (TANK)',   rating: 1120, wins: 8, losses: 3, squad: [u('vault'), u('bastion'), u('bulwark')] },
      { id: 'bot-burst', player_name: 'Razorline (BURST)', rating: 1060, wins: 6, losses: 4, squad: [u('fang'), u('claw'), u('striker')] },
      { id: 'bot-ramp',  player_name: 'Slowburn (RAMP)',   rating: 980,  wins: 4, losses: 5, squad: [u('spark'), u('flicker'), u('cinder')] },
      { id: 'bot-gen',   player_name: 'Crucible (GEN)',    rating: 1180, wins: 11, losses: 2, squad: [u('bastion'), u('claw'), u('conduit')] },
      { id: 'bot-echo',  player_name: 'Chorus (ECHO)',     rating: 940,  wins: 3, losses: 6, squad: [u('conduit'), u('link'), u('vault')] },
    ],
  };
  localStorage.setItem(MOCK_KEY, JSON.stringify(seed));
  return seed;
}
function u(id) { return { id, level: 5, gearId: null, moduleIds: [] }; }
function saveMock(s) { localStorage.setItem(MOCK_KEY, JSON.stringify(s)); }

const mock = {
  async submitDefense(units) {
    const s = mockStore();
    s.me.defense = { id: 'me', player_name: 'You', rating: s.me.rating, wins: s.me.wins, losses: s.me.losses, squad: serializeSquad(units) };
    saveMock(s);
    return s.me.defense;
  },
  async myDefense() { return mockStore().me.defense; },
  async fetchOpponent(rating) {
    const s = mockStore();
    return s.pool.reduce((b, r) => Math.abs(r.rating - rating) < Math.abs(b.rating - rating) ? r : b);
  },
  async recordMatch({ defenderSquadRow, winner }) {
    const s = mockStore();
    const won = winner === 'A';
    const delta = eloDelta(s.me.rating, defenderSquadRow?.rating ?? 1000, won);
    s.me.rating += delta;
    if (won) s.me.wins++; else s.me.losses++;
    const opp = s.pool.find((p) => p.id === defenderSquadRow?.id);
    if (opp) { opp.rating -= delta; if (won) opp.losses++; else opp.wins++; }
    if (s.me.defense) { s.me.defense.rating = s.me.rating; s.me.defense.wins = s.me.wins; s.me.defense.losses = s.me.losses; }
    saveMock(s);
    return delta;
  },
  async fetchLeaderboard(limit) {
    const s = mockStore();
    const rows = [...s.pool, { id: 'me', player_name: 'You', rating: s.me.rating, wins: s.me.wins, losses: s.me.losses }];
    return rows.sort((a, b) => b.rating - a.rating).slice(0, limit);
  },
  myRating() { return mockStore().me.rating; },
};

// ─── Public API (routes to live or mock) ──────────────────────────────────────
const backend = () => (isPvpConfigured() ? live : mock);
export const pvpIsMock = () => !isPvpConfigured();
export const submitDefense   = (units, name = 'You') => backend().submitDefense(units, name);
export const myDefense       = () => backend().myDefense();
export const fetchOpponent   = (rating) => backend().fetchOpponent(rating);
export const recordMatch     = (args) => backend().recordMatch(args);
export const fetchLeaderboard = (limit = 10) => backend().fetchLeaderboard(limit);
export const myRating        = () => (isPvpConfigured() ? null : mock.myRating());
