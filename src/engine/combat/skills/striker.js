import { STRIKER } from '../dials.js';
import { dealDamage } from './combatMath.js';

// ─── Striker — "tempo: hit fast, hit twice, reward moving first" (§23) ───────────
// Same charge spine, but the identity is the SHAPE of its damage: many small hits
// instead of one big one, plus an initiative bonus. It reuses the shared damage
// primitive (no new status) — and because every hit passes `actor`, a Booster's Amp
// stacks across the WHOLE flurry, the seam's first real combo.

export const STRIKER_SKILLS = {
  // Builder — build charge and land a quick two-hit. Tempo never idles.
  jab: {
    id: 'jab',
    name: 'Jab',
    kind: 'builder',
    blurb: '+2 charge and a quick two-hit on the target. Keep the tempo.',
    targetMode: 'enemy',
    canUse: () => true,
    apply(actor, [target]) {
      const gain = STRIKER.jab.chargeGain;
      actor.charge = Math.min(actor.maxCharge, actor.charge + gain);
      if (!target) return { hits: [], chargeGained: gain };
      const hits = [];
      for (let i = 0; i < STRIKER.jab.hits; i++) {
        hits.push(dealDamage(target, actor.atk * STRIKER.jab.hitMult, actor));
      }
      return { hits, chargeGained: gain };
    },
  },

  // Payoff — spend ALL charge for a barrage; more charge = more hits.
  flurry: {
    id: 'flurry',
    name: 'Flurry',
    kind: 'payoff',
    blurb: 'Spend all charge for a barrage of fast hits. More charge, more hits.',
    targetMode: 'enemy',
    canUse: (actor) => actor.charge >= STRIKER.flurry.minCharge,
    apply(actor, [target]) {
      const spent = actor.charge;
      actor.charge = 0;
      if (!target) return { hits: [], chargeSpent: spent };
      const count = Math.min(STRIKER.flurry.maxHits, STRIKER.flurry.baseHits + STRIKER.flurry.hitsPerCharge * spent);
      const hits = [];
      for (let i = 0; i < count; i++) {
        hits.push(dealDamage(target, actor.atk * STRIKER.flurry.hitMult, actor));
      }
      return { hits, chargeSpent: spent, flurryHits: count };
    },
  },

  // Wildcard — vent HALF the charge for a hard strike, extra vicious moving first.
  blitz: {
    id: 'blitz',
    name: 'Blitz',
    kind: 'wildcard',
    blurb: 'Vent half your charge for a hard strike — extra vicious if you move first.',
    targetMode: 'enemy',
    canUse: (actor) => actor.charge >= STRIKER.blitz.minCharge,
    apply(actor, [target], state) {
      const vented = Math.floor(actor.charge / 2);
      actor.charge -= vented;
      if (!target) return { hits: [], chargeSpent: vented };
      const first = !state.firstActionDone; // the round's opening move (§24 isFirstAction)
      let mult = STRIKER.blitz.hitMult * Math.max(1, vented);
      if (first) mult *= STRIKER.blitz.firstStrikeBonus;
      const hit = dealDamage(target, actor.atk * mult, actor);
      return { hits: [hit], chargeSpent: vented, firstStrike: first };
    },
  },
};
