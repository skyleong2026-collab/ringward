// ─── Manual-combat roster (Task 1: Reactor only) ───────────────────────────────
// Self-contained creature defs for the new engine. DECOUPLED from data/creatures.js
// (which feeds the frozen resolveBattle path) so this module can't perturb the
// auto-resolve goldens. `spriteId` points at a real creature sprite for the Lab UI;
// combat math never reads it. All stats are placeholder dials (§23) — Lab-tuned.

const REACTOR_KIT = ['chargeUp', 'overload', 'backdraft'];
const BULWARK_KIT = ['brace', 'aegis', 'bodyguard'];
const MENDER_KIT = ['mend', 'bloom', 'ward'];
const BOOSTER_KIT = ['prime', 'overdrive', 'resonate'];
const STRIKER_KIT = ['jab', 'flurry', 'blitz'];
const ASSASSIN_KIT = ['mark', 'execute', 'ambush'];
const WARDEN_KIT = ['frostnip', 'glaciate', 'coldsnap'];
const HEXER_KIT = ['jinx', 'doom', 'blight'];

export const COMBAT_CREATURES = {
  fizzpop: {
    id: 'fizzpop',
    name: 'Fizzpop',
    type: 'Reactor',
    spriteId: 'spark',
    hp: 220,
    atk: 30,
    speed: 5,
    skillIds: REACTOR_KIT,
  },
  glowtail: {
    id: 'glowtail',
    name: 'Glowtail',
    type: 'Reactor',
    spriteId: 'flicker',
    hp: 240,
    atk: 26,
    speed: 4,
    skillIds: REACTOR_KIT,
  },
  cinderpaw: {
    id: 'cinderpaw',
    name: 'Cinderpaw',
    type: 'Reactor',
    spriteId: 'cinder',
    hp: 200,
    atk: 34,
    speed: 6,
    skillIds: REACTOR_KIT,
  },

  // ── Bulwarks: high HP, low attack, slow — charge into shields, not damage ──
  stoneward: {
    id: 'stoneward',
    name: 'Stoneward',
    type: 'Bulwark',
    spriteId: 'vault',
    hp: 320,
    atk: 18,
    speed: 3,
    skillIds: BULWARK_KIT,
  },
  ironwall: {
    id: 'ironwall',
    name: 'Ironwall',
    type: 'Bulwark',
    spriteId: 'bastion',
    hp: 300,
    atk: 20,
    speed: 4,
    skillIds: BULWARK_KIT,
  },

  // ── Menders: moderate HP, low attack — win by outlasting, not out-damaging ──
  mossback: {
    id: 'mossback',
    name: 'Mossback',
    type: 'Mender',
    spriteId: 'link',
    hp: 240,
    atk: 16,
    speed: 5,
    skillIds: MENDER_KIT,
  },
  dewleaf: {
    id: 'dewleaf',
    name: 'Dewleaf',
    type: 'Mender',
    spriteId: 'nexus',
    hp: 220,
    atk: 18,
    speed: 6,
    skillIds: MENDER_KIT,
  },

  // ── Boosters: low attack of their own — their value is amplifying the carry ──
  buzzline: {
    id: 'buzzline',
    name: 'Buzzline',
    type: 'Booster',
    spriteId: 'conduit',
    hp: 230,
    atk: 14,
    speed: 6,
    skillIds: BOOSTER_KIT,
  },
  tanglewing: {
    id: 'tanglewing',
    name: 'Tanglewing',
    type: 'Booster',
    spriteId: 'conduit',
    hp: 210,
    atk: 16,
    speed: 7,
    skillIds: BOOSTER_KIT,
  },

  // ── Strikers: fast, moderate attack — win on tempo and many small hits ──
  swiftpaw: {
    id: 'swiftpaw',
    name: 'Swiftpaw',
    type: 'Striker',
    spriteId: 'striker',
    hp: 210,
    atk: 30,
    speed: 9,
    skillIds: STRIKER_KIT,
  },
  dartwing: {
    id: 'dartwing',
    name: 'Dartwing',
    type: 'Striker',
    spriteId: 'striker',
    hp: 200,
    atk: 32,
    speed: 10,
    skillIds: STRIKER_KIT,
  },

  // ── Assassins: glass cannons — high attack, low HP, hunt the weakest ──
  shadefang: {
    id: 'shadefang',
    name: 'Shadefang',
    type: 'Assassin',
    spriteId: 'fang',
    hp: 170,
    atk: 38,
    speed: 7,
    skillIds: ASSASSIN_KIT,
  },
  veilclaw: {
    id: 'veilclaw',
    name: 'Veilclaw',
    type: 'Assassin',
    spriteId: 'claw',
    hp: 160,
    atk: 40,
    speed: 8,
    skillIds: ASSASSIN_KIT,
  },

  // ── Wardens: control — low attack, moderate HP; win by freezing enemies out of
  // their turns. The first denial Type (§ new). ──
  frostwarden: {
    id: 'frostwarden',
    name: 'Frostward',
    type: 'Warden',
    spriteId: 'vault',
    hp: 240,
    atk: 18,
    speed: 5,
    skillIds: WARDEN_KIT,
  },
  rimecaller: {
    id: 'rimecaller',
    name: 'Rimecaller',
    type: 'Warden',
    spriteId: 'nexus',
    hp: 220,
    atk: 20,
    speed: 6,
    skillIds: WARDEN_KIT,
  },

  // ── Hexers: curse — low attack, moderate HP; win by making the enemy take more
  // from the whole squad. The team-multiplier Type (§ new). ──
  blightcap: {
    id: 'blightcap',
    name: 'Blightcap',
    type: 'Hexer',
    spriteId: 'fang',
    hp: 220,
    atk: 18,
    speed: 5,
    skillIds: HEXER_KIT,
  },
  hexmoth: {
    id: 'hexmoth',
    name: 'Hexmoth',
    type: 'Hexer',
    spriteId: 'claw',
    hp: 205,
    atk: 20,
    speed: 6,
    skillIds: HEXER_KIT,
  },
};

// Build a battle-ready creature def, stamping the temperament the AI side reads.
export function makeUnitDef(id, temperament = 'Balanced') {
  const base = COMBAT_CREATURES[id];
  if (!base) throw new Error(`Unknown combat creature: ${id}`);
  return { ...base, temperament };
}

export const COMBAT_ROSTER = Object.values(COMBAT_CREATURES);
