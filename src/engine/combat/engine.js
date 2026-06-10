import { ROUND_CAP, BURN, REGEN, AMP, FREEZE, VULN, POISON, DOOM, BULWARK, MENDER, BOOSTER, HEXER } from './dials.js';
import { getSkill } from './skills/index.js';
import { phoenixSave, dealDamage } from './skills/combatMath.js';
import {
  livingOnSide,
  otherSide,
  sideInitiative,
  battleOver,
  unitByUid,
} from './state.js';

// ─── applyDecision — the ONE place combat math happens (§26.2) ──────────────────
// Identical for both drivers. The seam routes *who chooses*, never *what a skill
// does*, so there is exactly one set of skill logic. Emits one rich event per turn.
function applyDecision(state, actor, decision, emit) {
  const skill = getSkill(decision.skillId);

  // Defensive re-check: a driver should only ever hand us a legal move, but never
  // trust it — fall back to the always-legal builder rather than corrupt state.
  if (!skill.canUse(actor, state)) {
    const fallback = getSkill(actor.skillIds[0]);
    return applyDecision(state, actor, { skillId: fallback.id, targetIds: decision.targetIds }, emit);
  }

  const chargeBefore = actor.charge;
  const targets = (decision.targetIds || []).map((uid) => unitByUid(state, uid)).filter(Boolean);
  const result = skill.apply(actor, targets, state);

  emit({
    type: 'turn',
    round: state.round,
    actor: { uid: actor.uid, name: actor.name, side: actor.side },
    skill: { id: skill.id, name: skill.name, kind: skill.kind },
    chargeBefore,
    chargeAfter: actor.charge,
    hits: result.hits || [],
    shields: result.shields || [],
    heals: result.heals || [],
    regens: result.regens || [],
    amps: result.amps || [],
    // Conditional: only Warden turns carry freezes / Hexer turns carry vulns, so
    // existing golden turn events stay byte-identical (the keys are simply absent).
    ...(result.freezes && result.freezes.length ? { freezes: result.freezes } : {}),
    ...(result.vulns && result.vulns.length ? { vulns: result.vulns } : {}),
    note: result.note,
    amplifiedByBurn: result.amplifiedByBurn || false,
  });
  return result; // the turn loop reads this (e.g. Quickstep checks for a kill)
}

// ─── End of round: Burn ticks, then decays ──────────────────────────────────────
function tickBurns(state, emit) {
  for (const side of ['A', 'B']) {
    for (const u of livingOnSide(state, side)) {
      const stacks = u.statuses.burn || 0;
      if (stacks <= 0) continue;
      const dmg = stacks * BURN.tickDmg;
      const before = u.hp;
      u.hp = Math.max(0, u.hp - dmg);
      let killed = before > 0 && u.hp === 0;
      if (killed && phoenixSave(u)) killed = false; // Phoenix catches a burn death too
      if (killed) u.alive = false;
      u.statuses.burn = Math.max(0, stacks - BURN.decayPerRound);
      emit({
        type: 'burn',
        round: state.round,
        target: { uid: u.uid, name: u.name, side: u.side },
        dmg,
        killed,
        hpAfter: u.hp,
        stacksLeft: u.statuses.burn,
      });
    }
  }
}

// ─── End of round: Regen ticks, then decays (mirrors Burn, but heals) ───────────
// Guarded so a unit with no regen emits nothing — keeps the Reactor/Bulwark
// goldens (which never carry regen) byte-identical.
function tickRegen(state, emit) {
  for (const side of ['A', 'B']) {
    for (const u of livingOnSide(state, side)) {
      const stacks = u.statuses.regen || 0;
      if (stacks <= 0) continue;
      const amount = stacks * REGEN.tickHeal;
      const before = u.hp;
      u.hp = Math.min(u.maxHp, u.hp + amount);
      // "Evergreen" (Mender VERDANT keystone): regen never fades. Opt-in — without the
      // mod it decays exactly as before, so every existing golden is byte-identical.
      u.statuses.regen = u.mods?.evergreen ? stacks : Math.max(0, stacks - REGEN.decayPerRound);
      emit({
        type: 'regen',
        round: state.round,
        target: { uid: u.uid, name: u.name, side: u.side },
        healed: u.hp - before,
        hpAfter: u.hp,
        stacksLeft: u.statuses.regen,
      });
    }
  }
}

