// ─── Artifacts (§20.6) ────────────────────────────────────────────────────────
// Artifacts are an equipped *rule mutation* — the build layer that sings once
// there is something to prove (a contract with stakes). For vC-A they exist as
// DATA ONLY: the contract frame unlocks them into the Codex; none is wired into
// combat yet (§20.7 — frame + cost first, then artifacts become proving-ground
// content). Do not add combat behavior here without an Opus design pass.
//
// Tiers: ◆ Foundation (complete alone, 1-slot-friendly)
//        ◆◆ Engine (sings with a squadmate / 2nd artifact)
//        ◆◆◆ Synthesis (build-defining; gate behind mastery)

export const ARTIFACT_TIERS = {
  foundation: { mark: '◆',   label: 'Foundation', color: '#7a8a9a' },
  engine:     { mark: '◆◆',  label: 'Engine',     color: '#4a90d9' },
  synthesis:  { mark: '◆◆◆', label: 'Synthesis',  color: '#b06bff' },
};

export const ARTIFACTS = {
  // ── Tempo / action economy ──
  firstLight: {
    id: 'firstLight', name: 'First Light', tier: 'foundation', family: 'Tempo',
    text: 'Your first intervention each battle is free.',
    note: 'The intervention-cost fix in artifact form — only matters once interventions cost something.',
  },
  momentumCore: {
    id: 'momentumCore', name: 'Momentum Core', tier: 'foundation', family: 'Tempo',
    text: 'When an ally defeats an enemy, the next ally to act this round strikes with +50% force.',
  },
  overclock: {
    id: 'overclock', name: 'Overclock', tier: 'engine', family: 'Tempo',
    text: 'If this unit is last in its squad to act in a round, it acts twice next round.',
  },
  // ── Targeting / position ──
  vanguardLens: {
    id: 'vanguardLens', name: 'Vanguard Lens', tier: 'foundation', family: 'Targeting',
    text: 'The rear-most ally is treated as front-line (targetable; can use front-line gear).',
  },
  spottersMark: {
    id: 'spottersMark', name: "Spotter's Mark", tier: 'engine', family: 'Targeting',
    text: 'When this unit hits a target, that target takes +25% from ALL allies until it next acts.',
  },
  crossfire: {
    id: 'crossfire', name: 'Crossfire', tier: 'engine', family: 'Targeting',
    text: 'Redirect may split: strike two enemies for 60% each.',
  },
  // ── Resonance / synthesis ──
  harmonicConduit: {
    id: 'harmonicConduit', name: 'Harmonic Conduit', tier: 'engine', family: 'Resonance',
    text: 'Resonate chains through one additional free ally (two allies join the burst).',
  },
  discordantResonance: {
    id: 'discordantResonance', name: 'Discordant Resonance', tier: 'engine', family: 'Resonance',
    text: 'Resonate may send the pulled ally at a second enemy in the same burst.',
  },
  echoOfIntent: {
    id: 'echoOfIntent', name: 'Echo of Intent', tier: 'synthesis', family: 'Resonance',
    text: 'Resonate may pull an ally that has ALREADY acted; it acts again at 0.5×.',
  },
  // ── Charge / Spark ──
  volatilePrimer: {
    id: 'volatilePrimer', name: 'Volatile Primer', tier: 'foundation', family: 'Charge',
    text: 'This Spark detonates one stack earlier (threshold −1).',
    note: 'An honest dial — included to show the floor.',
  },
  storedLightning: {
    id: 'storedLightning', name: 'Stored Lightning', tier: 'engine', family: 'Charge',
    text: 'Overkill from a detonation becomes charge on the nearest allied Spark.',
  },
  chainReaction: {
    id: 'chainReaction', name: 'Chain Reaction', tier: 'synthesis', family: 'Charge',
    text: 'When a Spark detonates, every ally holding any charge releases at 50%.',
  },
  // ── Guardian / protection ──
  bulwarkTithe: {
    id: 'bulwarkTithe', name: 'Bulwark Tithe', tier: 'engine', family: 'Guardian',
    text: "While this Guardian shields an ally, 20% of damage absorbed converts to attack on that ally's next strike.",
  },
  lastStand: {
    id: 'lastStand', name: 'Last Stand', tier: 'synthesis', family: 'Guardian',
    text: 'The first ally to fall each battle returns once at 30% HP (sheds gear).',
    note: 'Failure-without-erasure at battle scale — fits the anti-permadeath North Star.',
  },
  // ── Echo / repetition ──
  resonatorArray: {
    id: 'resonatorArray', name: 'Resonator Array', tier: 'engine', family: 'Echo',
    text: 'A repeated (echo) action that kills triggers one more repeat.',
  },
  // ── Predator / execute ──
  bloodscent: {
    id: 'bloodscent', name: 'Bloodscent', tier: 'engine', family: 'Predator',
    text: 'When ANY ally executes a target, this Predator gains a stacking +10% attack for the battle.',
  },
  cullingOrder: {
    id: 'cullingOrder', name: 'Culling Order', tier: 'synthesis', family: 'Predator',
    text: "If this unit's hit would kill, it executes and immediately strikes a second target.",
  },
  // ── Rival prestige cosmetics (Test 4 — earned by defeating a Rival) ──
  // These are prestige pieces, not raw power. They signal what you've done.
  shadowCrest: {
    id: 'shadowCrest', name: 'Shadow Crest', tier: 'engine', family: 'Rival',
    text: 'Shadow has seen what you are. When your squad opens with a kill in round 1, each ally acts with +15% attack for the rest of that round.',
    note: 'Proof you faced Crucible. The bonus rewards the opening aggression Shadow values.',
  },
  lightSeal: {
    id: 'lightSeal', name: 'Light Seal', tier: 'engine', family: 'Rival',
    text: 'Light has seen what you are. The first ally to take a fatal hit each battle survives it once at 1 HP.',
    note: 'Proof you faced Wardenfall. The effect mirrors the resilience that defines the Light.',
  },
  // ── Discovery / weird ──
  strangeAttractor: {
    id: 'strangeAttractor', name: 'Strange Attractor', tier: 'engine', family: 'Discovery',
    text: 'The first time each battle you face an unfamiliar species, copy one of its traits for the rest of the fight.',
    note: 'Exploration literally powering the build.',
  },
};

export const ARTIFACTS_BY_ID = ARTIFACTS;
