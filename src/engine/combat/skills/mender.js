import { MENDER } from '../dials.js';
import { alliesOf, enemiesOf } from '../state.js';
import { dealDamage, heal, applyRegen, addBlock, applyAmp } from './combatMath.js';

// ─── Mender — "sustain: charge into healing" (§23) ──────────────────────────────
// Same charge spine; the payoff is a HEAL. Adds the last missing combat primitive
// (heal) + a regen status — all through the one engine path. Proves a Type can win
// by outlasting rather than out-damaging.

// The most-wounded living ally (by missing HP); the natural heal target.
function mostWounded(actor, state) {
  const allies = alliesOf(state, actor);
  return allies.reduce((worst, a) => (a.hp < worst.hp ? a : worst), allies[0]);
}

// A fallen ally, if any (LIFEBOND "Lifesurge" reads this to revive). Reads the raw
// roster so the dead are visible — alliesOf only returns the living. Opt-in.
const fallenAllies = (actor, state) => (state?.units?.[actor.side] || []).filter((u) => !u.alive);

// Strip one debuff off a unit (LIFEBOND "Cleansing Touch"). Picks the first present in
// a fixed order so it is deterministic. Opt-in — only called when the mod is set.
function stripOneDebuff(u) {
  for (const k of ['poison', 'burn', 'vuln', 'freeze']) {
    if ((u.statuses[k] || 0) > 0) { u.statuses[k] = 0; return k; }
  }
  return null;
}

// One healing landing, with "Overgrowth": healing past full pours into a shield rather
// than being wasted. Opt-in — without the mod it is a plain heal, byte-identical.
function mendHeal(target, amount, actor) {
  const res = heal(target, amount, actor);
  if (actor.mods?.overgrowth) {
    const want = Math.max(0, Math.round(amount * (actor.mods?.healMult ?? 1)));
    const overheal = want - res.healed;
    if (overheal > 0) addBlock(target, overheal, actor);
  }
  return res;
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
      const heals = [mendHeal(wounded, MENDER.mend.healNow, actor)];
      // "Lifebond" keystone: you share in the mending — patch yourself for half of it.
      if (actor.mods?.lifebond && wounded !== actor) heals.push(mendHeal(actor, Math.round(MENDER.mend.healNow / 2), actor));
      // "Lifebloom" upgrade also lays a regen ward on the healed ally. Opt-in — with
      // no mod the regen list is empty (== absent), so the golden stays byte-identical.
      const lifebloom = actor.mods?.mendRegen ?? 0;
      const regens = lifebloom > 0 ? [applyRegen(wounded, lifebloom)] : [];
      // "Wellspring" / "Channel" (LIFEBOND): gift the mended ally charge to fuel a payoff.
      const gift = (actor.mods?.channel ? 2 : 0) + (actor.mods?.wellspring ? 1 : 0);
      if (gift > 0 && wounded !== actor) wounded.charge = Math.min(wounded.maxCharge ?? 6, (wounded.charge || 0) + gift);
      // "Cleansing Touch": the heal also strips a debuff off whoever it lands on.
      if (actor.mods?.cleanse) stripOneDebuff(wounded);
      // "Sanctuary": a healthy ally (>80%) is gifted amp instead of overheal.
      if (actor.mods?.sanctuary && wounded.hp / wounded.maxHp > 0.8) applyAmp(wounded, 1, actor);
      // "Symbiosis" (VERDANT): your mending also chips the enemy line.
      const hits = target ? [dealDamage(target, actor.atk * MENDER.mend.chipMult, actor)] : [];
      if (actor.mods?.symbiosis && state) enemiesOf(state, actor).forEach((e) => hits.push(dealDamage(e, actor.atk * 0.2, actor)));
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
      // "Lifesurge" keystone: Bloom can drag a fallen ally back (once per fight).
      if (actor.mods?.lifesurge && !actor.lifesurgeUsed) {
        const dead = fallenAllies(actor, state);
        if (dead.length) {
          actor.lifesurgeUsed = true;
          const a = dead[0];
          a.alive = true;
          a.hp = Math.max(1, Math.round(a.maxHp * 0.5));
          return { hits: [], heals: [{ uid: a.uid, name: a.name, healed: a.hp, hpAfter: a.hp, revived: true }], chargeSpent: spent };
        }
      }
      // "Full Bloom" upgrade: Bloom washes over the whole team at once.
      if (actor.mods?.bloomAll && state) {
        const heals = alliesOf(state, actor).map((a) => mendHeal(a, amount, actor));
        return { hits: [], heals, chargeSpent: spent };
      }
      const ally = target || mostWounded(actor, state);
      return { hits: [], heals: [mendHeal(ally, amount, actor)], chargeSpent: spent };
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
      // "Symbiosis" (VERDANT): the ward's life also chips the enemy line.
      const hits = (actor.mods?.symbiosis && state) ? enemiesOf(state, actor).map((e) => dealDamage(e, actor.atk * 0.2, actor)) : [];
      return { hits, regens, chargeSpent: vented };
    },
  },
};
