import { CREATURES } from './creatures.js';

// Look up a creature by id. Throws at module-load if the id is invalid so a typo
// surfaces immediately (build/test failure) instead of silently producing an
// `undefined` squad member that black-screens a screen at render time.
const c = (id) => {
  const found = CREATURES.find((u) => u.id === id);
  if (!found) throw new Error(`contracts.js: unknown creature id "${id}" (valid: ${CREATURES.map((u) => u.id).join(', ')})`);
  return found;
};

// ─── Contracts (§20.8 — The Contract Frame) ───────────────────────────────────
// A contract is the smallest frame that makes a battle's outcome matter and
// gives interventions a real cost (§20.7). It is build-vs-build under a stated
// constraint: the obstacle is always another build, never a number or a timer
// for its own sake (§20.8.1).
//
// Anatomy (§20.8.2): 3 fiction fields + 3 mechanic fields.
//   Fiction : client · situation · stakes
//   Mechanic: modifier · winCondition · payout
//
// vC-A ships ONE contract ("Quiet the Signal") with NO intel layer yet — that
// is Test 2, gated on Test 1 passing (§20.8.6). Every number here is a playtest
// dial, not a lock (§20.8.7).

export const CONTRACTS = [
  {
    id: 'quiet-the-signal',
    client: 'Shadow',
    name: 'Quiet the Signal',
    // ── Fiction ──
    situation:
      'A Spark phenomenon is overcharging in the rail yard. Left alone it keeps building — each surge wider than the last. The client wants it quiet before it finishes the third.',
    stakes:
      'Walk away and the yard is lost to the surge. The client remembers who answers and who does not.',
    // ── Mechanic ──
    modifier: {
      // One readable sentence (§10 kid test) that breaks the default build.
      headline: 'You have 1 intervention this contract, not 3.',
      detail:
        'No hand-holding the fight turn by turn. The squad you bring has to carry itself.',
      interventionBudget: 1, // parameter on the existing intervention system
    },
    winCondition: {
      // Defeat the squad before its Spark completes a 3rd detonation.
      detonationLimit: 3, // the visible clock — 3rd enemy detonation = the signal completes = loss
      summary: 'Defeat the squad before its Spark completes a 3rd detonation.',
      clockLabel: 'SIGNAL',
    },
    payout: {
      // Access only, never stat-power (§20.8.2). The reputation amount is the
      // self-set risk dial (§20.8.4): you bank `base + boldnessMax` for a blind
      // dive, losing one per axis scouted. Cautious play is always paid `base`.
      artifactId: 'firstLight',
      reputation: { faction: 'Shadow', amount: 1 }, // `amount` = the cautious floor
      boldnessMax: 3,                               // full blind-dive bonus on top
      summary: 'First Light artifact · Shadow standing',
    },
    rewardsLine: "Rewards an autonomous build that doesn't need babysitting.",
    winLine: 'The signal is quiet. Shadow remembers.',
    // ── Intel axes (§20.8.4) ──────────────────────────────────────────────────
    // The contract opens with these hidden. Each is scouted by a low-stakes recon
    // fight against one fragment of the enemy squad — you learn the axis by
    // fighting it (the teaching layer). Winning reveals it; losing reveals
    // nothing and is retryable (anti-permadeath). Revealed intel persists.
    // `fragmentIndex` points into `squad` below: scout the piece, learn the lesson.
    intel: {
      composition: {
        label: 'Composition', glyph: '◇', fragmentIndex: 0, // the Guardian anchor
        hidden: 'Lineup unknown — you do not know what you are walking into.',
        revealed: 'A Guardian anchors the formation, shielding a lone Spark, with a Swift on the flank.',
        scoutLine: 'Probe the anchor to read the shape of the squad.',
      },
      behavior: {
        label: 'Behavior', glyph: '◈', fragmentIndex: 1, // the Spark itself
        hidden: "The phenomenon's trick is unknown — what is it actually doing?",
        revealed: 'The Signal charges fast and detonates across your whole squad. Left alone it only grows.',
        scoutLine: 'Engage the Signal alone to witness how it builds and bursts.',
      },
      threat: {
        label: 'Threat', glyph: '✸', fragmentIndex: 2, // the Swift
        hidden: 'Win condition unknown — you do not know what ends this, or what ends you.',
        revealed: 'Quiet the squad before the third detonation. The Swift punishes a slow opener.',
        scoutLine: 'Spar the flanker to feel the timing and the kill pressure.',
      },
    },
    // ── Enemy build ──
    // Centered on a Spark that charges fast (banked-heat dial → +2 stoke/round)
    // so the 3rd detonation is a genuine threat inside the round budget. The
    // Guardian buys the Spark time; the Swift punishes a slow opener. No combat
    // math is changed — bankedHeat is an existing module dial.
    level: 3,
    squad: [
      c('vault'),
      { ...c('cinder'), name: 'The Signal', moduleIds: ['bankedHeat'] },
      c('striker'),
    ],
  },

  // ── "Hold the Crossing" (Light) — Test 3 (§20.8.5) ────────────────────────
  // A protect contract with a different modifier, to test whether build
  // *diversity* emerges (§20.8.6 Test 3). The single-target halving punishes a
  // pure-burst answer; the Wild surge's threat is its Sparks, whose detonations
  // are spreads — UNAFFECTED by the halving — so they bloom across the Beacon
  // unless cleared. Spread/chain offense (Echo) clears them; pure Swift cannot.
  {
    id: 'hold-the-crossing',
    client: 'Light',
    name: 'Hold the Crossing',
    situation:
      'A Wild surge is breaking against the river crossing. The Light needs the beacon there kept lit while the surge spends itself — hold the line, do not chase.',
    stakes:
      'If the beacon falls the crossing is overrun and the district behind it goes dark. The Light does not forget who held.',
    modifier: {
      headline: 'Single-target attacks land at half. Chains and spreads land full.',
      detail:
        'Pure burst will not clear the surge in time — the threat is the Sparks, and they bloom wide. Bring something that spreads.',
      interventionBudget: 3,
      singleTargetDamageScale: 0.5, // §20.8.5 modifier — engine-level, defaulted off elsewhere
    },
    winCondition: {
      hold: { rounds: 8, escorteeInstanceId: 'crossing-beacon' },
      summary: 'Keep the Crossing Beacon standing for 8 rounds.',
      clockLabel: 'HOLD',
    },
    payout: {
      artifactId: 'bulwarkTithe', // a Light shield-artifact (§20.6) as the discovered piece
      reputation: { faction: 'Light', amount: 1 },
      boldnessMax: 3,
      summary: 'Bulwark Tithe artifact · Light standing',
    },
    rewardsLine: 'Punishes pure single-target burst; rewards spread and chains.',
    winLine: 'The crossing holds. Light remembers.',
    // The escortee — a transient "structure" unit prepended to the player squad
    // for this battle only (never enters the roster). A Guardian, so the surge
    // focuses it (the thing you are protecting) and it can shield itself.
    escortee: {
      instanceId: 'crossing-beacon', id: 'beacon', name: 'Crossing Beacon',
      archetype: 'Guardian', hp: 420, attack: 6, armor: 18, speed: 1,
      level: 1, gearId: null, moduleIds: [],
      flavor: 'It only has to stay lit.',
    },
    level: 3,
    // Wild surge: two overcharging Sparks (the real, spread-damage threat) plus
    // two Swift bodies (single-target, blunted by the modifier).
    squad: [
      { ...c('spark'), name: 'Emberling', moduleIds: ['bankedHeat'] },
      { ...c('fang'), name: 'Surgefang' },
      { ...c('cinder'), name: 'Ashling', moduleIds: ['bankedHeat'] },
      { ...c('striker'), name: 'Ripclaw' },
    ],
    intel: {
      composition: {
        label: 'Composition', glyph: '◇', fragmentIndex: 1, // a Swift body
        hidden: 'Lineup unknown — you do not know the shape of the surge.',
        revealed: 'A Wild surge: fast Swift bodies swarming around overcharging Sparks.',
        scoutLine: 'Cut down one of the runners to read the swarm.',
      },
      behavior: {
        label: 'Behavior', glyph: '◈', fragmentIndex: 0, // a Spark
        hidden: 'The surge has a trick — something about it is not just numbers.',
        revealed: 'The Sparks detonate wide — area bursts that ignore the single-target rule. Kill them before they bloom.',
        scoutLine: 'Engage a Spark alone to see how it blooms.',
      },
      threat: {
        label: 'Threat', glyph: '✸', fragmentIndex: 3, // a Swift
        hidden: 'Win condition unknown — you do not know what holding this costs.',
        revealed: 'Keep the Beacon lit for 8 rounds. Single-target hits land at half, so burst alone will not clear the surge.',
        scoutLine: 'Spar a runner to feel the tempo of the assault.',
      },
    },
  },
];

