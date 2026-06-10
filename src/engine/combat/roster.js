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
    spriteId: 'fizzpop',
    // Starter buff (vF-?, sim-validated): the beginner squad (Fizzpop+Stoneward+Cinderpaw) was ~8%
    // win-rate on the Outer Ring. Rarity-safe rework: ATK capped BELOW Legendary Cinderpaw (eff. 49)
    // so the Legendary keeps its damage crown; the buff leans into HP — a sturdy-bruiser Common.
    hp: 340, // was 220
    atk: 44, // was 30 (stays < Cinderpaw's effective 49)
    speed: 5,
    skillIds: REACTOR_KIT,
  },
  glowtail: {
    id: 'glowtail',
    name: 'Glowtail',
    type: 'Reactor',
    spriteId: 'glowtail',
    hp: 240,
    atk: 26,
    speed: 4,
    skillIds: REACTOR_KIT,
  },
  cinderpaw: {
    id: 'cinderpaw',
    name: 'Cinderpaw',
    type: 'Reactor',
    spriteId: 'cinderpaw',
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
    spriteId: 'stoneward',
    // Starter buff (vF-?, sim-validated) — see Fizzpop. As a TANK, ATK isn't rarity-compared, so it
    // buffs freely: big HP + real Brace-chip ATK (still far below any DPS). Tank identity intact.
    hp: 560, // was 320
    atk: 38, // was 18 — meaningful chip, still tank-low (< Fizzpop's 44)
    speed: 3,
    skillIds: BULWARK_KIT,
  },
  ironwall: {
    id: 'ironwall',
    name: 'Ironwall',
    type: 'Bulwark',
    spriteId: 'ironwall',
    hp: 380, // was 300 — roster audit: a Rare Bulwark shouldn't lag the (starter-buffed) Common Stoneward
    atk: 32, // was 20
    speed: 4,
    skillIds: BULWARK_KIT,
  },

  // ── Menders: moderate HP, low attack — win by outlasting, not out-damaging ──
  mossback: {
    id: 'mossback',
    name: 'Mossback',
    type: 'Mender',
    spriteId: 'mossback',
    hp: 240,
    atk: 16,
    speed: 5,
    skillIds: MENDER_KIT,
  },
  dewleaf: {
    id: 'dewleaf',
    name: 'Dewleaf',
    type: 'Mender',
    spriteId: 'dewleaf',
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
    spriteId: 'buzzline',
    hp: 230,
    atk: 20, // was 14→24; roster audit trimmed it (a Common Booster shouldn't match Rare Tanglewing's 26)
    speed: 6,
    skillIds: BOOSTER_KIT,
  },
  tanglewing: {
    id: 'tanglewing',
    name: 'Tanglewing',
    type: 'Booster',
    spriteId: 'tanglewing',
    hp: 210,
    atk: 26, // was 16 — support rebalance (see buzzline)
    speed: 7,
    skillIds: BOOSTER_KIT,
  },

  // ── Strikers: fast, moderate attack — win on tempo and many small hits ──
  swiftpaw: {
    id: 'swiftpaw',
    name: 'Swiftpaw',
    type: 'Striker',
    spriteId: 'swiftpaw',
    hp: 210,
    atk: 30,
    speed: 9,
    skillIds: STRIKER_KIT,
  },
  dartwing: {
    id: 'dartwing',
    name: 'Dartwing',
    type: 'Striker',
    spriteId: 'dartwing',
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
    spriteId: 'shadefang',
    hp: 170,
    atk: 38,
    speed: 7,
    skillIds: ASSASSIN_KIT,
  },
  veilclaw: {
    id: 'veilclaw',
    name: 'Veilclaw',
    type: 'Assassin',
    spriteId: 'veilclaw',
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
    spriteId: 'frostwarden',
    hp: 240,
    atk: 18,
    speed: 5,
    skillIds: WARDEN_KIT,
  },
  rimecaller: {
    id: 'rimecaller',
    name: 'Rimecaller',
    type: 'Warden',
    spriteId: 'rimecaller',
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
    spriteId: 'blightcap',
    hp: 220,
    atk: 18,
    speed: 5,
    skillIds: HEXER_KIT,
  },
  hexmoth: {
    id: 'hexmoth',
    name: 'Hexmoth',
    type: 'Hexer',
    spriteId: 'hexmoth',
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
