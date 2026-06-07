import { createRng } from '../rng.js';
import { MAX_CHARGE } from './dials.js';

// ─── Battle state ─────────────────────────────────────────────────────────────
// One mutable state object the engine and BOTH drivers read. The seeded RNG lives
// HERE so the AI driver stays a pure function of (state, doctrine, seed): every
// tie-break and selector draws from state.rng, never Math.random / wall-clock.

// A combat unit is an instance built from a roster creature (see roster.js).
function initUnit(creature, side, slot) {
  return {
    uid: `${side}${slot}`, // stable instance id within this battle
    id: creature.id,
    name: creature.name,
    type: creature.type, // Reactor / Booster / Assassin / Bulwark / Mender / Striker
    spriteId: creature.spriteId ?? creature.id, // UI only — never read by combat math
    side,
    slot,
    // maxHp defaults to hp (a fresh creature). A run can pass a separate maxHp so a
    // unit starts the next wave wounded (hp < maxHp) — carrying damage between fights.
    // Existing callers pass no maxHp, so maxHp === hp and goldens stay byte-identical.
    maxHp: creature.maxHp ?? creature.hp,
    hp: creature.hp,
    atk: creature.atk,
    speed: creature.speed,
    charge: creature.charge ?? 0, // a run "Primed" upgrade can start a unit charged
    maxCharge: creature.maxCharge ?? MAX_CHARGE,
    // burn=DoT, block=absorb, regen=heal-over-time, amp=dmg buff. The deep-tree
    // statuses below all default to 0/absent, so any unit that never has them touched
    // (every golden) reads exactly as before: poison=ramping DoT, freeze=skip-turn,
    // vuln=damage-taken curse, reflect=block-counter %, doom=delayed detonation timer.
    statuses: { burn: 0, block: 0, regen: 0, amp: 0, poison: 0, reflect: 0, doom: 0 },
    alive: true,
    skillIds: creature.skillIds.slice(),
    temperament: creature.temperament ?? 'Balanced', // only the AI side reads this
    mods: creature.mods ?? {}, // opt-in run-upgrade modifiers (dmgMult, healMult, …); {} = no-op
  };
}

export function createBattleState(squadA, squadB, seed) {
  const state = {
    seed,
    rng: createRng(seed),
    round: 1,
    units: {
      A: squadA.map((c, i) => initUnit(c, 'A', i)),
      B: squadB.map((c, i) => initUnit(c, 'B', i)),
    },
    firstActionDone: false, // for the Striker "first action of the round" condition
    log: [], // every emitted event, in order — this IS the golden transcript
  };
  // "Smolder" (Reactor CINDER capstone): a unit with the mod opens the fight with the
  // ENEMY line already burning. Opt-in — no creature carries `smolder` by default, so
  // the goldens build with burn 0 and stay byte-identical.
  applySmolder(state, 'A', 'B');
  applySmolder(state, 'B', 'A');
  return state;
}

function applySmolder(state, fromSide, toSide) {
  if (!state.units[fromSide].some((u) => u.mods?.smolder)) return;
  for (const e of state.units[toSide]) {
    e.statuses.burn = Math.min(SMOLDER_CAP, (e.statuses.burn || 0) + SMOLDER_STACKS);
  }
}
const SMOLDER_STACKS = 2;
const SMOLDER_CAP = 4; // matches BURN.maxStacks

// ─── Queries (all read-only; never mutate) ─────────────────────────────────────
export const otherSide = (side) => (side === 'A' ? 'B' : 'A');

export const livingOnSide = (state, side) =>
  state.units[side].filter((u) => u.alive); // kept in slot order

export const alliesOf = (state, actor) => livingOnSide(state, actor.side);
export const enemiesOf = (state, actor) => livingOnSide(state, otherSide(actor.side));

export const unitByUid = (state, uid) =>
  state.units.A.find((u) => u.uid === uid) || state.units.B.find((u) => u.uid === uid) || null;

// One side is wiped → battle is over.
export function battleOver(state) {
  return livingOnSide(state, 'A').length === 0 || livingOnSide(state, 'B').length === 0;
}

// §23.1: speed decides ONLY which side's block resolves first. Never extra turns,
// never damage. Ties broken by the seeded RNG so replays are identical.
export function sideInitiative(state) {
  // "Blur" (Striker TEMPO keystone): a side fielding a Blur unit always moves first.
  // Opt-in — no golden unit carries the mod, so both sides read false and this falls
  // straight through to the speed compare below, byte-identical.
  const hasBlur = (side) => livingOnSide(state, side).some((u) => u.mods?.blur);
  if (hasBlur('A') !== hasBlur('B')) return hasBlur('A') ? 'A' : 'B';
  const sum = (side) => livingOnSide(state, side).reduce((s, u) => s + u.speed, 0);
  const a = sum('A');
  const b = sum('B');
  if (a !== b) return a > b ? 'A' : 'B';
  return state.rng() < 0.5 ? 'A' : 'B';
}
