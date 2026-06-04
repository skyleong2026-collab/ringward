import { ASSASSIN } from '../dials.js';
import { dealDamage } from './combatMath.js';

// ─── Assassin — "execute: the weaker the target, the harder you hit" (§23) ───────
// Same charge spine; the identity is a conditional multiplier — a payoff that spikes
// against a wounded target. Reuses the shared damage primitive (no new status); the
// "finish them" fantasy lives entirely in the threshold check. Passes `actor` so a
// Booster's Amp rides the kill too.

const isWounded = (u, pct) => !!u && u.hp / u.maxHp < pct;

export const ASSASSIN_SKILLS = {
  // Builder — build charge and a measured strike, harder on an already-hurt target.
  mark: {
    id: 'mark',
    name: 'Mark',
    kind: 'builder',
    blurb: '+2 charge and a measured strike — harder on a target that is already hurt.',
    targetMode: 'enemy',
    canUse: () => true,
    apply(actor, [target]) {
      const gain = ASSASSIN.mark.chargeGain;
      actor.charge = Math.min(actor.maxCharge, actor.charge + gain);
      if (!target) return { hits: [], chargeGained: gain };
      let mult = ASSASSIN.mark.hitMult;
      if (isWounded(target, ASSASSIN.mark.woundedPct)) mult *= ASSASSIN.mark.woundedBonus;
      const hit = dealDamage(target, actor.atk * mult, actor);
      return { hits: [hit], chargeGained: gain };
    },
  },

  // Payoff — spend ALL charge for a lethal blow; devastating below the threshold.
  execute: {
    id: 'execute',
    name: 'Execute',
    kind: 'payoff',
    blurb: 'Spend all charge for a lethal blow — devastating against a wounded target.',
    targetMode: 'enemy',
    canUse: (actor) => actor.charge >= ASSASSIN.execute.minCharge,
    apply(actor, [target]) {
      const spent = actor.charge;
      actor.charge = 0;
      if (!target) return { hits: [], chargeSpent: spent };
      let mult = ASSASSIN.execute.base + ASSASSIN.execute.perCharge * spent;
      // "Hunter's Mark" widens the kill-zone. Opt-in — adds 0 → threshold unchanged.
      const thr = ASSASSIN.execute.executeThreshold + (actor.mods?.executeWindow ?? 0);
      const executed = isWounded(target, thr);
      if (executed) mult *= ASSASSIN.execute.executeBonus;
      const hit = dealDamage(target, actor.atk * mult, actor);
      return { hits: [hit], chargeSpent: spent, executed };
    },
  },

  // Wildcard — vent HALF the charge to lunge at the weakest enemy; a finisher.
  ambush: {
    id: 'ambush',
    name: 'Ambush',
    kind: 'wildcard',
    blurb: 'Vent half your charge to lunge at the weakest enemy — a finisher.',
    targetMode: 'enemy',
    canUse: (actor) => actor.charge >= ASSASSIN.ambush.minCharge,
    apply(actor, [target]) {
      const vented = Math.floor(actor.charge / 2);
      actor.charge -= vented;
      if (!target) return { hits: [], chargeSpent: vented };
      let mult = ASSASSIN.ambush.hitMult * Math.max(1, vented);
      if (isWounded(target, ASSASSIN.ambush.woundedPct)) mult *= ASSASSIN.ambush.woundedBonus;
      const hit = dealDamage(target, actor.atk * mult, actor);
      return { hits: [hit], chargeSpent: vented };
    },
  },
};
