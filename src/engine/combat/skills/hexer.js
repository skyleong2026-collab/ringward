import { HEXER } from '../dials.js';
import { enemiesOf } from '../state.js';
import { dealDamage, applyVuln } from './combatMath.js';

// ─── Hexer — "curse: charge into VULNERABILITY, not raw damage" (§ new Type) ──────
// The team multiplier. Low attack; it makes the enemy take more from the WHOLE squad.
// Same charge spine as everyone else. Builder seeds a curse + chips; payoff lays a
// heavy curse (whole line with the Spreading Hex bend); wildcard curses the line.

export const HEXER_SKILLS = {
  // Builder — bank charge, a cursed chip, and seed 1 vulnerability.
  jinx: {
    id: 'jinx',
    name: 'Jinx',
    kind: 'builder',
    blurb: '+2 charge, a cursed chip, and a stack of vulnerability — the target takes more from everyone.',
    targetMode: 'enemy',
    canUse: () => true,
    apply(actor, [target], state) {
      const gain = HEXER.jinx.chargeGain;
      actor.charge = Math.min(actor.maxCharge, actor.charge + gain);
      if (!target) return { hits: [], chargeGained: gain };
      const hit = dealDamage(target, actor.atk * HEXER.jinx.chipMult, actor);
      const vulns = [applyVuln(target, HEXER.jinx.vuln)];
      // "Contagion" tree node: the curse also leaps to a second enemy. Opt-in.
      if (actor.mods?.jinxSpread && state) {
        const other = enemiesOf(state, actor).find((e) => e.uid !== target.uid);
        if (other) vulns.push(applyVuln(other, HEXER.jinx.vuln));
      }
      return { hits: [hit], chargeGained: gain, vulns };
    },
  },

  // Payoff — spend ALL charge for a heavy curse (+ damage). Whole line with Spreading Hex.
  doom: {
    id: 'doom',
    name: 'Doom',
    kind: 'payoff',
    blurb: 'Spend all charge to lay a heavy curse on one enemy and strike it — it takes far more from your squad.',
    targetMode: 'enemy',
    canUse: (actor) => actor.charge >= HEXER.doom.minCharge,
    apply(actor, [target], state) {
      const spent = actor.charge;
      actor.charge = 0;
      if (!target) return { hits: [], chargeSpent: spent };
      const mult = HEXER.doom.base + HEXER.doom.perCharge * spent;
      // "Spreading Hex" tree node: Doom curses the WHOLE enemy line. Opt-in.
      if (actor.mods?.doomAll && state) {
        const line = enemiesOf(state, actor);
        const vulns = line.map((e) => applyVuln(e, HEXER.doom.vuln));
        const hit = dealDamage(target, actor.atk * mult, actor);
        return { hits: [hit], chargeSpent: spent, vulns };
      }
      const hit = dealDamage(target, actor.atk * mult, actor);
      const fr = applyVuln(target, HEXER.doom.vuln);
      return { hits: [hit], chargeSpent: spent, vulns: [fr] };
    },
  },

  // Wildcard — vent HALF the charge to curse the whole enemy line (+ small line damage).
  blight: {
    id: 'blight',
    name: 'Blight',
    kind: 'wildcard',
    blurb: 'Vent half your charge to curse every enemy at once — the whole line takes more.',
    targetMode: 'allEnemies',
    canUse: (actor) => actor.charge >= HEXER.blight.minCharge,
    apply(actor, _targets, state) {
      const vented = Math.floor(actor.charge / 2);
      actor.charge -= vented;
      const line = enemiesOf(state, actor);
      const hits = line.map((e) => dealDamage(e, actor.atk * HEXER.blight.perCharge * vented, actor));
      const vulns = line.map((e) => applyVuln(e, HEXER.blight.vuln));
      return { hits, chargeSpent: vented, vulns };
    },
  },
};
