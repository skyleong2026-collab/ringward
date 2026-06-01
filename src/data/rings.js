// §22 Economy & Progression — the origin-ring layer.
//
// A core's origin ring is stamped at incubation and carried forever. It sets two
// FIXED budgets: a stat budget (the pool a reroll REDISTRIBUTES — it never grows,
// the anti-treadmill keystone) and a slot count. Deeper rings = bigger budget +
// more slots + higher level cap (§22.3).
//
// ⚠ All NUMBERS below are §22.10 STRAWMAN tuning dials (playtest, not architecture).
// The ARCHITECTURE is locked: fixed budget, level+resonance slot gating, deeper =
// bigger. The level caps, slot counts, and resonance thresholds are Sky's call to
// tune. Slot gates for the Drop ring are verbatim from the GDD §22.6 table.

export const RINGS = {
  Rim:     { id: 'Rim',     order: 0, name: 'The Rim',     levelCap: 3,  slotCount: 2 },
  Reaches: { id: 'Reaches', order: 1, name: 'The Reaches', levelCap: 5,  slotCount: 3 },
  Deep:    { id: 'Deep',    order: 2, name: 'The Deep',    levelCap: 7,  slotCount: 4 },
  Drop:    { id: 'Drop',    order: 3, name: 'The Drop',    levelCap: 10, slotCount: 6 },
};

// Strawman default for pre-§22 cores: Reaches has levelCap 5, which preserves the
// existing level-5 cap exactly so laying down the schema changes no live behaviour.
// (Per-species / starter-trio ring assignment — §22.7 wants the trio Drop-tier —
// is deferred content, flagged as a §22.10 dial.)
export const DEFAULT_RING = 'Reaches';

// Per-ring slot gates, indexed by slot position (0-based). Each gate =
// { needLevel, needResonance }. needResonance > 0 marks a DEEP slot: earned by
// level but DORMANT until squad resonance R crosses the threshold (§22.5/22.6).
// Shallow rings (Rim/Reaches) carry resonance 0 throughout — level is their sole
// gate. The Drop row reproduces GDD §22.6 exactly.
export const RING_SLOT_GATES = {
  Rim: [
    { needLevel: 1, needResonance: 0 },
    { needLevel: 2, needResonance: 0 },
  ],
  Reaches: [
    { needLevel: 1, needResonance: 0 },
    { needLevel: 2, needResonance: 0 },
    { needLevel: 4, needResonance: 0 },
  ],
  Deep: [
    { needLevel: 1, needResonance: 0 },
    { needLevel: 2, needResonance: 0 },
    { needLevel: 4, needResonance: 6 },
    { needLevel: 6, needResonance: 10 },
  ],
  Drop: [
    { needLevel: 1,  needResonance: 0 },
    { needLevel: 1,  needResonance: 0 },
    { needLevel: 3,  needResonance: 6 },
    { needLevel: 5,  needResonance: 10 },
    { needLevel: 7,  needResonance: 14 },
    { needLevel: 10, needResonance: 18 },
  ],
};

// Slag cost FLOOR to reroll (re-incubate) a core, per origin ring. Pay-full-or-
// don't; rises with tier (§22.3 strawman anchors: Rim ~5 → Drop ~80+). Reroll
// count is UNLIMITED — the slag cost is the only gate. §22.10 tuning dial.
export const REROLL_COST = { Rim: 5, Reaches: 20, Deep: 45, Drop: 80 };

export function rerollCost(ring) {
  return REROLL_COST[ring] ?? REROLL_COST[DEFAULT_RING];
}

// §22.8 Dungeon faucet — Dungeon "uniquely produces concentrated slag". Each
// cleared node pays slag (boss nodes pay more); slag is awarded as nodes are
// won, so a run that ends early still keeps what it earned. §22.10 strawman.
export const DUNGEON_SLAG = { node: 8, boss: 25 };

export function dungeonSlag(isBoss) {
  return isBoss ? DUNGEON_SLAG.boss : DUNGEON_SLAG.node;
}

export function ringDef(ring) {
  return RINGS[ring] ?? RINGS[DEFAULT_RING];
}

// Slot states (§22.5):
//   'locked'  — own level too low (permanent progress; opens by levelling)
//   'open'    — usable; socket a gear or module
//   'dormant' — DEEP slots only: earned by level, unpowered this battle because
//               squad resonance is too low (greys out until deeper company fielded)
export function slotState(gate, level, resonance) {
  if (level < gate.needLevel) return 'locked';
  if (resonance < gate.needResonance) return 'dormant';
  return 'open';
}

// Build a core's slots[] for a given ring + own level + squad resonance.
// `prevSlots` preserves any already-socketed gear/module ids across recompute
// (slot socketing arrives in later slices; today sockets stay null).
export function buildSlots(ring, level = 1, resonance = 0, prevSlots = null) {
  const gates = RING_SLOT_GATES[ring] ?? RING_SLOT_GATES[DEFAULT_RING];
  return gates.map((gate, index) => ({
    index,
    needLevel: gate.needLevel,
    needResonance: gate.needResonance,
    state: slotState(gate, level, resonance),
    socket: prevSlots?.[index]?.socket ?? null,
  }));
}

// Resonance R for a core = the sum of its SQUADMATES' current levels (everyone
// fielded except itself). With MAX_SQUAD = 3 that's at most two others, matching
// GDD §22.6 ("sum of the two squadmates' current levels"). A solo core has R = 0.
export function squadResonance(squad, instanceId) {
  return (squad ?? [])
    .filter((u) => u.instanceId !== instanceId)
    .reduce((sum, u) => sum + (u.level ?? 1), 0);
}

// Re-resolve a core's slots for the squad it's fielded in: own level gates
// locked→open, squad resonance powers deep slots open vs leaving them dormant.
// Squad-relative, so this is a derived pre-battle view — never persisted.
export function resolveSlots(unit, resonance) {
  return buildSlots(unit.originRing, unit.level ?? 1, resonance, unit.slots);
}

// The FIXED stat budget a reroll redistributes = the core's base stat total
// (HP + Attack + Armor + Speed). Per-ring budget normalization is a §22.10 dial;
// for now the budget is simply the total the species already ships with, so
// existing balance is preserved and current stats are themselves a valid roll.
export function statBudgetOf(creature) {
  return (
    (creature?.hp ?? 0) +
    (creature?.attack ?? 0) +
    (creature?.armor ?? 0) +
    (creature?.speed ?? 0)
  );
}
