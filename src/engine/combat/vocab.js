import { enemiesOf, alliesOf } from './state.js';

// ─── AI vocabulary (§24) ─────────────────────────────────────────────────────
// The readable words a doctrine ladder is written in: CONDITIONS (predicates that
// decide whether a rule fires) and SELECTORS (which units a chosen skill targets).
// Every tie-break draws from state.rng so the AI is a pure function of (state,
// doctrine, seed) — no Math.random, no wall-clock (§26.4 purity guardrail).

// Pick the single extreme unit by keyFn; ties broken by the seeded RNG. Returns a
// uid array (engine targets are always lists) — empty if there's nothing to pick.
function pickTied(units, keyFn, dir, rng) {
  if (units.length === 0) return [];
  let best = dir === 'min' ? Infinity : -Infinity;
  for (const u of units) {
    const k = keyFn(u);
    if (dir === 'min' ? k < best : k > best) best = k;
  }
  const tied = units.filter((u) => keyFn(u) === best);
  const chosen = tied.length === 1 ? tied[0] : tied[Math.floor(rng() * tied.length)];
  return [chosen.uid];
}

// ── Conditions: (actor, state) -> boolean ──
export const always = () => true;
export const chargeAtLeast = (n) => (actor) => actor.charge >= n;
export const enemyCountAtLeast = (n) => (actor, state) => enemiesOf(state, actor).length >= n;
export const selfBelowPct = (p) => (actor) => actor.hp / actor.maxHp < p;
export const enemyBelowPct = (p) => (actor, state) =>
  enemiesOf(state, actor).some((e) => e.hp / e.maxHp < p);
export const allyBelowPct = (p) => (actor, state) =>
  alliesOf(state, actor).some((a) => a.hp / a.maxHp < p);
export const alliesBelowPctCount = (p, n) => (actor, state) =>
  alliesOf(state, actor).filter((a) => a.hp / a.maxHp < p).length >= n;
export const allyCountAtLeast = (n) => (actor, state) => alliesOf(state, actor).length >= n;
export const isFirstAction = () => (actor, state) => !state.firstActionDone;
export const anyEnemyHasStatus = (status) => (actor, state) =>
  enemiesOf(state, actor).some((e) => (e.statuses[status] || 0) > 0);
export const and = (...conds) => (actor, state) => conds.every((c) => c(actor, state));

// ── Selectors: (actor, state) -> uid[] ──
export const lowestHpEnemy = (actor, state) =>
  pickTied(enemiesOf(state, actor), (u) => u.hp, 'min', state.rng);

export const biggestThreatEnemy = (actor, state) =>
  pickTied(enemiesOf(state, actor), (u) => u.atk, 'max', state.rng);

export const lowestHpBurningEnemy = (actor, state) =>
  pickTied(enemiesOf(state, actor).filter((e) => (e.statuses.burn || 0) > 0), (u) => u.hp, 'min', state.rng);

export const lowestHpAlly = (actor, state) =>
  pickTied(alliesOf(state, actor), (u) => u.hp, 'min', state.rng);

export const highestChargeAlly = (actor, state) =>
  pickTied(alliesOf(state, actor), (u) => u.charge, 'max', state.rng);

export const strongestAlly = (actor, state) =>
  pickTied(alliesOf(state, actor), (u) => u.atk, 'max', state.rng);

export const selfTarget = (actor) => [actor.uid];

export const allEnemies = (actor, state) => enemiesOf(state, actor).map((u) => u.uid);

export const allAllies = (actor, state) => alliesOf(state, actor).map((u) => u.uid);
