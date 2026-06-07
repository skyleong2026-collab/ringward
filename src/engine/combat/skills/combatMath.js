import { BURN, BLOCK, REGEN, AMP, FREEZE, VULN, POISON, DOOM } from '../dials.js';

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

// "Phoenix" (Reactor CINDER keystone): the first lethal blow doesn't kill — the unit
// blazes back at 30% HP with a full charge bar, once per fight (phoenixUsed). Opt-in,
// so no creature without the mod is affected and every existing golden is byte-identical.
// Returns true if it saved the unit (the caller must then NOT mark it dead).
export function phoenixSave(unit) {
  if (!unit.mods?.phoenix || unit.phoenixUsed) return false;
  unit.phoenixUsed = true;
  unit.hp = Math.max(1, Math.round(unit.maxHp * 0.3));
  unit.charge = unit.maxCharge ?? unit.charge;
  unit.alive = true;
  return true;
}

export function dealDamage(target, amount, actor) {
  // "Shatter" (Warden keystone path): your hits on a frozen target hit 50% harder.
  // Opt-in — default 1, so every existing golden is byte-identical.
  const shatter = (actor?.mods?.shatter && (target.statuses.freeze || 0) > 0) ? 1.5 : 1;
  // "Opener" (Striker DUELIST): you hit harder against a target still at full HP.
  const opener = (actor?.mods?.opener && target.hp >= target.maxHp) ? 1.25 : 1;
  // "Apex" (Assassin BLOODHOUND keystone): every kill this run permanently sharpens
  // your blade — huntStacks accrue on kills below and add +8% damage apiece. Opt-in.
  const apex = actor?.mods?.apex ? (1 + 0.08 * (actor.huntStacks || 0)) : 1;
  // "Iron Maiden" (Bulwark) / "Plague" (Assassin) keystones: you deal NO direct damage
  // — your whole win-con is reflected block / ramping poison. Opt-in flag → ×1 normally.
  const noDirect = (actor?.mods?.ironMaiden || actor?.mods?.plague) ? 0 : 1;
  // Vulnerability (Hexer curse): a cursed target takes more from EVERY source. Opt-in —
  // no creature carries vuln by default, so this is ×1 and goldens are byte-identical.
  const vuln = 1 + VULN.perStack * (target.statuses.vuln || 0);
  // "Executioner" (relic, vF-AJ): the mirror of opener — you hit HARDER against a target
  // already below half HP, to close out wounded enemies. Opt-in (default 1) → golden-safe.
  const executioner = (actor?.mods?.executioner && target.hp < target.maxHp * 0.5) ? (1 + actor.mods.executioner) : 1;
  const dmg = Math.max(0, Math.round(amount * ampMult(actor) * modMult(actor, 'dmgMult') * shatter * opener * apex * executioner * vuln * noDirect));
  let remaining = dmg;
  const blocked = Math.min(target.statuses.block || 0, remaining);
  if (blocked > 0) target.statuses.block -= blocked;
  remaining -= blocked;
  // "Spikes / Riposte / Iron Maiden" (Bulwark RETRIBUTION): a shielded ally throws back
  // a slice of what it blocks. Opt-in — reflect defaults 0, so no existing golden counters.
  reflectBack(target, blocked, actor);
  const before = target.hp;
  // "Unbreakable" (Bulwark GUARDIAN keystone): an ally cannot drop below 1 HP while its
  // guardian still stands. The guardian is a live object ref seeded at round start; with
  // no mod no unit carries one, so the floor never engages and goldens are byte-identical.
  const floored = target._guardian && target._guardian.alive && target._guardian !== target && (before - remaining) <= 0;
  target.hp = floored ? Math.max(1, before - remaining + 1) : Math.max(0, before - remaining);
  let killed = before > 0 && target.hp === 0;
  const revived = killed && phoenixSave(target); // Phoenix catches the lethal blow
  if (revived) killed = false;
  if (killed) target.alive = false;
  // Apex: bank a permanent stack for the kill (read above on future hits).
  if (killed && actor?.mods?.apex) actor.huntStacks = (actor.huntStacks || 0) + 1;
  // "Vampiric" (relic, vF-AH): the attacker drains a fraction of the wound it deals back
  // to its own HP. Opt-in — lifesteal defaults 0, so no existing golden ever heals here,
  // and the heal is silent (like reflect) so the golden turn-shape is untouched.
  const ls = actor?.mods?.lifesteal || 0;
  if (ls > 0 && remaining > 0 && actor.alive) actor.hp = Math.min(actor.maxHp, actor.hp + Math.round(remaining * ls));
  // "Thorns" (relic, vF-AJ): when this unit is struck, the attacker takes a flat fraction
  // of the wound straight back — unconditional, unlike Riposte (which needs a shield to
  // counter from). Opt-in — thorns defaults 0 and only player relics set it, so no golden
  // ever reflects here. Like reflectBack, it can finish off the attacker; no re-trigger.
  const th = target.mods?.thorns || 0;
  if (th > 0 && remaining > 0 && actor && actor !== target && actor.alive) {
    const back = Math.round(remaining * th);
    if (back > 0) { actor.hp = Math.max(0, actor.hp - back); if (actor.hp === 0 && !phoenixSave(actor)) actor.alive = false; }
  }
  // `dmg` reported is damage that reached HP (post-block), so feeds/goldens read
  // the real wound; `blocked` is surfaced separately for UI.
  return { uid: target.uid, name: target.name, dmg: remaining, blocked, killed, hpAfter: target.hp, revived };
}