// ─── End of round: Poison ticks (a ramping DoT). Mirrors Burn, but by default it does
// NOT decay (POISON.decayPerRound = 0) — the VENOM identity is a stack that lingers and
// ramps. Guarded so a unit with no poison emits nothing; no golden carries poison, so
// every current transcript is byte-identical. ──
function tickPoison(state, emit) {
  for (const side of ['A', 'B']) {
    for (const u of livingOnSide(state, side)) {
      const stacks = u.statuses.poison || 0;
      if (stacks <= 0) continue;
      const dmg = stacks * POISON.tickDmg;
      const before = u.hp;
      u.hp = Math.max(0, u.hp - dmg);
      let killed = before > 0 && u.hp === 0;
      if (killed && phoenixSave(u)) killed = false;
      if (killed) u.alive = false;
      u.statuses.poison = Math.max(0, stacks - POISON.decayPerRound);
      emit({ type: 'poison', round: state.round, target: { uid: u.uid, name: u.name, side: u.side }, dmg, killed, hpAfter: u.hp, stacksLeft: u.statuses.poison });
    }
  }
}

// ─── End of round: Doom timers count down; an expired brand detonates for a multiple of
// the brander's punch, ignoring block (it is inevitable). On a `doomSplash` brand the
// blast also washes a curse over the rest of the line. Guarded — no golden carries doom,
// so this is a complete no-op for every existing transcript. ──
function tickDoom(state, emit) {
  for (const side of ['A', 'B']) {
    for (const u of livingOnSide(state, side)) {
      if ((u.statuses.doom || 0) <= 0) continue;
      u.statuses.doom -= 1;
      if (u.statuses.doom > 0) continue;
      const dmg = Math.round((u.doomPunch || 0) * DOOM.dmgMult);
      const before = u.hp;
      u.hp = Math.max(0, u.hp - dmg);
      let killed = before > 0 && u.hp === 0;
      if (killed && phoenixSave(u)) killed = false;
      if (killed) u.alive = false;
      if (u.doomSplash) { // "Death Sentence": the eruption brands the rest of the line
        for (const e of livingOnSide(state, side)) {
          if (e.uid === u.uid) continue;
          e.statuses.vuln = Math.min(VULN.maxStacks, (e.statuses.vuln || 0) + 2);
        }
      }
      emit({ type: 'doom', round: state.round, target: { uid: u.uid, name: u.name, side: u.side }, dmg, killed, hpAfter: u.hp });
    }
  }
}

// ─── End of round: PLAYER support tempo passives (always-on, AI-agnostic). A side-A Bulwark
// or Mender chips the lowest-HP living enemy every round it survives — the "support must
// contribute to kill-speed" fix, with no targeting or buff-sequencing the AUTO AI can't do.
// Gated on side 'A' + Type, so enemy supports (the boss Tender) are untouched and no boss gets
// harder. A squad with no player Bulwark/Mender chips nothing → that golden stays byte-identical.
function tickSupportChip(state, emit, type, mult, evtType) {
  const supports = livingOnSide(state, 'A').filter((u) => u.type === type);
  if (!supports.length) return;
  // Only the STRONGEST support of this Type contributes its chip — stacking two tanks (or two
  // healers) adds HP/shields/reflect, not multiplied tempo, so a multi-support comp can't snowball
  // the passive into dominance (the rest of the kit still differentiates a 2-support squad).
  const u = supports.reduce((b, s) => (s.atk > b.atk ? s : b), supports[0]);
  const foes = livingOnSide(state, 'B');
  if (!foes.length) return;
  const tgt = foes.reduce((w, e) => (e.hp < w.hp ? e : w), foes[0]); // lowest-HP enemy, by rule
  const hit = dealDamage(tgt, u.atk * mult, u);
  emit({ type: evtType, round: state.round, actor: { uid: u.uid, name: u.name, side: 'A' }, target: { uid: tgt.uid, name: tgt.name, side: 'B' }, dmg: hit.dmg, killed: hit.killed, hpAfter: tgt.hp });
}
const tickThorns = (state, emit) => tickSupportChip(state, emit, 'Bulwark', BULWARK.brace.thornChip, 'thorns');
const tickBlight = (state, emit) => tickSupportChip(state, emit, 'Mender', MENDER.mend.bloomChip, 'blight');

// ─── End of round: PLAYER Hexer curse-bleed (always-on, AI-agnostic). A vuln'd enemy bleeds
// HEXER.bleedPerStack per stack each round — turning the Hexer's damage-taken MULTIPLIER (wasted
// under AUTO, which won't focus-fire the cursed target) into reliable DoT. Gated on a living side-A
// Hexer, so enemy curses never bleed the player. No-op for every golden (none field a side-A Hexer
// or carry vuln). Flat, like Burn — ignores block. Ticks before decayVuln, so it reads the round's curse.
function tickHexBleed(state, emit) {
  if (!livingOnSide(state, 'A').some((u) => u.type === 'Hexer')) return;
  for (const e of livingOnSide(state, 'B')) {
    const v = e.statuses.vuln || 0;
    if (v <= 0) continue;
    const dmg = v * HEXER.bleedPerStack;
    const before = e.hp;
    e.hp = Math.max(0, e.hp - dmg);
    let killed = before > 0 && e.hp === 0;
    if (killed && phoenixSave(e)) killed = false;
    if (killed) e.alive = false;
    emit({ type: 'hexbleed', round: state.round, target: { uid: e.uid, name: e.name, side: 'B' }, dmg, killed, hpAfter: e.hp });
  }
}

