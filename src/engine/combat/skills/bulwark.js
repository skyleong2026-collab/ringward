import { BULWARK } from '../dials.js';
import { alliesOf, enemiesOf } from '../state.js';
import { dealDamage, addBlock, applyRegen, seedReflect, applyVuln } from './combatMath.js';

// The most-wounded living ally (by HP fraction) — the natural cover target.
const mostWounded = (allies) => allies.reduce((w, a) => (a.hp / a.maxHp < w.hp / w.maxHp ? a : w), allies[0]);

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
    blurb: 'Set the wall where you point (yourself by default), +2 charge, and chip.',
    targetMode: 'enemy',
    allyAim: true, // "Move the wall": a human can tap an ally to place the shield (UI-only flag)
    canUse: () => true,
    apply(actor, [target], state) {
      const gain = BULWARK.brace.chargeGain;
      actor.charge = Math.min(actor.maxCharge, actor.charge + gain);
      // "Move the wall" (manual verb): a side-A human can tap an ALLY to set the wall in
      // front of THEM (it MOVES — the Bulwark doesn't also keep one) ahead of a telegraphed
      // hit; the chip then falls to the lowest-HP enemy. "Aegis Reflex" (braceTeam) covers
      // the whole line, so it absorbs the choice. The AI never targets an ally, so the
      // dig-in path — the recipient list [actor] — stays byte-identical in every transcript.
      const aimedAlly = !!target && target.side === actor.side && actor.side === 'A';
      const recipients = (actor.mods?.braceTeam && state) ? alliesOf(state, actor) : (aimedAlly ? [target] : [actor]);
      const shields = recipients.map((a) => addBlock(a, BULWARK.brace.blockGain, actor));
      recipients.forEach((a) => seedReflect(a, actor)); // RETRIBUTION: shielded allies counter
      // "Intercept" (GUARDIAN): also slam cover onto the most-wounded ally — take the blow.
      if (actor.mods?.intercept && state) {
        const hurt = mostWounded(alliesOf(state, actor));
        if (hurt && !recipients.includes(hurt)) { shields.push(addBlock(hurt, BULWARK.brace.blockGain, actor)); seedReflect(hurt, actor); }
      }
      // "Iron Bastion" upgrade: Brace also seeds regen on everyone it shields.
      const regens = (actor.mods?.braceRegen) ? recipients.map((a) => applyRegen(a, 1)) : [];
      // Chip the tapped enemy normally; when the wall was aimed at an ally, chip the
      // lowest-HP enemy instead, so a placed wall is never a dead turn.
      let chipTarget = target;
      if (aimedAlly) { const foes = enemiesOf(state, actor); chipTarget = foes.length ? foes.reduce((w, e) => (e.hp < w.hp ? e : w), foes[0]) : null; }
      // "Heavy Hold" (RETRIBUTION): the chip bites harder the more block you're holding.
      const heavy = actor.mods?.heavyHold ? (1 + Math.min(1, (actor.statuses.block || 0) / 200)) : 1;
      const hits = chipTarget ? [dealDamage(chipTarget, actor.atk * BULWARK.brace.chipMult * heavy, actor)] : [];
      // "Anvil Mark" (prototype, vF-?): Brace also MARKS the chipped enemy with vulnerability so the
      // carries hit it harder — the tank contributes TEMPO, not just defense. Opt-in via
      // mods.braceMark (stack count); 0/undefined = byte-identical, every golden untouched.
      if (actor.mods?.braceMark && chipTarget) applyVuln(chipTarget, actor.mods.braceMark);
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
      // "Bastion Wall" keystone hardens every shield by half again.
      const mult = actor.mods?.bastion ? 1.5 : 1;
      const shields = line.map((a) => addBlock(a, BULWARK.aegis.blockPerCharge * spent * mult, actor));
      line.forEach((a) => seedReflect(a, actor));
      // "Overbank": the wall also banks a regenerating barrier on the whole team.
      const regens = actor.mods?.overbank ? line.map((a) => applyRegen(a, 1)) : [];
      return { hits: [], chargeSpent: spent, shields, regens };
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
      seedReflect(ally, actor); // RETRIBUTION: the covered ally throws blows back
      return { hits: [], chargeSpent: vented, shields: [shield] };
    },
  },
};
