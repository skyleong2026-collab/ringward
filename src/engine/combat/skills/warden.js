import { WARDEN } from '../dials.js';
import { enemiesOf } from '../state.js';
import { dealDamage, applyFreeze } from './combatMath.js';

// ─── Warden — "control: charge into FREEZE, not damage" (§ new Type) ─────────────
// The first denial Type. Low attack; its value is taking the enemy's turns away.
// Same charge spine as everyone else (§23.1) so it slots into the seam with no
// engine change beyond the freeze status itself. Builder banks + chips; payoff
// locks one enemy solid; wildcard briefly freezes the whole line.

export const WARDEN_SKILLS = {
  // Builder — bank charge and a cold chip. Hold the freeze for Glaciate.
  frostnip: {
    id: 'frostnip',
    name: 'Frost Nip',
    kind: 'builder',
    blurb: '+2 charge and a cold chip. Bank it for a Glaciate.',
    targetMode: 'enemy',
    canUse: () => true,
    apply(actor, [target]) {
      const gain = WARDEN.frostnip.chargeGain;
      actor.charge = Math.min(actor.maxCharge, actor.charge + gain);
      if (!target) return { hits: [], chargeGained: gain };
      const hit = dealDamage(target, actor.atk * WARDEN.frostnip.chipMult, actor);
      // "Frostbite" tree node makes the builder itself apply a freeze. Opt-in.
      const freezes = actor.mods?.nipFreeze ? [applyFreeze(target, 1)] : [];
      return { hits: [hit], chargeGained: gain, freezes };
    },
  },

  // Payoff — spend ALL charge to freeze one enemy solid (skips its turns) + hit it.
  glaciate: {
    id: 'glaciate',
    name: 'Glaciate',
    kind: 'payoff',
    blurb: 'Spend all charge to freeze one enemy solid — it skips its turns — and strike it.',
    targetMode: 'enemy',
    canUse: (actor) => actor.charge >= WARDEN.glaciate.minCharge,
    apply(actor, [target]) {
      const spent = actor.charge;
      actor.charge = 0;
      if (!target) return { hits: [], chargeSpent: spent };
      const mult = WARDEN.glaciate.base + WARDEN.glaciate.perCharge * spent;
      const hit = dealDamage(target, actor.atk * mult, actor);
      // "Deep Freeze" tree node extends every freeze. Opt-in — default 0.
      const stacks = WARDEN.glaciate.freezeStacks + (actor.mods?.freezeBonus ?? 0);
      const fr = applyFreeze(target, stacks);
      return { hits: [hit], chargeSpent: spent, freezes: [fr] };
    },
  },

  // Wildcard — vent HALF the charge to freeze the whole enemy line for a turn.
  coldsnap: {
    id: 'coldsnap',
    name: 'Cold Snap',
    kind: 'wildcard',
    blurb: 'Vent half your charge to freeze the whole enemy line for a turn.',
    targetMode: 'allEnemies',
    canUse: (actor) => actor.charge >= WARDEN.coldsnap.minCharge,
    apply(actor, _targets, state) {
      const vented = Math.floor(actor.charge / 2);
      actor.charge -= vented;
      const line = enemiesOf(state, actor);
      const stacks = WARDEN.coldsnap.freezeStacks + (actor.mods?.freezeBonus ?? 0);
      const hits = line.map((e) => dealDamage(e, actor.atk * WARDEN.coldsnap.perCharge * vented, actor));
      const freezes = line.map((e) => applyFreeze(e, stacks));
      return { hits, chargeSpent: vented, freezes };
    },
  },
};
