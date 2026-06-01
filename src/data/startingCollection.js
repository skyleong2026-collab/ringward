import { CREATURES } from './creatures.js';
import { DEFAULT_RING, buildSlots, statBudgetOf } from './rings.js';

const c = (id) => CREATURES.find((u) => u.id === id);

function inst(creature, instanceId) {
  const originRing = DEFAULT_RING; // §22.7 trio→Drop assignment is deferred content (§22.10 dial)
  return {
    instanceId,
    ...creature,
    xp: 0,
    level: 1,
    feedCount: 0,
    feedHistory: [],
    survivalCount: 0,
    revivals: 0,
    battleCount: 0,
    winCount: 0,
    survivalStreak: 0,
    enemyMemory: [],
    foundAt: null,
    gearId: null,
    moduleIds: [],
    // §22 origin-ring layer — fixed stat budget a reroll redistributes + slots
    // gated by level/resonance. Engine never reads these (golden-safe).
    originRing,
    statBudget: statBudgetOf(creature),
    slots: buildSlots(originRing, 1),
  };
}

// 14 units, includes duplicates for feeding. link/claw/cinder are RECRUITABLE
// (vC-N) — they start LOCKED, discovered via contracts then recruited with
// Shards, so they are intentionally absent from the starting stable.
export function buildStartingCollection() {
  return [
    inst(c('vault'),    'u01'),
    inst(c('vault'),    'u02'),
    inst(c('bastion'),  'u03'),
    inst(c('bastion'),  'u04'),
    inst(c('bulwark'),  'u05'),
    inst(c('conduit'),  'u06'),
    inst(c('conduit'),  'u07'),
    inst(c('nexus'),    'u08'),
    inst(c('fang'),     'u10'),
    inst(c('fang'),     'u11'),
    inst(c('striker'),  'u12'),
    inst(c('spark'),    'u14'),
    inst(c('spark'),    'u15'),
    inst(c('flicker'),  'u16'),
  ];
}
