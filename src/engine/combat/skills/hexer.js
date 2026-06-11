import { HEXER, DOOM } from '../dials.js';
import { enemiesOf } from '../state.js';
import { dealDamage, applyVuln, applyPoison, applyDoom } from './combatMath.js';

// Does this Hexer carry any DOOM-path brand mod? (the path that brands a detonation).
const brandsDoom = (actor) => actor.mods?.doomMark || actor.mods?.hasten || actor.mods?.deathSentence || actor.mods?.inevitable || actor.mods?.armageddon;
// Lay a curse (+ DECAY riders) on one enemy. "Entropy" strips its shield + "Wither"/
// "Pandemic" lay a creeping rot. Opt-in — all default off, no golden curse is touched.
function curse(actor, e, amount) {
  if (actor.mods?.entropy) e.statuses.block = 0;
  if (actor.mods?.wither || actor.mods?.pandemic) applyPoison(e, 1);
  return applyVuln(e, amount);
}

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
      const amt = HEXER.jinx.vuln + (actor.mods?.hexmaster ? 1 : 0); // "Hexmaster": deeper curses
      const vulns = [curse(actor, target, amt)];
      // "Contagion" tree node: the curse also leaps to a second enemy. Opt-in.
      if (actor.mods?.jinxSpread && state) {
        const other = enemiesOf(state, actor).find((e) => e.uid !== target.uid);
        if (other) vulns.push(curse(actor, other, amt));
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
      const amt = HEXER.doom.vuln + (actor.mods?.hexmaster ? 2 : 0); // "Hexmaster": heavier curse
      // "Spreading Hex" / "Hexmaster" / "Pandemic": Doom curses the WHOLE enemy line. Opt-in.
      const wide = actor.mods?.doomAll || actor.mods?.hexmaster || actor.mods?.pandemic;
      const cursed = (wide && state) ? enemiesOf(state, actor) : [target];
      const hit = dealDamage(target, actor.atk * mult, actor);
      const vulns = cursed.map((e) => curse(actor, e, amt));
      // DOOM path: brand a delayed detonation onto the target — or the whole line (Armageddon).
      if (brandsDoom(actor) && state) {
        const brandTargets = actor.mods?.armageddon ? enemiesOf(state, actor) : [target];
        const timer = actor.mods?.hasten ? DOOM.timer - 1 : DOOM.timer;
        brandTargets.forEach((e) => {
          applyDoom(e, actor.atk * (actor.mods?.inevitable ? 1.5 : 1), timer);
          if (actor.mods?.deathSentence) e.doomSplash = true; // detonation brands the line
        });
      }
      return { hits: [hit], chargeSpent: spent, vulns };
    },
  },

  // Wildcard — vent HALF the charge to curse the whole enemy line (+ small line damage).
  blight: {
    id: 'blight',
    name: 'Blight',
    kind: 'wildcard',
    blurb: 'Spend half your charge to curse every enemy at once — the whole line takes more.',
    targetMode: 'allEnemies',
    canUse: (actor) => actor.charge >= HEXER.blight.minCharge,
    apply(actor, _targets, state) {
      const vented = Math.floor(actor.charge / 2);
      actor.charge -= vented;
      const line = enemiesOf(state, actor);
      const amt = HEXER.blight.vuln + (actor.mods?.hexmaster ? 1 : 0);
      const hits = line.map((e) => dealDamage(e, actor.atk * HEXER.blight.perCharge * vented, actor));
      const vulns = line.map((e) => curse(actor, e, amt));
      return { hits, chargeSpent: vented, vulns };
    },
  },
};
