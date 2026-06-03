// ─── Manual-combat module barrel (§26) ─────────────────────────────────────────
// The public surface of the NEW, additive manual-combat engine. Nothing here is
// imported by battleStepEngine.js or the resolveBattle path — the two engines are
// fully independent (Constraint #3).

export { createBattleState, livingOnSide, battleOver, enemiesOf, alliesOf } from './state.js';
export { runBattle } from './engine.js';
export { createAIDriver, createHumanDriver } from './drivers.js';
export { getSkill, legalSkills, SKILLS } from './skills/index.js';
export { COMBAT_CREATURES, COMBAT_ROSTER, makeUnitDef } from './roster.js';
export * as dials from './dials.js';

import { createBattleState } from './state.js';
import { runBattle } from './engine.js';
import { createAIDriver } from './drivers.js';

// Convenience: a fully deterministic AI-vs-AI fight at a fixed seed (§26.4 golden).
// Both sides driven by the same AI brain → every await resolves instantly → the
// transcript is reproducible byte-for-byte.
export async function simulateAIvsAI(squadA, squadB, seed) {
  const state = createBattleState(squadA, squadB, seed);
  const drivers = { A: createAIDriver(), B: createAIDriver() };
  return runBattle(state, drivers);
}
