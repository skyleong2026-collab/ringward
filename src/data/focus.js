// Layer — Operator FOCUS (build-granted intervention budget, vC-P). See GDD §20.9.
//
// Interventions used to be a flat free grant (3 per battle). The vSP-C playtest
// verdict: a free button has no opportunity cost, so interventions "can't be
// valued." FOCUS fixes that by making the budget EARNED from your fielded squad
// instead of handed out:
//
//   FOCUS = 1 base
//         + 1 per fielded Echo        (Echo is the conduit for operator focus)
//         + 1 if any unit carries focus-granting gear (an extra channel)
//
// This is the north-star link (buildcraft → combat agency): bringing an Echo or
// a Resonator now BUYS intervention authority, at the cost of a squad/gear slot
// that could have been something else. A bare squad gets 1 — fewer than the old
// flat 3 — so the cost is real.
//
// A contract's environment still CAPS how much focus it tolerates
// (contract.modifier.interventionBudget). Final budget = min(build focus, cap).
// Suppression contracts ("Quiet the Signal" caps to 1) flatten everyone to their
// ceiling; permissive contracts let a focus build express its full read.
//
// Engine-safe: the engine never reads FOCUS — it only ever receives a budget
// number via the runner. Goldens are unaffected.
import { GEAR_BY_ID } from './gear.js';

export const BASE_FOCUS = 1;

// Break the build-granted focus into labelled parts (for the UI breakdown).
export function focusBreakdown(squad = []) {
  const echoes = squad.filter((u) => u.archetype === 'Echo').length;
  const hasFocusGear = squad.some((u) => u.gearId && GEAR_BY_ID[u.gearId]?.grantsFocus);
  const gearBonus = hasFocusGear ? 1 : 0;

  const parts = [{ label: 'Base', value: BASE_FOCUS }];
  if (echoes > 0) parts.push({ label: `Echo ×${echoes}`, value: echoes });
  if (gearBonus) parts.push({ label: 'Focus gear', value: gearBonus });

  return { total: BASE_FOCUS + echoes + gearBonus, parts, echoes, gearBonus };
}

// The build-granted focus number on its own (no contract cap).
export function buildFocus(squad = []) {
  return focusBreakdown(squad).total;
}

// Final per-battle budget: build focus, capped by what the contract permits.
// contractCeiling == null → no environmental cap (PvP, sparring, dungeons).
export function battleFocus(squad = [], contractCeiling = null) {
  const build = buildFocus(squad);
  if (contractCeiling == null) return build;
  return Math.min(build, contractCeiling);
}
