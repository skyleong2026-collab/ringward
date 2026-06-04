import { REACTOR } from '../dials.js';
import { enemiesOf } from '../state.js';
import { dealDamage, applyBurn, isBurning } from './combatMath.js';

// Skills are the *content* of applyDecision (§26.2: the one place combat math lives).
// Each skill's apply() mutates state and returns a plain result the engine turns
// into one log/UI event. Damage/status helpers are shared (./combatMath.js).

// ─── Reactor (Fizzpop) — "hold or spend, tall or wide" (§23.5) ──────────────────
// Builder + charge-gated Payoff + Wildcard. Charge is the spine; the builder always
// also does something NOW so charging is never a dead turn (§23.1).

export const REACTOR_SKILLS = {
  // Builder — always usable, builds charge AND drips Burn + a chip right now.
  chargeUp: {
    id: 'chargeUp',
    name: 'Charge Up',
    kind: 'builder',
    blurb: 'Build 2 charge and singe the target — a little Burn, a little chip. Fuel for Overload.',
    targetMode: 'enemy', // one enemy
    canUse: () => true,
    apply(actor, [target]) {
      if (!target) return { hits: [], note: 'no target' };
      const gain = REACTOR.chargeUp.chargeGain;
      actor.charge = Math.min(actor.maxCharge, actor.charge + gain);
      applyBurn(target, REACTOR.chargeUp.burnApply);
      const hit = dealDamage(target, actor.atk * REACTOR.chargeUp.chipMult, actor);
      return { hits: [hit], chargeGained: gain, burned: [target.uid] };
    },
  },

  // Payoff — charge-gated big hit, ×2 vs a Burning target. Spends ALL charge.
  overload: {
    id: 'overload',
    name: 'Overload',
    kind: 'payoff',
    blurb: 'Dump ALL your charge into one massive hit — doubled if the target is on fire.',
    targetMode: 'enemy',
    canUse: (actor) => actor.charge >= REACTOR.overload.minCharge,
    apply(actor, [target]) {
      if (!target) return { hits: [], note: 'no target' };
      const spent = actor.charge;
      let mult = REACTOR.overload.base + REACTOR.overload.perCharge * spent;
      if (isBurning(target)) mult *= REACTOR.overload.burningBonus;
      actor.charge = 0;
      const hit = dealDamage(target, actor.atk * mult, actor);
      return { hits: [hit], chargeSpent: spent, amplifiedByBurn: isBurning(target) };
    },
  },

  // Wildcard — vent HALF the charge to hit the whole enemy line + spread Burn.
  backdraft: {
    id: 'backdraft',
    name: 'Backdraft',
    kind: 'wildcard',
    blurb: 'Blow off half your charge to hit every enemy at once and spread Burn.',
    targetMode: 'allEnemies',
    canUse: (actor) => actor.charge >= REACTOR.backdraft.minCharge,
    apply(actor, _targets, state) {
      const vented = Math.floor(actor.charge / 2);
      actor.charge -= vented;
      const line = enemiesOf(state, actor);
      const hits = line.map((e) => {
        applyBurn(e, REACTOR.backdraft.burnApply);
        return dealDamage(e, actor.atk * REACTOR.backdraft.perCharge * vented, actor);
      });
      return { hits, chargeSpent: vented, burned: line.map((e) => e.uid) };
    },
  },
};
