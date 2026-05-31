// Phase 17 — stamp a difficulty level onto enemy squads / wild spawns.
// Base CREATURES carry no `level`; the engine treats missing level as 1.
// These helpers attach the intended level so applyLevel() scales them at battle build.

export function levelEnemySquad(squad, level = 1) {
  return squad.map((c) => ({ ...c, level }));
}

// Roll a spawn level from a zone's [min, max] range (inclusive). Defaults to 1.
export function rollSpawnLevel(zone) {
  const range = zone?.spawnLevel;
  if (!Array.isArray(range)) return 1;
  const [min, max] = range;
  return min + Math.floor(Math.random() * (max - min + 1));
}
