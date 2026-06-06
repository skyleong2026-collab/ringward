import { TEMPERAMENT_THRESHOLD, REACTOR, BULWARK, MENDER, BOOSTER, STRIKER, ASSASSIN, WARDEN, HEXER } from './dials.js';
import {
  always,
  and,
  chargeAtLeast,
  enemyCountAtLeast,
  enemyBelowPct,
  allyBelowPct,
  alliesBelowPctCount,
  allyCountAtLeast,
  isFirstAction,
  lowestHpEnemy,
  lowestHpBurningEnemy,
  lowestHpAlly,
  biggestThreatEnemy,
  strongestAlly,
  allEnemies,
  allAllies,
} from './vocab.js';

// ─── Doctrines (§24) ─────────────────────────────────────────────────────────
// A doctrine is an ORDERED ladder of rules. The AI driver walks it top-down and
// takes the FIRST rule whose condition holds and whose skill is legal. The last
// rule is always an `always` fallback, so a decision is guaranteed. This is the
// whole "brain" — readable as a priority list, the same shape a player would
// describe their own plan in ("nuke if I'm charged, else chip and build").

// Each rule: { name, when(actor,state), skillId, select(actor,state) -> uid[] }.

// Overload targets a Burning enemy first (the ×2 lives there), else the lowest-HP
// enemy — close out a kill.
const overloadTarget = (actor, state) => {
  const burning = lowestHpBurningEnemy(actor, state);
  return burning.length ? burning : lowestHpEnemy(actor, state);
};

// Reactor ladder. `threshold` is the temperament knob (§24.2): how much charge the
// AI insists on banking before it spends the bomb.
export function reactorDoctrine(threshold) {
  return {
    type: 'Reactor',
    threshold,
    rules: [
      // 1. Swarm wildcard: facing a line (3+), vent for AoE + spread Burn. In a
      //    2v2 this never fires, so it never starves the charge→Overload climb.
      {
        name: 'vent-the-swarm',
        when: and(enemyCountAtLeast(3), chargeAtLeast(REACTOR.backdraft.minCharge)),
        skillId: 'backdraft',
        select: allEnemies,
      },
      // 2. Payoff: enough charge banked → spend the bomb (×2 on a Burning target).
      {
        name: 'spend-the-bomb',
        when: chargeAtLeast(threshold),
        skillId: 'overload',
        select: overloadTarget,
      },
      // 3. Always: build charge and light a fuse. Never a dead turn (§23.1).
      {
        name: 'build-and-burn',
        when: always,
        skillId: 'chargeUp',
        select: biggestThreatEnemy,
      },
    ],
  };
}

// Bulwark ladder. `threshold` (temperament) is how much charge it banks before it
// sweeps the line shield. Cover a wounded ally first; otherwise dig in and build.
export function bulwarkDoctrine(threshold) {
  return {
    type: 'Bulwark',
    threshold,
    rules: [
      // 1. Emergency cover: an ally is hurting → vent for heavy block on them.
      {
        name: 'cover-the-wounded',
        when: and(allyBelowPct(0.5), chargeAtLeast(BULWARK.bodyguard.minCharge)),
        skillId: 'bodyguard',
        select: lowestHpAlly,
      },
      // 2. Payoff: enough charge banked → sweep a shield across the whole line.
      {
        name: 'shield-the-line',
        when: chargeAtLeast(threshold),
        skillId: 'aegis',
        select: allAllies,
      },
      // 3. Always: dig in — self block, build charge, chip. Never a dead turn.
      {
        name: 'dig-in',
        when: always,
        skillId: 'brace',
        select: biggestThreatEnemy,
      },
    ],
  };
}

// Mender ladder. Heals are wasted on the healthy, so the payoff/ward only fire
// when an ally is actually hurt; otherwise bank charge and chip with the builder.
export function menderDoctrine(threshold) {
  return {
    type: 'Mender',
    threshold,
    rules: [
      // 1. Payoff: charge banked AND someone's really hurt → big single-ally Bloom.
      {
        name: 'bloom-the-wounded',
        when: and(chargeAtLeast(threshold), allyBelowPct(0.6)),
        skillId: 'bloom',
        select: lowestHpAlly,
      },
      // 2. Wildcard: the WHOLE line is taking chip (2+ hurt) → regen Ward for all.
      //    Gated to multi-ally pressure so it doesn't starve Bloom's charge on a
      //    single scratch (Ward vents charge; Bloom needs it banked).
      {
        name: 'ward-the-line',
        when: and(chargeAtLeast(MENDER.ward.minCharge), alliesBelowPctCount(0.85, 2)),
        skillId: 'ward',
        select: allAllies,
      },
      // 3. Always: build charge, trickle a heal, chip. Never a dead turn.
      {
        name: 'tend-and-build',
        when: always,
        skillId: 'mend',
        select: biggestThreatEnemy,
      },
    ],
  };
}