// ─── Start of round: seed the deep-tree effects that read the whole board (guardian HP
// floor, recurring control, the conductor's gift). Every branch is gated on a mod no
// golden unit carries, so this whole pass is a no-op for existing transcripts. ──
function seedRoundStart(state) {
  for (const side of ['A', 'B']) {
    const living = livingOnSide(state, side);
    // "Unbreakable" (Bulwark GUARDIAN keystone): a live guardian props every ally at ≥1 HP.
    const guardian = living.find((u) => u.mods?.unbreakable);
    for (const u of living) u._guardian = guardian || undefined;
    const foes = livingOnSide(state, otherSide(side));
    // "Time Lock" (Warden BLIZZARD keystone): each round the weakest foe is held in stasis.
    if (foes.length && living.some((u) => u.mods?.timeLock)) {
      const weak = foes.reduce((w, u) => (u.hp / u.maxHp < w.hp / w.maxHp ? u : w), foes[0]);
      // Respects the post-thaw guard: a just-thawed foe gets its guaranteed action before Time Lock re-holds it.
      if (!(FREEZE.thawGuard && weak.freezeImmune)) weak.statuses.freeze = Math.min(FREEZE.maxStacks, (weak.statuses.freeze || 0) + 1);
    }
    // "Maestro" (Booster CONDUCTOR keystone): each round, gift the carry a stack of amp.
    if (living.some((u) => u.mods?.maestro)) {
      const carry = living.reduce((b, u) => (u.atk > b.atk ? u : b), living[0]);
      carry.statuses.amp = Math.min(AMP.maxStacks, (carry.statuses.amp || 0) + 1);
    }
    // Base-kit Booster aura (PLAYER side only): a live Booster steadies the WHOLE squad's amp
    // every round — the always-on version of Prime that pays out under AUTO with no sequencing.
    // Decays 1/round, so it ramps to a standing floor (capped at AMP.maxStacks). Side-A gated, so
    // an enemy Booster (Storm-Wire local) never auras its team. Stacks on top of Maestro.
    if (side === 'A' && living.some((u) => u.type === 'Booster')) {
      for (const u of living) u.statuses.amp = Math.min(AMP.maxStacks, (u.statuses.amp || 0) + BOOSTER.prime.auraStacks);
    }
  }
}

// ─── End of round: Amp decays (no tick — it only ever modified outgoing damage) ──
// Silent: unlike Burn/Regen it changes no HP, so it emits no event. A unit with no
// amp is skipped, so this is a no-op for every golden without a Booster — they stay
// byte-identical. The UI badge refreshes on the next emitted event.
function decayAmp(state) {
  for (const side of ['A', 'B']) {
    for (const u of livingOnSide(state, side)) {
      const stacks = u.statuses.amp || 0;
      if (stacks <= 0) continue;
      // "Crescendo" (Booster RESONANCE keystone): amp never fades — every round the team
      // only hits harder. Opt-in — without the mod it decays exactly as before.
      if (u.mods?.crescendo) continue;
      u.statuses.amp = Math.max(0, stacks - AMP.decayPerRound);
    }
  }
}

// ─── End of round: Vulnerability decays (a Hexer curse; silent like Amp). A unit with
// no vuln is skipped, so this is a no-op for every golden — byte-identical. ──
function decayVuln(state) {
  for (const side of ['A', 'B']) {
    for (const u of livingOnSide(state, side)) {
      const stacks = u.statuses.vuln || 0;
      if (stacks <= 0) continue;
      u.statuses.vuln = Math.max(0, stacks - VULN.decayPerRound);
    }
  }
}

