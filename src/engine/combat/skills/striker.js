import { STRIKER } from '../dials.js';
import { dealDamage, heal, applyPoison, applyVuln, addBlock } from './combatMath.js';

// ─── Striker — "tempo: hit fast, hit twice, reward moving first" (§23) ───────────
// Same charge spine, but the identity is the SHAPE of its damage: many small hits
// instead of one big one, plus an initiative bonus. It reuses the shared damage
// primitive (no new status) — and because every hit passes `actor`, a Booster's Amp
// stacks across the WHOLE flurry, the seam's first real combo.

// One run of hits onto a target, carrying the DUELIST/BARRAGE riders. Opt-in: with no
// mods this is just `count` plain hits, byte-identical to the original two loops.
function strike(actor, target, count, baseMult) {
  const hits = [];
  for (let i = 0; i < count; i++) {
    // "Momentum" (BARRAGE): each consecutive hit on the same target lands +5% harder.
    const ramp = actor.mods?.momentum ? (1 + 0.05 * i) : 1;
    const hit = dealDamage(target, actor.atk * baseMult * ramp, actor);
    // "Thousand Cuts" (BARRAGE keystone): every hit leaves a stacking bleed (poison).
    if (actor.mods?.thousandCuts) applyPoison(target, 1);
    // "Bloodlust" (DUELIST): a kill patches you up and refunds charge — chain the cuts.
    if (actor.mods?.bloodlust && hit.killed) { heal(actor, Math.round(actor.maxHp * 0.1), actor); actor.charge = Math.min(actor.maxCharge, actor.charge + 2); }
    hits.push(hit);
  }
  return hits;
}

// "Marking Strike" (DUELIST): a builder hit also brands the target to take more.
const mark = (actor, target) => { if (actor.mods?.markVuln) applyVuln(target, 1); };
// "Riposte" stance (DUELIST capstone): your builder leaves you poised — a small guard
// that throws blows back. Opt-in — only raised when the mod is set.
function duelStance(actor) {
  if (!actor.mods?.duelStance) return;
  addBlock(actor, Math.round(actor.atk * 0.5), actor);
  actor.statuses.reflect = Math.max(actor.statuses.reflect || 0, 0.3);
}

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
      duelStance(actor);
      if (!target) return { hits: [], chargeGained: gain };
      mark(actor, target);
      const extra = actor.mods?.extraHits ?? 0; // "Twin Strike" upgrade; 0 = unchanged
      const hits = strike(actor, target, STRIKER.jab.hits + extra, STRIKER.jab.hitMult);
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
      const extra = actor.mods?.extraHits ?? 0; // "Twin Strike" upgrade; 0 = unchanged
      const count = Math.min(STRIKER.flurry.maxHits + extra, STRIKER.flurry.baseHits + extra + STRIKER.flurry.hitsPerCharge * spent);
      const hits = strike(actor, target, count, STRIKER.flurry.hitMult);
      return { hits, chargeSpent: spent, flurryHits: count };
    },
  },

  // Wildcard — vent HALF the charge for a hard strike, extra vicious moving first.
  blitz: {
    id: 'blitz',
    name: 'Blitz',
    kind: 'wildcard',
    blurb: 'Spend half your charge for a hard strike — extra vicious if you move first.',
    targetMode: 'enemy',
    canUse: (actor) => actor.charge >= STRIKER.blitz.minCharge,
    apply(actor, [target], state) {
      const vented = Math.floor(actor.charge / 2);
      actor.charge -= vented;
      if (!target) return { hits: [], chargeSpent: vented };
      const first = !state.firstActionDone;
      let mult = STRIKER.blitz.hitMult * Math.max(1, vented);
      if (first) mult *= STRIKER.blitz.firstStrikeBonus;
      // "Blur" keystone: you always move first (engine initiative) and the opener bites deeper.
      if (first && actor.mods?.blur) mult *= 1.5;
      // "Blitz Storm" upgrade: Blitz becomes a 3-hit barrage instead of one heavy strike.
      const hitCount = actor.mods?.blitzMulti ? 3 : 1;
      const hits = strike(actor, target, hitCount, mult);
      return { hits, chargeSpent: vented, firstStrike: first };
    },
  },
};