export const CONTRACTS_BY_ID = Object.fromEntries(CONTRACTS.map((k) => [k.id, k]));

// ─── Rivals (Test 4) ──────────────────────────────────────────────────────────
// A Rival is a recurring opponent unlocked by faction reputation (§20.8.6 Test 4).
// Their squad scales each time you beat them (tier bumps: level + module upgrades).
// No intel axes — you already know this enemy, and they know you. No clock or hold.
// The "bet" is mutual: both sides wager standing (winner gains, loser loses nothing
// — anti-permadeath holds). Each win earns a prestige artifact cosmetic.
//
// Rep threshold to unlock: Shadow ≥ 3 / Light ≥ 3.
export const RIVAL_UNLOCK_THRESHOLD = 3;

export const RIVALS = [
  {
    id: 'shadow-rival-crucible',
    rivalId: 'crucible',             // key into codex.rivals
    faction: 'Shadow',
    name: 'Crucible',
    title: 'Shadow Enforcer',
    situation: 'Shadow took notice. Crucible runs their hardest tests personally — a squad that adapts to whoever it faces. This is not a job. This is a measure.',
    stakes: "Win and Shadow's hardest door opens. Lose and Crucible escalates.",
    modifier: {
      headline: 'No constraints. Both squads fight clean.',
      detail: 'No clock, no escort, no modifier. Crucible wins by being better.',
      interventionBudget: 3,
    },
    winCondition: { summary: 'Defeat Crucible\'s squad.' },
    payout: {
      artifactId: 'shadowCrest',
      reputation: { faction: 'Shadow', amount: 2 },
      summary: 'Shadow Crest cosmetic · Shadow standing +2',
    },
    winLine: "Crucible nods. Shadow's hardest door is open.",
    // Escalating squads by tier (0–3). Level + module dials increase each tier.
    tiers: [
      { level: 4, squad: [c('vault'), c('fang'), c('striker')] },
      { level: 6, squad: [c('vault'), { ...c('fang'), moduleIds: ['deepCut'] }, c('striker'), c('spark')] },
      { level: 8, squad: [{ ...c('vault'), moduleIds: ['hardplate'] }, { ...c('fang'), moduleIds: ['deepCut'] }, c('striker'), { ...c('cinder'), moduleIds: ['bankedHeat'] }] },
      { level: 10, squad: [{ ...c('vault'), moduleIds: ['hardplate'] }, { ...c('fang'), moduleIds: ['deepCut'] }, { ...c('striker'), moduleIds: ['hairTrigger'] }, { ...c('cinder'), moduleIds: ['bankedHeat'] }, c('conduit')] },
    ],
  },
  {
    id: 'light-rival-wardenfall',
    rivalId: 'wardenfall',
    faction: 'Light',
    name: 'Wardenfall',
    title: 'Light Champion',
    situation: "The Light has champions who hold things together by being impossible to kill. Wardenfall is one. They've heard what you did at the crossing.",
    stakes: 'This is a challenge of craft, not territory. Wardenfall wants to know if you are real.',
    modifier: {
      headline: 'No constraints. Both squads fight clean.',
      detail: 'No clock, no escort, no modifier. Wardenfall wins by outlasting everything.',
      interventionBudget: 3,
    },
    winCondition: { summary: 'Defeat Wardenfall\'s squad.' },
    payout: {
      artifactId: 'lightSeal',
      reputation: { faction: 'Light', amount: 2 },
      summary: 'Light Seal cosmetic · Light standing +2',
    },
    winLine: 'Wardenfall stands down. The Light has seen what you are.',
    tiers: [
      { level: 4, squad: [c('vault'), c('conduit'), c('bastion')] },
      { level: 6, squad: [{ ...c('vault'), moduleIds: ['earlyWall'] }, c('conduit'), c('bastion'), c('fang')] },
      { level: 8, squad: [{ ...c('vault'), moduleIds: ['earlyWall'] }, { ...c('conduit'), moduleIds: ['longEcho'] }, c('bastion'), { ...c('fang'), moduleIds: ['deepCut'] }] },
      { level: 10, squad: [{ ...c('vault'), moduleIds: ['earlyWall'] }, { ...c('conduit'), moduleIds: ['longEcho'] }, { ...c('bastion'), moduleIds: ['hardplate'] }, { ...c('fang'), moduleIds: ['deepCut'] }, c('striker')] },
    ],
  },
];

