import { BOOSTER } from '../dials.js';
import { alliesOf } from '../state.js';
import { dealDamage, applyAmp } from './combatMath.js';

// ─── Booster — "the amplifier: charge into an ally's damage, not your own" (§23) ──
// Same charge spine, but the payoff lands on a TEAMMATE: it stacks Amp (an outgoing-
// damage buff) so the squad's carry hits harder. This is the seam's first cross-unit
// effect — it proves the engine can route a buff onto someone other than the actor,
// and it's why the world calls these grunlings the ones that "amplify everything."

// The carry: the highest-attack living ally (the swing worth amplifying). Includes
// self, so a lone Booster still has a legal target — it just primes itself.
function bestCarry(actor, state) {
  const allies = alliesOf(state, actor);
  return allies.reduce((best, a) => (a.atk > best.atk ? a : best), allies[0]);
}

export const BOOSTER_SKILLS = {
  // Builder — build charge, prime the carry with a stack of Amp, and still chip.
  prime: {
    id: 'prime',
    name: 'Prime',
    kind: 'builder',
    blurb: '+2 charge, lend a stack of Amp to your strongest ally, and chip the target.',
    targetMode: 'enemy', // select() points at the chip target; the buff picks the carry
    canUse: () => true,
    apply(actor, [target], state) {
      const gain = BOOSTER.prime.chargeGain;
      actor.charge = Math.min(actor.maxCharge, actor.charge + gain);
      const amps = [applyAmp(bestCarry(actor, state), BOOSTER.prime.ampStacks)];
      const hits = target ? [dealDamage(target, actor.atk * BOOSTER.prime.chipMult, actor)] : [];
      return { hits, amps, chargeGained: gain };
    },
  },

  // Payoff — spend ALL charge to load the carry up with Amp. More charge, more Amp.
  overdrive: {
    id: 'overdrive',
    name: 'Overdrive',
    kind: 'payoff',
    blurb: 'Spend all charge to load one ally with Amp — set up their big swing.',
    targetMode: 'ally',
    canUse: (actor) => actor.charge >= BOOSTER.overdrive.minCharge,
    apply(actor, [target], state) {
      const spent = actor.charge;
      actor.charge = 0;
      const ally = target || bestCarry(actor, state);
      const stacks = BOOSTER.overdrive.base + BOOSTER.overdrive.perCharge * spent;
      return { hits: [], amps: [applyAmp(ally, stacks)], chargeSpent: spent };
    },
  },

  // Wildcard — vent HALF the charge to spread a stack of Amp across the whole line.
  resonate: {
    id: 'resonate',
    name: 'Resonate',
    kind: 'wildcard',
    blurb: 'Vent half your charge to lend Amp to the whole ally line at once.',
    targetMode: 'allAllies',
    canUse: (actor) => actor.charge >= BOOSTER.resonate.minCharge,
    apply(actor, _targets, state) {
      const vented = Math.floor(actor.charge / 2);
      actor.charge -= vented;
      const stacks = Math.max(1, BOOSTER.resonate.ampPerVent * vented);
      const line = alliesOf(state, actor);
      const amps = line.map((a) => applyAmp(a, stacks));
      return { hits: [], amps, chargeSpent: vented };
    },
  },
};
