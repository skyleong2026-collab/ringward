import { MENDER } from '../dials.js';
import { alliesOf } from '../state.js';
import { dealDamage, heal, applyRegen } from './combatMath.js';

// ─── Mender — "sustain: charge into healing" (§23) ──────────────────────────────
// Same charge spine; the payoff is a HEAL. Adds the last missing combat primitive
// (heal) + a regen status — all through the one engine path. Proves a Type can win
// by outlasting rather than out-damaging.

// The most-wounded living ally (by missing HP); the natural heal target.
function mostWounded(actor, state) {
  const allies = alliesOf(state, actor);
  return allies.reduce((worst, a) => (a.hp < worst.hp ? a : worst), allies[0]);
}

export const MENDER_SKILLS = {
  // Builder — build charge, trickle a heal onto the wounded, and still chip.
  mend: {
    id: 'mend',
    name: 'Mend',
    kind: 'builder',
    blurb: '+2 charge, trickle-heal your most-wounded ally, and chip the target.',
    targetMode: 'enemy',
    canUse: () => true,
    apply(actor, [target], state) {
      const gain = MENDER.mend.chargeGain;
      actor.charge = Math.min(actor.maxCharge, actor.charge + gain);
      const heals = [heal(mostWounded(actor, state), MENDER.mend.healNow)];
      const hits = target ? [dealDamage(target, actor.atk * MENDER.mend.chipMult, actor)] : [];
      return { hits, heals, chargeGained: gain };
    },
  },

  // Payoff — spend ALL charge for a big single-ally heal (bloom settles on them).
  bloom: {
    id: 'bloom',
    name: 'Bloom',
    kind: 'payoff',
    blurb: 'Spend all charge to heal one ally hard. More charge, more healing.',
    targetMode: 'ally',
    canUse: (actor) => actor.charge >= MENDER.bloom.minCharge,
    apply(actor, [target], state) {
      const spent = actor.charge;
      actor.charge = 0;
      const ally = target || mostWounded(actor, state);
      const amount = MENDER.bloom.base + MENDER.bloom.perCharge * spent;
      return { hits: [], heals: [heal(ally, amount)], chargeSpent: spent };
    },
  },

  // Wildcard — vent HALF the charge to lay a regen ward over the whole ally line.
  ward: {
    id: 'ward',
    name: 'Ward',
    kind: 'wildcard',
    blurb: 'Vent half your charge to put a healing ward (regen) on the whole line.',
    targetMode: 'allAllies',
    canUse: (actor) => actor.charge >= MENDER.ward.minCharge,
    apply(actor, _targets, state) {
      const vented = Math.floor(actor.charge / 2);
      actor.charge -= vented;
      const stacks = Math.max(1, MENDER.ward.regenPerVent * vented);
      const line = alliesOf(state, actor);
      const regens = line.map((a) => applyRegen(a, stacks));
      return { hits: [], regens, chargeSpent: vented };
    },
  },
};
