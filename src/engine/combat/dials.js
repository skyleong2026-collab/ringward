// ─── Manual-combat dials (§23: "all numbers are placeholder dials — the Lab tunes them") ───
// The STRUCTURE is the point. Every number here is meant to be moved in the Lab.
// Kept in one file so tuning never means hunting through logic.
//
// This module is ADDITIVE (Constraint #3): it is a NEW manual-combat system that
// lives entirely beside the frozen battleStepEngine.js / resolveBattle path. It
// shares nothing with the auto-resolve goldens and never touches them.

export const ROUND_CAP = 12; // §23.1 hard cap so stall can't win
export const ROUND_FLOOR = 5; // design target; not enforced, drives HP tuning

// Charge is the spine (§23.1). One pool per creature, built by acting.
export const MAX_CHARGE = 6;

// ── Burn: a damage-over-time status Reactors light and feed ──
export const BURN = {
  tickDmg: 12, // flat damage per stack at end of round
  decayPerRound: 1, // stacks lost each round after ticking
  maxStacks: 4,
};

// ── Block: a damage-absorb shield Bulwarks raise (soaked before HP) ──
export const BLOCK = {
  maxStack: 400, // generous cap; a dial, not a wall
};

// ── Regen: a heal-over-time Menders apply (ticks at end of round, mirrors Burn) ──
export const REGEN = {
  tickHeal: 14, // flat heal per stack at end of round
  decayPerRound: 1,
  maxStacks: 4,
};

// ── Amp: an outgoing-damage buff Boosters lend to allies. Unlike Burn/Regen it
// never ticks HP — it multiplies a buffed unit's damage at the moment it hits, then
// decays at end of round. This is the cross-unit amplification primitive (§23): a
// Booster's whole value is making SOMEONE ELSE hit harder. ──
export const AMP = {
  dmgPerStack: 0.25, // +25% outgoing damage per stack while it lasts
  decayPerRound: 1,
  maxStacks: 4, // cap = ×2 damage at full stacks
};

// ── Freeze: a control status Wardens apply. A frozen unit SKIPS its turn; the
// freeze drops by one each time it would have acted (its natural thaw). Opt-in —
// no existing creature carries freeze, so every current golden is untouched. ──
export const FREEZE = {
  maxStacks: 3, // a unit can be locked for at most this many of its turns
};

// ── Reactor kit (§23.5) — Charge Up / Overload / Backdraft ──
export const REACTOR = {
  chargeUp: {
    chargeGain: 2, // +2 charge (§23.5)
    chipMult: 0.5, // builder still does something NOW (atk * mult)
    burnApply: 1, // drips a little Burn
  },
  overload: {
    minCharge: 2, // gate: "fire weak at 2 or hold for the bomb at 4+"
    base: 0.8, // atk multiplier floor
    perCharge: 0.6, // + per point of charge spent
    burningBonus: 2.0, // ×2 if the target is Burning (§23.5)
    // spends ALL charge
  },
  backdraft: {
    minCharge: 2,
    perCharge: 0.5, // line damage = atk * perCharge * charge vented
    burnApply: 1, // spreads Burn across the line
    // vents HALF the current charge
  },
};

// ── Bulwark kit (§23) — Brace / Aegis / Bodyguard. The wall: charge into shields,
// not damage. Builder still chips so charging is never a dead turn (§23.1). ──
export const BULWARK = {
  brace: {
    chargeGain: 2,
    blockGain: 40, // self shield now
    chipMult: 0.4, // small poke so the builder still acts
  },
  aegis: {
    minCharge: 2,
    blockPerCharge: 18, // spend ALL charge → shield the whole ally line
  },
  bodyguard: {
    minCharge: 2,
    blockPerCharge: 30, // vent HALF charge → heavy cover on one ally
  },
};