export const RIVALS_BY_ID = Object.fromEntries(RIVALS.map((r) => [r.rivalId, r]));
export const RIVALS_BY_FACTION = Object.fromEntries(RIVALS.map((r) => [r.faction, r]));

// Returns the rival contract for a faction at the given tier (from codex.rivals).
export function getRivalContract(rivalDef, tier = 0) {
  const t = rivalDef.tiers[Math.min(tier, rivalDef.tiers.length - 1)];
  return { ...rivalDef, level: t.level, squad: t.squad, isRival: true };
}

// ─── Difficulty (Test 6) ───────────────────────────────────────────────────────
// Player-set dial on ContractScreen. Scales enemy level and the payout multiplier.
// Standard is the balanced baseline; Hard and Brutal are opt-in challenge modes.
export const DIFFICULTIES = {
  standard: { label: 'Standard', level: 3, payoutMult: 1.0, color: '#6a6a7a' },
  hard:     { label: 'Hard',     level: 5, payoutMult: 1.5, color: '#d0902a' },
  brutal:   { label: 'Brutal',   level: 8, payoutMult: 2.0, color: '#d0021b' },
};
export const DIFFICULTY_ORDER = ['standard', 'hard', 'brutal'];

// Enemy level for a contract at a given difficulty (difficulty overrides contract.level).
export function contractEnemyLevel(contract, difficultyKey = 'standard') {
  return DIFFICULTIES[difficultyKey]?.level ?? contract.level;
}

// Payout rep after scouting + difficulty multiplier applied.
export function payoutRepAmountWithDifficulty(contract, revealedCount, difficultyKey = 'standard') {
  const base = payoutRepAmount(contract, revealedCount);
  const mult = DIFFICULTIES[difficultyKey]?.payoutMult ?? 1;
  return Math.ceil(base * mult);
}

export const INTEL_AXES = ['composition', 'behavior', 'threat'];

// How many axes are revealed in a per-contract intel map (from the Codex).
export function countRevealed(intel) {
  return INTEL_AXES.filter((k) => intel?.[k]?.revealed).length;
}

// The §20.8.4 risk dial: cautious floor + the blind-dive bonus you still hold.
// Blind (0 scouted) pays base+boldnessMax; each axis scouted trades 1 standing
// for safety. Cautious play is always paid the floor — never punished.
export function payoutRepAmount(contract, revealedCount) {
  const base = contract.payout?.reputation?.amount ?? 0;
  const boldness = Math.max(0, (contract.payout?.boldnessMax ?? 0) - revealedCount);
  return base + boldness;
}
