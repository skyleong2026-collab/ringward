import { BOOSTER, AMP } from '../dials.js';
import { alliesOf, enemiesOf } from '../state.js';
import { dealDamage, applyAmp, addBlock } from './combatMath.js';

// The most-charged living enemy — whose tempo the CONDUCTOR "Tempo Theft" saps.
const enemyToSap = (actor, state) => {
  const foes = enemiesOf(state, actor);
  return foes.length ? foes.reduce((b, u) => ((u.charge || 0) > (b.charge || 0) ? u : b), foes[0]) : null;
};
// "Full Harmony" (RESONANCE): amp also hardens its recipients with a little shield.
const harmonyShield = (recipients, actor) => { if (actor.mods?.fullHarmony) recipients.forEach((a) => addBlock(a, Math.round(actor.atk * 0.4), actor)); };

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
    blurb: '+2 charge, lend Amp (hits land harder — fades 1/round) to your strongest ally, and chip the target.',
    targetMode: 'enemy', // select() points at the chip target; the buff picks the carry
    canUse: () => true,
    apply(actor, [target], state) {
      const gain = BOOSTER.prime.chargeGain;
      actor.charge = Math.min(actor.maxCharge, actor.charge + gain);
      // "Power Chord" upgrade spreads the prime across the whole line. Opt-in — with
      // no mod the recipient list is just [bestCarry], byte-identical to before.
      const recipients = (actor.mods?.primeTeam && state) ? alliesOf(state, actor) : [bestCarry(actor, state)];
      const amps = recipients.map((a) => applyAmp(a, BOOSTER.prime.ampStacks, actor));
      harmonyShield(recipients, actor);
      // "Quicken" (CONDUCTOR): the prime also nudges the carry's charge forward.
      if (actor.mods?.quicken && state) { const c = bestCarry(actor, state); c.charge = Math.min(c.maxCharge ?? 6, (c.charge || 0) + 1); }
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
      let stacks = BOOSTER.overdrive.base + BOOSTER.overdrive.perCharge * spent;
      // "Critical Mass" keystone: Overdrive dumps a FULL bar of amp, feast-or-famine.
      if (actor.mods?.criticalMass) stacks = AMP.maxStacks;
      // "Power Spike": the first payoff each fight spikes with extra amp.
      if (actor.mods?.powerSpike && !actor.powerSpikeUsed) { stacks += 2; actor.powerSpikeUsed = true; }
      // "Tempo Theft" (CONDUCTOR): also sap a charge or two from the enemy's fastest.
      if (actor.mods?.tempoTheft && state) { const foe = enemyToSap(actor, state); if (foe) foe.charge = Math.max(0, (foe.charge || 0) - 2); }
      if (actor.mods?.overdriveAll && state) {
        const line = alliesOf(state, actor);
        const amps = line.map((a) => applyAmp(a, stacks, actor));
        harmonyShield(line, actor);
        return { hits: [], amps, chargeSpent: spent };
      }
      const ally = target || bestCarry(actor, state);
      const amps = [applyAmp(ally, stacks, actor)];
      harmonyShield([ally], actor);
      // "Double Time" (CONDUCTOR): a loaded carry gets the charge to swing again now.
      if (actor.mods?.doubleTime) ally.charge = Math.min(ally.maxCharge ?? 6, (ally.charge || 0) + 3);
      return { hits: [], amps, chargeSpent: spent };
    },
  },

  // Wildcard — vent HALF the charge to spread a stack of Amp across the whole line.
  resonate: {
    id: 'resonate',
    name: 'Resonate',
    kind: 'wildcard',
    blurb: 'Spend half your charge to lend Amp to the whole ally line at once.',
    targetMode: 'allAllies',
    canUse: (actor) => actor.charge >= BOOSTER.resonate.minCharge,
    apply(actor, _targets, state) {
      const vented = Math.floor(actor.charge / 2);
      actor.charge -= vented;
      const stacks = Math.max(1, BOOSTER.resonate.ampPerVent * vented);
      const line = alliesOf(state, actor);
      const amps = line.map((a) => applyAmp(a, stacks, actor));
      harmonyShield(line, actor);
      // "Pull" (CONDUCTOR): Resonate pulls the carry's strike forward — a charge for them.
      if (actor.mods?.pull) { const c = bestCarry(actor, state); c.charge = Math.min(c.maxCharge ?? 6, (c.charge || 0) + 1); }
      return { hits: [], amps, chargeSpent: vented };
    },
  },
};