// ── Mender kit (§23) — Mend / Bloom / Ward. Sustain: charge into healing.
// Builder still chips + trickles a heal so charging is never a dead turn (§23.1). ──
export const MENDER = {
  mend: {
    chargeGain: 2,
    healNow: 18, // trickle heal to the most-wounded ally now
    chipMult: 0.3, // small poke on an enemy
  },
  bloom: {
    minCharge: 2,
    base: 20, // spend ALL charge → big single-ally heal = base + perCharge*charge
    perCharge: 30,
  },
  ward: {
    minCharge: 2,
    regenPerVent: 1, // vent HALF charge → regen stacks on the whole ally line
  },
};

// ── Booster kit (§23) — Prime / Overdrive / Resonate. The amplifier: charge into
// an ally's damage, not your own. Builder still chips so charging is never a dead
// turn (§23.1). Its payoff lands on a teammate — the §26 seam's first cross-unit
// buff. ──
export const BOOSTER = {
  prime: {
    chargeGain: 2,
    ampStacks: 1, // small prime on the strongest ally now
    chipMult: 0.4, // builder still pokes an enemy
  },
  overdrive: {
    minCharge: 2,
    base: 1, // amp stacks = base + perCharge*charge spent (capped at AMP.maxStacks)
    perCharge: 1, // spend ALL charge → set up the carry's big swing
  },
  resonate: {
    minCharge: 2,
    ampPerVent: 1, // vent HALF charge → 1 amp stack on the whole ally line
  },
};

// ── Striker kit (§23) — Jab / Flurry / Blitz. Tempo: many fast hits, and a reward
// for winning initiative. Reuses the damage primitive (no new status) — its identity
// is in the SHAPE of its damage (many small hits) and its initiative bonus. ──
export const STRIKER = {
  jab: {
    chargeGain: 2,
    hits: 2, // a quick two-hit
    hitMult: 0.5, // each small (so a Jab ≈ a Reactor chip, split in two)
  },
  flurry: {
    minCharge: 2,
    baseHits: 2,
    hitsPerCharge: 1, // hits = baseHits + hitsPerCharge*charge spent
    hitMult: 0.65,
    maxHits: 8, // cap the barrage
  },
  blitz: {
    minCharge: 2,
    hitMult: 0.9, // ×charge vented
    firstStrikeBonus: 1.6, // ×1.6 if it's the first action of the round (tempo)
  },
};

// ── Assassin kit (§23) — Mark / Execute / Ambush. Execute: damage that spikes
// against a wounded target. Reuses the damage primitive — the identity is the
// conditional multiplier, the "finish them" payoff. ──
export const ASSASSIN = {
  mark: {
    chargeGain: 2,
    hitMult: 0.6,
    woundedPct: 0.5, // harder if the target is already below half
    woundedBonus: 1.5,
  },
  execute: {
    minCharge: 2,
    base: 1.0,
    perCharge: 0.5,
    executeThreshold: 0.45, // target below this HP% …
    executeBonus: 2.5, // … and the blow is lethal
  },
  ambush: {
    minCharge: 2,
    hitMult: 1.2, // ×charge vented
    woundedPct: 0.6,
    woundedBonus: 1.8,
  },
};

// ── Warden kit (§ new Type) — Frost Nip / Glaciate / Cold Snap. Control: charge
// into FREEZE, not damage. Low attack; its value is denying the enemy its turns.
// Builder banks charge + chips; payoff locks one enemy solid; wildcard briefly
// freezes the whole line. ──
export const WARDEN = {
  frostnip: {
    chargeGain: 2,
    chipMult: 0.4, // small cold poke so building is never a dead turn
  },
  glaciate: {
    minCharge: 2,
    base: 0.7, // atk multiplier floor
    perCharge: 0.4, // + per point of charge spent
    freezeStacks: 2, // spend ALL charge → freeze one enemy for 2 of its turns
  },
  coldsnap: {
    minCharge: 2,
    perCharge: 0.35, // line damage = atk * perCharge * charge vented
    freezeStacks: 1, // vent HALF charge → freeze the whole enemy line for 1 turn
  },
};

// ── Temperament → payoff threshold (§24.2). One knob, three real defenses. ──
export const TEMPERAMENT_THRESHOLD = {
  Greedy: 6, // holds for the bomb, dies to rushdown
  Balanced: 4,
  Cautious: 2, // chips safely, never threatens the one-shot
};
