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
    blurb: '+2 charge, trickle a heal to your most-hurt ally, and chip the target.',
    targetMode: 'enemy',
    canUse: () => true,
    apply(actor, [target], state) {
      const gain = MENDER.mend.chargeGain;
      actor.charge = Math.min(actor.maxCharge, actor.charge + gain);
      const wounded = mostWounded(actor, state);
      const heals = [heal(wounded, MENDER.mend.healNow, actor)];
      // "Lifebloom" upgrade also lays a regen ward on the healed ally. Opt-in — with
      // no mod the regen list is empty (== absent), so the golden stays byte-identical.
      const lifebloom = actor.mods?.mendRegen ?? 0;
      const regens = lifebloom > 0 ? [applyRegen(wounded, lifebloom)] : [];
      const hits = target ? [dealDamage(target, actor.atk * MENDER.mend.chipMult, actor)] : [];
      return { hits, heals, regens, chargeGained: gain };
    },
  },

  // Payoff — spend ALL charge for a big single-ally heal (bloom settles on them).
  bloom: {
    id: 'bloom',
    name: 'Bloom',
    kind: 'payoff',
    blurb: 'Spend ALL charge to pour a big heal into one ally. More charge, more healing.',
    targetMode: 'ally',
    canUse: (actor) => actor.charge >= MENDER.bloom.minCharge,
    apply(actor, [target], state) {
      const spent = actor.charge;
      actor.charge = 0;
      const amount = MENDER.bloom.base + MENDER.bloom.perCharge * spent;
      // "Full Bloom" upgrade: Bloom washes over the whole team at once.
      if (actor.mods?.bloomAll && state) {
        const heals = alliesOf(state, actor).map((a) => heal(a, amount, actor));
        return { hits: [], heals, chargeSpent: spent };
      }
      const ally = target || mostWounded(actor, state);
      return { hits: [], heals: [heal(ally, amount, actor)], chargeSpent: spent };
    },
  },

  // Wildcard — vent HALF the charge to lay a regen ward over the whole ally line.
  ward: {
    id: 'ward',
    name: 'Ward',
    kind: 'wildcard',
    blurb: 'Vent half your charge to lay a regen ward over the whole team.',
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
