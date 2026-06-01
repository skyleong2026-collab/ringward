// Phase 17 — stamp a difficulty level onto enemy squads / wild spawns.
// Base CREATURES carry no `level`; the engine treats missing level as 1.
// These helpers attach the intended level so applyLevel() scales them at battle build.

export function levelEnemySquad(squad, level = 1) {
  return squad.map((c) => ({ ...c, level }));
}

// The fielded squad's average level — the proxy for "how strong is the player
// right now" used to scale practice difficulty.
export function squadAverageLevel(squad = []) {
  if (!squad.length) return 1;
  return Math.round(squad.reduce((s, u) => s + (u.level ?? 1), 0) / squad.length);
}

// Scale a PRACTICE encounter's enemy level to the fielded squad, so the no-stakes
// sandbox stays a real test as the roster grows instead of being trivially
// out-levelled. Enemies RISE to meet the squad's average level (EDGE = 0 default —
// the harness (Test D) shows combat is binary on composition + squad size, so a
// level bump just flips wins to losses, it doesn't make fights "closer"; the honest
// goal is to stop brute out-levelling and let comp/counterplay decide). FLOORED at
// the encounter's designed level so early content is never made *easier*, and
// capped so it can't run away. EDGE/CAP are §22.10 dials. Practice only — Dungeon
// keeps its authored curve, contracts have their own difficulty system.
export const PRACTICE_ENEMY_EDGE = 0;
export const PRACTICE_ENEMY_CAP = 12;

export function scaledEnemyLevel(encounter, squad, edge = PRACTICE_ENEMY_EDGE) {
  const base = encounter?.level ?? 1;
  const scaled = squadAverageLevel(squad) + edge;
  return Math.max(base, Math.min(scaled, PRACTICE_ENEMY_CAP));
}

// Roll a spawn level from a zone's [min, max] range (inclusive). Defaults to 1.
export function rollSpawnLevel(zone) {
  const range = zone?.spawnLevel;
  if (!Array.isArray(range)) return 1;
  const [min, max] = range;
  return min + Math.floor(Math.random() * (max - min + 1));
}
