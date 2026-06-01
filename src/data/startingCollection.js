import { CREATURES } from './creatures.js';
import { DEFAULT_RING, buildSlots, ringScaledStats, ringStatBudget } from './rings.js';

const c = (id) => CREATURES.find((u) => u.id === id);

function inst(creature, instanceId, originRing = DEFAULT_RING) {
  return {
    instanceId,
    ...creature,
    // §22.7 stats scaled to the origin ring (Reaches = 1.0 baseline; Deep/Drop
    // bigger). Overrides the species base after the spread.
    ...ringScaledStats(creature, originRing),
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
    statBudget: ringStatBudget(creature, originRing),
    slots: buildSlots(originRing, 1),
  };
}

// 14 units, includes duplicates for feeding. link/claw/cinder are RECRUITABLE
// (vC-N) — they start LOCKED, discovered via contracts then recruited with
// Shards, so they are intentionally absent from the starting stable.
//
// §22.7 the mentor's gift: ONE instance each of Stoneback (vault), Buzzline
// (conduit) and Quicktalon (striker) is Drop-tier — the endgame chassis (most
// slots, resonance-gated upper slots that bloom when the trio is fielded
// together). Their duplicate copies stay default-ring feeders, so you can level
// the gift cores by feeding the spares. (Drop's upper slots need L7/L10; the XP
// curve currently caps at L5 — §22.10 dial — so they partial-bloom for now.)
export function buildStartingCollection() {
  return [
    inst(c('vault'),    'u01', 'Drop'),   // ◆ gift — Stoneback
    inst(c('vault'),    'u02'),
    inst(c('bastion'),  'u03'),
    inst(c('bastion'),  'u04'),
    inst(c('bulwark'),  'u05'),
    inst(c('conduit'),  'u06', 'Drop'),   // ◆ gift — Buzzline
    inst(c('conduit'),  'u07'),
    inst(c('nexus'),    'u08'),
    inst(c('fang'),     'u10'),
    inst(c('fang'),     'u11'),
    inst(c('striker'),  'u12', 'Drop'),   // ◆ gift — Quicktalon
    inst(c('spark'),    'u14'),
    inst(c('spark'),    'u15'),
    inst(c('flicker'),  'u16'),
  ];
}
