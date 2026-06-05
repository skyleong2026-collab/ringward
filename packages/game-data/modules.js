export const MODULES = {
  // ── Existing: Targeting ───────────────────────────────────────────────────
  weakpoint: {
    id: 'weakpoint', name: 'Weakpoint',
    description: 'Hunts weakened enemies.',
    category: 'Targeting', rarity: 'Common', color: '#d0021b', archetype: null,
  },
  echoHunter: {
    id: 'echoHunter', name: 'Echo Hunter',
    description: 'Targets Echoes first.',
    category: 'Targeting', rarity: 'Common', color: '#7ed321', archetype: null,
  },
  packCall: {
    id: 'packCall', name: 'Pack Call',
    description: 'Friends attack the same target.',
    category: 'Targeting', rarity: 'Common', color: '#4a90d9', archetype: null,
  },
  protector: {
    id: 'protector', name: 'Protector',
    description: 'Intercepts threats to allies.',
    category: 'Targeting', rarity: 'Common', color: '#ff6b35', archetype: null,
  },

  // ── Existing: Positioning ─────────────────────────────────────────────────
  rooted: {
    id: 'rooted', name: 'Rooted',
    description: 'Stands firm. Stronger while in place.',
    callout: 'ROOTED',
    category: 'Positioning', rarity: 'Common', color: '#4a90d9', archetype: null,
  },
  dart: {
    id: 'dart', name: 'Dart',
    description: 'Dashes away after attacking.',
    callout: 'DART',
    category: 'Positioning', rarity: 'Common', color: '#d0021b', archetype: null,
  },

  // ── Existing: Tempo ───────────────────────────────────────────────────────
  fastStart: {
    id: 'fastStart', name: 'Fast Start',
    description: 'First hit hits harder.',
    callout: 'FAST START',
    category: 'Tempo', rarity: 'Common', color: '#f5a623', archetype: null,
  },
  slowBurn: {
    id: 'slowBurn', name: 'Slow Burn',
    description: 'Gets stronger each round.',
    callout: 'SLOW BURN',
    category: 'Tempo', rarity: 'Common', color: '#f5a623', archetype: null,
  },

  // ── Existing: Information (reserved) ─────────────────────────────────────
  exposed: {
    id: 'exposed', name: 'Exposed',
    description: '[Reserved]',
    category: 'Information', rarity: 'Common', color: '#7ed321', archetype: null, hidden: true,
  },
  synchronized: {
    id: 'synchronized', name: 'Synchronized',
    description: '[Reserved]',
    category: 'Information', rarity: 'Common', color: '#7ed321', archetype: null, hidden: true,
  },

  // ── Phase I: Pressure ─────────────────────────────────────────────────────
  sacredResonance: {
    id: 'sacredResonance', name: 'Sacred Resonance',
    description: 'Enters with +10 Armor. Allies gain +4 Armor (formation).',
    callout: 'SACRED RESONANCE',
    category: 'Pressure', rarity: 'Common',
    content: 'Rail yards', color: '#c9a84c', archetype: null,
  },
  voidFractureStack: {
    id: 'voidFractureStack', name: 'Void Fracture Stack',
    description: 'Builds +3 Armor per consecutive hit from same attacker (max ×5). Resets on attacker switch.',
    callout: 'VOID FRACTURE',
    category: 'Pressure', rarity: 'Rare',
    content: 'Night routes', color: '#7b5ea7', archetype: null,
  },
  geologicalInertia: {
    id: 'geologicalInertia', name: 'Geological Inertia',
    description: '+6 Armor +2 Speed at round 3. +6 more Armor at round 6.',
    callout: 'GEOLOGICAL INERTIA',
    category: 'Pressure', rarity: 'Rare',
    content: 'Long walks', color: '#8b6f47', archetype: null,
  },

  // ── Phase I: Collapse ─────────────────────────────────────────────────────
  compressionPatience: {
    id: 'compressionPatience', name: 'Compression Patience',
    description: 'Builds +20% ATK per round (max ×3 stacks). Releases all stacks on next attack.',
    callout: 'COMPRESSION PATIENCE',
    category: 'Collapse', rarity: 'Rare',
    content: 'Dungeons', color: '#4ecdc4', archetype: null,
  },
  ruptureTiming: {
    id: 'ruptureTiming', name: 'Rupture Timing',
    description: '3rd consecutive hit on same target: +30% damage and −2 Speed for 2 rounds.',
    callout: 'RUPTURE TIMING',
    category: 'Collapse', rarity: 'Rare',
    content: 'Urban loops', color: '#e74c3c', archetype: null,
  },
  tensionRelease: {
    id: 'tensionRelease', name: 'Tension Release',
    description: 'Survive 2 rounds below 50% HP: next attack deals 2× damage.',
    callout: 'TENSION RELEASE',
    category: 'Collapse', rarity: 'Common',
    content: 'Dungeons', color: '#f39c12', archetype: null,
  },

  // ── Phase I: Crest ────────────────────────────────────────────────────────
  geometricApex: {
    id: 'geometricApex', name: 'Geometric Apex',
    description: '+30% damage vs targets below 30% HP. Overkill splashes 20% to next target.',
    callout: 'GEOMETRIC APEX',
    category: 'Crest', rarity: 'Common',
    content: 'Dungeons', color: '#f1c40f', archetype: null,
  },
  chargingMomentum: {
    id: 'chargingMomentum', name: 'Charging Momentum',
    description: '+4% ATK per round not hit by enemies (max +16%). Resets on taking damage.',
    callout: 'CHARGING MOMENTUM',
    category: 'Crest', rarity: 'Rare',
    content: 'Long walks', color: '#27ae60', archetype: null,
  },
  territorialClaim: {
    id: 'territorialClaim', name: 'Territorial Claim',
    description: '+1 Speed per kill made at full HP. Speed bonus resets when hit.',
    callout: 'TERRITORIAL CLAIM',
    category: 'Crest', rarity: 'Rare',
    content: 'Urban loops', color: '#2980b9', archetype: null,
  },

  // ── Phase I: Orbit ────────────────────────────────────────────────────────
  perpetualArc: {
    id: 'perpetualArc', name: 'Perpetual Arc',
    description: '3rd consecutive hit on same target deals +50% damage.',
    callout: 'PERPETUAL ARC',
    category: 'Orbit', rarity: 'Common',
    content: 'Dungeons', color: '#9b59b6', archetype: null,
  },
  lateralSweep: {
    id: 'lateralSweep', name: 'Lateral Sweep',
    description: 'While 2+ allies alive, attacks hit all other enemies at 40% secondary damage.',
    callout: 'LATERAL SWEEP',
    category: 'Orbit', rarity: 'Rare',
    content: 'Urban loops', color: '#1abc9c', archetype: null,
  },
  orbitalImmunity: {
    id: 'orbitalImmunity', name: 'Orbital Immunity',
    description: 'Cannot be frozen or stunned. Speed debuffs still apply.',
    callout: 'ORBITAL IMMUNITY',
    category: 'Orbit', rarity: 'Rare',
    content: 'Rail yards', color: '#3498db', archetype: null,
  },

  // ── Phase I: Drift ────────────────────────────────────────────────────────
  voidPatience: {
    id: 'voidPatience', name: 'Void Patience',
    description: '+15% damage per round not targeted (max +60%). Resets on attacking.',
    callout: 'VOID PATIENCE',
    category: 'Drift', rarity: 'Common',
    content: 'Night routes', color: '#8e44ad', archetype: null,
  },
  debrisOrbit: {
    id: 'debrisOrbit', name: 'Debris Orbit',
    description: 'When hit below 75% HP: gain 2 fragments (25 HP each). Destroying a fragment deals 15 damage to attacker.',
    callout: 'DEBRIS ORBIT',
    category: 'Drift', rarity: 'Rare',
    content: 'Dungeons', color: '#7f8c8d', archetype: null,
  },
  pendulumTiming: {
    id: 'pendulumTiming', name: 'Pendulum Timing',
    description: 'Every other round: becomes untargetable, then returns with +40% damage.',
    callout: 'PENDULUM TIMING',
    category: 'Drift', rarity: 'Rare',
    content: 'Long walks', color: '#34495e', archetype: null,
  },
};

export const MODULES_BY_CATEGORY = Object.values(MODULES).reduce((acc, mod) => {
  if (!acc[mod.category]) acc[mod.category] = [];
  acc[mod.category].push(mod);
  return acc;
}, {});

export const MODULES_BY_ID = MODULES;

export const MODULE_POOLS = {
  'Rail yards':   ['sacredResonance', 'orbitalImmunity', 'geometricApex', 'perpetualArc', 'voidPatience'],
  'Urban loops':  ['ruptureTiming', 'territorialClaim', 'lateralSweep', 'geometricApex', 'perpetualArc'],
  'Long walks':   ['geologicalInertia', 'chargingMomentum', 'pendulumTiming', 'voidPatience', 'perpetualArc'],
  'Dungeons':     ['compressionPatience', 'tensionRelease', 'geometricApex', 'perpetualArc', 'debrisOrbit'],
  'Night routes': ['voidFractureStack', 'voidPatience'],
};