// Booster ladder. Its whole job is making the carry hit harder, so it banks charge
// and dumps it onto the strongest ally as Overdrive. Resonate (spread Amp to the
// line) is gated to a full, pressured squad — like the Mender's Ward — so it never
// starves the single-target Overdrive in a small fight.
export function boosterDoctrine(threshold) {
  return {
    type: 'Booster',
    threshold,
    rules: [
      // 1. Payoff: charge banked → load the carry with Amp for their big swing.
      {
        name: 'overdrive-the-carry',
        when: chargeAtLeast(threshold),
        skillId: 'overdrive',
        select: strongestAlly,
      },
      // 2. Wildcard: a full line (3+) under pressure → spread Amp across everyone.
      //    Situational (not just charge-gated) so it doesn't bleed the charge that
      //    Overdrive needs banked.
      {
        name: 'resonate-the-line',
        when: and(
          chargeAtLeast(BOOSTER.resonate.minCharge),
          allyCountAtLeast(3),
          alliesBelowPctCount(0.9, 2),
        ),
        skillId: 'resonate',
        select: allAllies,
      },
      // 3. Always: prime the carry, build charge, chip. Never a dead turn.
      {
        name: 'prime-and-chip',
        when: always,
        skillId: 'prime',
        select: biggestThreatEnemy,
      },
    ],
  };
}

// Striker ladder. Banks charge for the Flurry barrage; if it's moving first this
// round it spends a Blitz for the initiative bonus instead. Relentless pressure on
// the biggest threat. (Blitz vents charge, so a Greedy Striker that always opens the
// round will Blitz every turn and rarely Flurry — temperament shapes which it is.)
export function strikerDoctrine(threshold) {
  return {
    type: 'Striker',
    threshold,
    rules: [
      // 1. Payoff: charge banked → unload the Flurry on the biggest threat.
      {
        name: 'unload-the-flurry',
        when: chargeAtLeast(threshold),
        skillId: 'flurry',
        select: biggestThreatEnemy,
      },
      // 2. Wildcard: opening the round → Blitz for the first-strike bonus.
      {
        name: 'blitz-on-initiative',
        when: and(isFirstAction(), chargeAtLeast(STRIKER.blitz.minCharge)),
        skillId: 'blitz',
        select: biggestThreatEnemy,
      },
      // 3. Always: jab — build tempo, two quick hits. Never a dead turn.
      {
        name: 'jab-and-build',
        when: always,
        skillId: 'jab',
        select: biggestThreatEnemy,
      },
    ],
  };
}

// Assassin ladder. Hunts the weakest enemy: banks charge for the Execute, but if a
// wounded target is already in reach it Ambushes to finish without waiting.
export function assassinDoctrine(threshold) {
  return {
    type: 'Assassin',
    threshold,
    rules: [
      // 1. Payoff: charge banked → Execute the weakest enemy (lethal if they're low).
      {
        name: 'execute-the-weak',
        when: chargeAtLeast(threshold),
        skillId: 'execute',
        select: lowestHpEnemy,
      },
      // 2. Wildcard: a wounded enemy is in reach → Ambush to finish them now.
      //    Situational (not just charge-gated) so it doesn't bleed Execute's charge.
      {
        name: 'ambush-the-wounded',
        when: and(chargeAtLeast(ASSASSIN.ambush.minCharge), enemyBelowPct(0.5)),
        skillId: 'ambush',
        select: lowestHpEnemy,
      },
      // 3. Always: mark — build, chip, set up the kill. Never a dead turn.
      {
        name: 'mark-and-build',
        when: always,
        skillId: 'mark',
        select: lowestHpEnemy,
      },
    ],
  };
}

// Warden ladder. Banks charge for the lockdown: facing a line (3+) it Cold Snaps to
// freeze everyone; otherwise spends Glaciate to lock the biggest threat; else chips.
export function wardenDoctrine(threshold) {
  return {
    type: 'Warden',
    threshold,
    rules: [
      {
        name: 'freeze-the-swarm',
        when: and(enemyCountAtLeast(3), chargeAtLeast(WARDEN.coldsnap.minCharge)),
        skillId: 'coldsnap',
        select: allEnemies,
      },
      {
        name: 'lock-the-threat',
        when: chargeAtLeast(threshold),
        skillId: 'glaciate',
        select: biggestThreatEnemy,
      },
      {
        name: 'chip-and-build',
        when: always,
        skillId: 'frostnip',
        select: biggestThreatEnemy,
      },
    ],
  };
}

// Hexer ladder. Banks charge to lay the big curse; facing a line (3+) it Blights to
// curse everyone; otherwise Dooms the biggest threat; else Jinxes to build + seed vuln.
export function hexerDoctrine(threshold) {
  return {
    type: 'Hexer',
    threshold,
    rules: [
      {
        name: 'blight-the-swarm',
        when: and(enemyCountAtLeast(3), chargeAtLeast(HEXER.blight.minCharge)),
        skillId: 'blight',
        select: allEnemies,
      },
      {
        name: 'doom-the-threat',
        when: chargeAtLeast(threshold),
        skillId: 'doom',
        select: biggestThreatEnemy,
      },
      {
        name: 'jinx-and-build',
        when: always,
        skillId: 'jinx',
        select: biggestThreatEnemy,
      },
    ],
  };
}

const DOCTRINE_BY_TYPE = {
  Reactor: reactorDoctrine,
  Bulwark: bulwarkDoctrine,
  Mender: menderDoctrine,
  Booster: boosterDoctrine,
  Striker: strikerDoctrine,
  Assassin: assassinDoctrine,
  Warden: wardenDoctrine,
  Hexer: hexerDoctrine,
};

// Resolve a unit's doctrine from its Type + temperament. The temperament maps to a
// single number (the payoff threshold) — one knob, three readable defenses (§24.2).
export function applyTemperament(type, temperament) {
  const build = DOCTRINE_BY_TYPE[type];
  if (!build) throw new Error(`No doctrine for Type: ${type}`);
  const threshold = TEMPERAMENT_THRESHOLD[temperament] ?? TEMPERAMENT_THRESHOLD.Balanced;
  return build(threshold);
}