// A shielded RETRIBUTION ally reflects a fraction of the damage its shield ate straight
// back at the attacker — silently (no event), like amp/vuln decay, so the golden turn
// shape is untouched. `reflect` is 0 for every unit unless a Bulwark seeded it, and
// `spite` lets the counter bypass the attacker's own block. No recursion: applied to hp.
function reflectBack(target, blocked, actor) {
  const pct = target.statuses?.reflect || 0;
  if (pct <= 0 || blocked <= 0 || !actor || !actor.alive || actor === target) return;
  let back = Math.max(0, Math.round(blocked * pct));
  if (back <= 0) return;
  if (!target.mods?.spite) { // without Spite, the attacker's own shield soaks the counter first
    const soak = Math.min(actor.statuses?.block || 0, back);
    if (soak > 0) actor.statuses.block -= soak;
    back -= soak;
  }
  if (back <= 0) return;
  const before = actor.hp;
  actor.hp = Math.max(0, actor.hp - back);
  if (before > 0 && actor.hp === 0 && !phoenixSave(actor)) actor.alive = false;
}

// Seed a reflect aura onto a shielded recipient (Bulwark RETRIBUTION). The strongest
// flag wins: Iron Maiden reflects everything, Spikes a slice. Opt-in — only called when
// the Bulwark carries the mod, so no existing golden ever gains a reflect status.
export function seedReflect(recipient, actor) {
  if (actor?.mods?.ironMaiden) recipient.statuses.reflect = Math.max(recipient.statuses.reflect || 0, 1.0);
  else if (actor?.mods?.spikes || actor?.mods?.riposte) recipient.statuses.reflect = Math.max(recipient.statuses.reflect || 0, actor.mods?.riposte ? 0.3 : 0.15);
}

// Poison (Assassin VENOM / Hexer rot): a ramping DoT that, unlike Burn, does not decay
// on its own. Opt-in — no existing creature applies it, so goldens are byte-identical.
export function applyPoison(target, stacks) {
  target.statuses.poison = Math.min(POISON.maxStacks, (target.statuses.poison || 0) + stacks);
  return { uid: target.uid, name: target.name, poison: target.statuses.poison };
}

// Doom (Hexer DOOM): brand a target with a countdown + the brander's punch. When the
// timer expires (engine), it erupts. Opt-in — no creature carries doom by default.
export function applyDoom(target, actorAtk, timer) {
  target.statuses.doom = timer ?? DOOM.timer;
  target.doomPunch = Math.max(target.doomPunch || 0, actorAtk); // strongest brand sticks
  return { uid: target.uid, name: target.name, doom: target.statuses.doom };
}

export const isPoisoned = (u) => (u.statuses.poison || 0) > 0;

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
