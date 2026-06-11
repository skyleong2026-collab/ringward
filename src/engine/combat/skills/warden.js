import { WARDEN } from '../dials.js';
import { enemiesOf } from '../state.js';
import { dealDamage, applyFreeze, applyVuln, applyPoison } from './combatMath.js';

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
    blurb: '+2 charge and a cold chip. Save the charge — Glaciate is what it\'s for.',
    targetMode: 'enemy',
    canUse: () => true,
    apply(actor, [target]) {
      const gain = WARDEN.frostnip.chargeGain;
      actor.charge = Math.min(actor.maxCharge, actor.charge + gain);
      if (!target) return { hits: [], chargeGained: gain };
      const hit = dealDamage(target, actor.atk * WARDEN.frostnip.chipMult, actor);
      // "Frostbite" tree node makes the builder itself apply a freeze. Opt-in.
      const freezes = actor.mods?.nipFreeze ? [applyFreeze(target, 1)] : [];
      // "Hush" (BLIZZARD): the chilled go brittle — they take more from everyone.
      if (actor.mods?.hush) applyVuln(target, 1);
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
    apply(actor, [target], state) {
      const spent = actor.charge;
      actor.charge = 0;
      if (!target) return { hits: [], chargeSpent: spent };
      const mult = WARDEN.glaciate.base + WARDEN.glaciate.perCharge * spent;
      const hit = dealDamage(target, actor.atk * mult, actor);
      // "Deep Freeze" extends every freeze; "Absolute Zero" keystone maxes it out.
      let stacks = WARDEN.glaciate.freezeStacks + (actor.mods?.freezeBonus ?? 0);
      if (actor.mods?.absoluteZero) stacks = 3;
      const freezes = [applyFreeze(target, stacks)];
      // "Numb" (BLIZZARD): the cold also slows the enemy beside the target.
      if (actor.mods?.numb && state) { const other = enemiesOf(state, actor).find((e) => e.uid !== target.uid); if (other) freezes.push(applyFreeze(other, 1)); }
      // "Silence" (BLIZZARD): a frozen enemy is drained — it cannot build to its payoff.
      if (actor.mods?.silence) target.charge = 0;
      // "Brittle" (BLIZZARD): the deep freeze leaves frost shards — a lingering DoT.
      if (actor.mods?.brittle) applyPoison(target, 2);
      return { hits: [hit], chargeSpent: spent, freezes };
    },
  },

  // Wildcard — vent HALF the charge to freeze the whole enemy line for a turn.
  coldsnap: {
    id: 'coldsnap',
    name: 'Cold Snap',
    kind: 'wildcard',
    blurb: 'Spend half your charge to freeze the whole enemy line for a turn.',
    targetMode: 'allEnemies',
    canUse: (actor) => actor.charge >= WARDEN.coldsnap.minCharge,
    apply(actor, _targets, state) {
      const vented = Math.floor(actor.charge / 2);
      actor.charge -= vented;
      const line = enemiesOf(state, actor);
      // "Eternal Winter": the whole line freezes for 2; "Whiteout": Cold Snap hits twice as hard.
      const stacks = (actor.mods?.eternalWinter ? 2 : WARDEN.coldsnap.freezeStacks) + (actor.mods?.freezeBonus ?? 0);
      const power = WARDEN.coldsnap.perCharge * (actor.mods?.whiteout ? 2 : 1);
      const hits = line.map((e) => dealDamage(e, actor.atk * power * vented, actor));
      const freezes = line.map((e) => applyFreeze(e, stacks));
      if (actor.mods?.silence) line.forEach((e) => { e.charge = 0; }); // drain the line
      if (actor.mods?.brittle) line.forEach((e) => applyPoison(e, 1)); // frost shards
      return { hits, chargeSpent: vented, freezes };
    },
  },
};