// ─── The fixed-round loop (§26.2) ───────────────────────────────────────────────
// Side that wins initiative acts as a whole block, then the other side's block —
// NOT interleaved by individual speed. Within a block, the side's driver picks
// which living creature acts next, one at a time. Each creature acts once.
async function runRound(state, drivers, emit) {
  const first = sideInitiative(state);
  emit({ type: 'round-start', round: state.round, firstSide: first });
  seedRoundStart(state); // deep-tree board effects (no-op without the mods)

  for (const side of [first, otherSide(first)]) {
    const driver = drivers[side];
    const acted = new Set();
    const quickstepped = new Set(); // Striker "Quickstep" — one bonus action per unit/round
    // Recompute the living pool each step: a creature that died mid-block (e.g. to
    // a Backdraft) is gone, and one already acted this round never acts twice.
    let pool = livingOnSide(state, side).filter((u) => !acted.has(u.uid));
    while (pool.length > 0 && !battleOver(state)) {
      const actor = await driver.chooseNextActor(pool, state);
      // Frozen (a Warden control) — skip the turn and thaw by one. Opt-in: no existing
      // creature carries freeze, so this branch never runs for any current golden.
      if ((actor.statuses.freeze || 0) > 0) {
        actor.statuses.freeze -= 1;
        // Just thawed → owed one guaranteed action; re-freeze no-ops until it acts (kills the perma-lock).
        if (FREEZE.thawGuard && actor.statuses.freeze === 0) actor.freezeImmune = true;
        emit({ type: 'frozen', round: state.round, actor: { uid: actor.uid, name: actor.name, side: actor.side }, stacksLeft: actor.statuses.freeze });
        acted.add(actor.uid);
        pool = livingOnSide(state, side).filter((u) => !acted.has(u.uid));
        continue;
      }
      const decision = await driver.decide(actor, state);
      const result = applyDecision(state, actor, decision, emit);
      if (actor.freezeImmune) actor.freezeImmune = false; // consumed its guaranteed post-thaw action — re-freezable now
      acted.add(actor.uid);
      state.firstActionDone = true;
      // "Quickstep" (Striker TEMPO): land a kill, act once more this round. Opt-in — no
      // golden unit carries the mod, so no fight ever re-acts and the loop is untouched.
      if (actor.mods?.actAgainOnKill && actor.alive && !quickstepped.has(actor.uid)
          && (result?.hits || []).some((h) => h.killed) && !battleOver(state)) {
        quickstepped.add(actor.uid);
        acted.delete(actor.uid); // eligible to be chosen again, exactly once
      }
      pool = livingOnSide(state, side).filter((u) => !acted.has(u.uid));
    }
    if (battleOver(state)) break;
  }

  // Burn resolves at end of round and CAN decide the round (a tick kills the last
  // enemy). But if the action phase already wiped a side, the fight is decided —
  // don't let a post-victory burn tick scratch the winner.
  if (!battleOver(state)) tickBurns(state, emit);
  if (!battleOver(state)) tickPoison(state, emit); // VENOM / rot DoT (no-op without poison)
  if (!battleOver(state)) tickRegen(state, emit);
  if (!battleOver(state)) tickDoom(state, emit); // DOOM detonations (no-op without a brand)
  if (!battleOver(state)) tickThorns(state, emit); // PLAYER Bulwark passive chip (no-op without one)
  if (!battleOver(state)) tickBlight(state, emit); // PLAYER Mender passive chip (no-op without one)
  if (!battleOver(state)) tickHexBleed(state, emit); // PLAYER Hexer curse-bleed (no-op without one)
  decayAmp(state); // always: a buff fades whether or not the round was decisive
  decayVuln(state); // a curse fades too (no-op unless a Hexer is in play)
  state.round += 1;
  state.firstActionDone = false;
}

// Resolve the winner: a wipe ends it; otherwise the round cap awards most total HP.
function resolveResult(state) {
  const aliveA = livingOnSide(state, 'A').length;
  const aliveB = livingOnSide(state, 'B').length;
  let winner;
  if (aliveA === 0 && aliveB === 0) winner = 'draw';
  else if (aliveB === 0) winner = 'A';
  else if (aliveA === 0) winner = 'B';
  else {
    const hp = (side) => livingOnSide(state, side).reduce((s, u) => s + u.hp, 0);
    winner = hp('A') >= hp('B') ? 'A' : 'B'; // §23.1 cap: most remaining HP wins
  }
  return {
    winner,
    rounds: state.round - 1,
    cappedOut: aliveA > 0 && aliveB > 0,
    seed: state.seed,
    log: state.log,
    units: state.units,
  };
}

// ─── runBattle — drive rounds until a wipe or the round cap ─────────────────────
// Async because the human driver awaits taps. With two AI drivers every await
// resolves instantly, so an AI-vs-AI fight is fully synchronous + deterministic
// (the golden, §26.4(2)).
export async function runBattle(state, drivers, onEvent) {
  const emit = (event) => {
    state.log.push(event);
    if (onEvent) onEvent(event); // live subscriber (UI feed); golden ignores it
  };
  while (!battleOver(state) && state.round <= ROUND_CAP) {
    await runRound(state, drivers, emit);
  }
  const result = resolveResult(state);
  emit({ type: 'battle-end', winner: result.winner, rounds: result.rounds });
  return result;
}
