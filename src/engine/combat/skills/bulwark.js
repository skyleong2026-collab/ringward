import { BULWARK } from '../dials.js';
import { alliesOf } from '../state.js';
import { dealDamage, addBlock, applyRegen } from './combatMath.js';

// ─── Bulwark — "the wall: charge into shields, not damage" (§23) ────────────────
// Same charge spine as Reactor, but the payoff is DEFENSE: it banks charge and
// spends it as block across the squad. Proves the §26 seam isn't damage-only —
// ally-targeting + a non-damage payoff run through the exact same engine path.

export const BULWARK_SKILLS = {
  // Builder — shield self now, build charge, and still chip the enemy.
  brace: {
    id: 'brace',
    name: 'Brace',
    kind: 'builder',
    blurb: 'Dig in: +2 charge, raise a shield on yourself, and chip the target.',
    targetMode: 'enemy',
    canUse: () => true,
    apply(actor, [target], state) {
      const gain = BULWARK.brace.chargeGain;
      actor.charge = Math.min(actor.maxCharge, actor.charge + gain);
      // "Aegis Reflex" upgrade extends the self-shield to the whole line. Opt-in —
      // with no mod the recipient list is just [actor], byte-identical to before.
      const recipients = (actor.mods?.braceTeam && state) ? alliesOf(state, actor) : [actor];
      const shields = recipients.map((a) => addBlock(a, BULWARK.brace.blockGain, actor));
      // "Iron Bastion" upgrade: Brace also seeds regen on everyone it shields.
      const regens = (actor.mods?.braceRegen) ? recipients.map((a) => applyRegen(a, 1)) : [];
      const hits = target ? [dealDamage(target, actor.atk * BULWARK.brace.chipMult, actor)] : [];
      return { hits, chargeGained: gain, shields, regens };
    },
  },

  // Payoff — spend ALL charge to sweep a shield across the whole ally line.
  aegis: {
    id: 'aegis',
    name: 'Aegis',
    kind: 'payoff',
    blurb: 'Spend ALL charge to throw a shield over your whole team. More charge, more block.',
    targetMode: 'allAllies',
    canUse: (actor) => actor.charge >= BULWARK.aegis.minCharge,
    apply(actor, _targets, state) {
      const spent = actor.charge;
      actor.charge = 0;
      const line = alliesOf(state, actor);
      const shields = line.map((a) => addBlock(a, BULWARK.aegis.blockPerCharge * spent, actor));
      return { hits: [], chargeSpent: spent, shields };
    },
  },

  // Wildcard — vent HALF the charge to throw heavy cover on one ally.
  bodyguard: {
    id: 'bodyguard',
    name: 'Bodyguard',
    kind: 'wildcard',
    blurb: 'Vent half your charge to slam a heavy shield onto one ally — cover the wounded.',
    targetMode: 'ally',
    canUse: (actor) => actor.charge >= BULWARK.bodyguard.minCharge,
    apply(actor, [target]) {
      const vented = Math.floor(actor.charge / 2);
      actor.charge -= vented;
      const ally = target || actor;
      const shield = addBlock(ally, BULWARK.bodyguard.blockPerCharge * vented, actor);
      return { hits: [], chargeSpent: vented, shields: [shield] };
    },
  },
};
