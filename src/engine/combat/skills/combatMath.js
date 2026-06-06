import { BURN, BLOCK, REGEN, AMP, FREEZE, VULN } from '../dials.js';

// ─── Shared combat math (§26.2: ONE place damage/status logic lives) ────────────
// Every skill across every Type routes through these so a new Type can't quietly
// invent a second damage path. Block is absorbed BEFORE HP — and because Reactor
// units carry block:0, this is a no-op for the existing Reactor golden.

// Amp multiplier for whoever is dealing the damage. A unit with no amp (everyone
// the Booster hasn't touched) returns 1, so passing `actor` is a no-op for the
// existing Reactor/Bulwark/Mender goldens — they stay byte-identical.
export function ampMult(actor) {
  const stacks = actor?.statuses?.amp || 0;
  return 1 + AMP.dmgPerStack * stacks;
}

// Run-upgrade modifiers live on actor.mods (opt-in). A unit with no mods reads the
// default, so threading `actor` through these is a no-op for every existing golden.
const modMult = (actor, key) => actor?.mods?.[key] ?? 1;
const modAdd = (actor, key) => actor?.mods?.[key] ?? 0;

export function dealDamage(target, amount, actor) {
  // "Shatter" (Warden keystone path): your hits on a frozen target hit 50% harder.
  // Opt-in — default 1, so every existing golden is byte-identical.
  const shatter = (actor?.mods?.shatter && (target.statuses.freeze || 0) > 0) ? 1.5 : 1;
  // Vulnerability (Hexer curse): a cursed target takes more from EVERY source. Opt-in —
  // no creature carries vuln by default, so this is ×1 and goldens are byte-identical.
  const vuln = 1 + VULN.perStack * (target.statuses.vuln || 0);
  const dmg = Math.max(0, Math.round(amount * ampMult(actor) * modMult(actor, 'dmgMult') * shatter * vuln));
  let remaining = dmg;
  const blocked = Math.min(target.statuses.block || 0, remaining);
  if (blocked > 0) target.statuses.block -= blocked;
  remaining -= blocked;
  const before = target.hp;
  target.hp = Math.max(0, target.hp - remaining);
  const killed = before > 0 && target.hp === 0;
  if (killed) target.alive = false;
  // `dmg` reported is damage that reached HP (post-block), so feeds/goldens read
  // the real wound; `blocked` is surfaced separately for UI.
  return { uid: target.uid, name: target.name, dmg: remaining, blocked, killed, hpAfter: target.hp };
}

export function applyBurn(target, stacks, actor) {
  const add = stacks + modAdd(actor, 'burnBonus');
  target.statuses.burn = Math.min(BURN.maxStacks, (target.statuses.burn || 0) + add);
}

export function addBlock(target, amount, actor) {
  const cap = BLOCK.maxStack ?? Infinity;
  const add = Math.max(0, Math.round(amount * modMult(actor, 'blockMult')));
  target.statuses.block = Math.min(cap, (target.statuses.block || 0) + add);
  return { uid: target.uid, name: target.name, block: target.statuses.block };
}

export const isBurning = (u) => (u.statuses.burn || 0) > 0;

// Restore HP up to maxHp (never revives — a dead unit stays dead). Reports the
// amount actually healed (clamped), so over-heal doesn't lie in the feed/golden.
export function heal(target, amount, actor) {
  if (!target.alive) return { uid: target.uid, name: target.name, healed: 0, hpAfter: target.hp };
  const want = Math.max(0, Math.round(amount * modMult(actor, 'healMult')));
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + want);
  return { uid: target.uid, name: target.name, healed: target.hp - before, hpAfter: target.hp };
}

export function applyRegen(target, stacks) {
  target.statuses.regen = Math.min(REGEN.maxStacks, (target.statuses.regen || 0) + stacks);
  return { uid: target.uid, name: target.name, regen: target.statuses.regen };
}

// Lock a unit out of its next turn(s). A Warden control primitive — the engine skips
// a unit whose freeze > 0 and decrements it (the thaw). Opt-in: no existing creature
// applies freeze, so every current golden is byte-identical.
export function applyFreeze(target, stacks) {
  target.statuses.freeze = Math.min(FREEZE.maxStacks, (target.statuses.freeze || 0) + stacks);
  return { uid: target.uid, name: target.name, freeze: target.statuses.freeze };
}

// Curse a unit so it takes more damage from everyone (a Hexer primitive). Decays each
// round. Opt-in: no existing creature applies vuln, so goldens are byte-identical.
export function applyVuln(target, stacks) {
  target.statuses.vuln = Math.min(VULN.maxStacks, (target.statuses.vuln || 0) + stacks);
  return { uid: target.uid, name: target.name, vuln: target.statuses.vuln };
}

// Lend an outgoing-damage buff to an ally (capped). Reports the resulting stacks so
// the feed/golden reads who got boosted and by how much.
export function applyAmp(target, stacks, actor) {
  const add = stacks + modAdd(actor, 'ampBonus');
  target.statuses.amp = Math.min(AMP.maxStacks, (target.statuses.amp || 0) + add);
  return { uid: target.uid, name: target.name, amp: target.statuses.amp };
}
