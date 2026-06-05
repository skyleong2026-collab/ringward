// @8gents/engine — Pure game logic, zero React dependencies
// Exports: battle simulation, progression, RNG, GPS, NPC generation

export { battle } from './battle.js';
export { battleStepEngine } from './battleStepEngine.js';
export { getLevel, MAX_LEVEL, XP_PER_FEED, xpProgress, getAuraStyle, computeVisualProfile } from './progression.js';
export { createRng, randomSeed } from './rng.js';
export {
  getNearbySpawns,
  offsetPosition,
  formatDistance,
  ENCOUNTER_RADIUS,
  SPAWN_RADIUS,
  RARITIES,
  getDistance,
  getBearing,
  bearingToArrow,
  getCellKey,
  cellToSpawn,
} from './gps.js';
export { generateSpotterRead } from './spotter.js';
