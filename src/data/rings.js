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

// A core's level ceiling = its origin ring's cap (Rim 3 / Reaches 5 / Deep 7 /
// Drop 10). Passed into progression.getLevel so depth gates how high a core grows
// — and thus how many of its resonance-gated upper slots it can ever reach.
export function ringLevelCap(ring) {
  return ringDef(ring).levelCap;
}

// §22.7 zone depth → origin ring. Walk is the core faucet, and a core's origin is
// stamped by where it's caught: the deeper the zone, the deeper the ring (bigger
// budget, more slots, resonance-gated upper slots). Drop is RESERVED for the
// starter trio (the mentor's gift), so caught cores top out at Deep. Zones carry a
// 1-based `tier`; map it monotonically. Unknown/tier-less zones (GPS spawns,
// recruits) fall back to the default ring. §22.10 dial.
export const ZONE_TIER_RING = { 1: 'Rim', 2: 'Reaches', 3: 'Deep' };

export function ringForZoneTier(tier) {
  return ZONE_TIER_RING[tier] ?? DEFAULT_RING;
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

// ─── Socketing (§22.4) ────────────────────────────────────────────────────────
// Gear & modules live IN a core's slots. The engine reads ONE gearId plus a set of
// moduleIds, so a core carries at most one gear (a single behavioral verb) and
// fills its remaining slots with modules (dials). A socket = { type:'gear'|'module',
// id }. Slot capacity is the §22 ring gate — depth buys build space.
export const MAX_GEAR_PER_UNIT = 1;

// Can this slot hold a socket? Any EARNED slot can — including a 'dormant' one.
// Dormancy is a battle-time power state, not an equip lock: you kit a deep slot
// now, it just stays dark until squad resonance wakes it. Only 'locked' (own level
// too low) refuses a socket.
export function isSocketable(slot) {
  return !!slot && slot.state !== 'locked';
}

// Place `item` ({type,id} | null to clear) into slot `index`, returning a NEW
// slots array. Enforces the build's structural rules so the engine never sees an
// impossible loadout: one gear per core (a new gear evicts any other gear), and no
// duplicate module id across slots (a re-socketed module moves rather than dupes).
export function socketInto(slots, index, item) {
  return slots.map((s, i) => {
    if (i === index) return { ...s, socket: item ?? null };
    if (item && s.socket) {
      if (item.type === 'gear' && s.socket.type === 'gear') return { ...s, socket: null };
      if (item.type === 'module' && s.socket.type === 'module' && s.socket.id === item.id) return { ...s, socket: null };
    }
    return s;
  });
}

// Engine-input loadout for a core fielded at squad resonance R. Only POWERED
// ('open') slots contribute their socket; 'dormant' (resonance-starved) and
// 'locked' slots fall dark. This is the meta→engine translation that finally gives
// dormancy teeth — a Resonator sitting in a dormant slot grants nothing until the
// slot wakes. Returns the engine shape { gearId, moduleIds }.
export function activeLoadout(unit, resonance = 0) {
  const slots = resolveSlots(unit, resonance);
  let gearId = null;
  const moduleIds = [];
  for (const s of slots) {
    if (s.state !== 'open' || !s.socket) continue;
    if (s.socket.type === 'gear') { if (!gearId) gearId = s.socket.id; }
    else if (s.socket.type === 'module' && !moduleIds.includes(s.socket.id)) moduleIds.push(s.socket.id);
  }
  return { gearId, moduleIds };
}

// Map a fielded PLAYER squad to engine-ready units: each core's gearId/moduleIds
// are overridden by its POWERED sockets at the squad's current resonance. Units
// without §22 slots (a contract escortee, legacy data) pass through untouched so
// their own flat loadout survives. Enemy squads are never run through this — they
// carry their stored flat loadout.
export function battleLoadout(squad = []) {
  return (squad ?? []).map((u) => {
    if (!u || !u.slots) return u;
    return { ...u, ...activeLoadout(u, squadResonance(squad, u.instanceId)) };
  });
}

// The base stat total (HP + Attack + Armor + Speed) — the species' shipped sum.
export function statBudgetOf(creature) {
  return (
    (creature?.hp ?? 0) +
    (creature?.attack ?? 0) +
    (creature?.armor ?? 0) +
    (creature?.speed ?? 0)
  );
}

// §22.7 per-ring stat budget — "deeper origin ring = bigger stat budget". The ring
// scales a core's combat budget by this multiplier; Reaches = 1.0 is the baseline
// (everything was Reaches before origin rings, so existing balance is untouched),
// Rim is leaner, Deep/Drop are the bigger chassis (Drop = the endgame max). The
// budget is stamped at incubation and is FIXED — the Forge only redistributes it,
// never grows it (§22.9 anti-treadmill). §22.10 strawman dials — tune for balance.
export const RING_BUDGET_MULT = { Rim: 0.9, Reaches: 1.0, Deep: 1.2, Drop: 1.4 };

export function ringBudgetMult(ring) {
  return RING_BUDGET_MULT[ring] ?? RING_BUDGET_MULT[DEFAULT_RING];
}

// A core's combat stats scaled to its origin ring. SPEED is left UNSCALED — turn
// order is archetype identity (mirrors progression.js never scaling speed by
// level), so depth buys HP/Attack/Armor, not a faster clock. Returns the four
// stats; the ring budget is exactly their sum, so a fresh core is fully allocated
// (sum === statBudget) and is itself a valid roll.
export function ringScaledStats(creature, ring) {
  const m = ringBudgetMult(ring);
  return {
    hp:     Math.round((creature?.hp ?? 0) * m),
    attack: Math.round((creature?.attack ?? 0) * m),
    armor:  Math.round((creature?.armor ?? 0) * m),
    speed:  creature?.speed ?? 0,
  };
}

// The fixed budget for a core of this species at this ring = the sum of its
// ring-scaled stats (so sum === budget holds exactly, no rounding drift).
export function ringStatBudget(creature, ring) {
  const s = ringScaledStats(creature, ring);
  return s.hp + s.attack + s.armor + s.speed;
}
