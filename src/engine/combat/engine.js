import { ROUND_CAP, BURN, REGEN, AMP } from './dials.js';
import { getSkill } from './skills/index.js';
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
    note: result.note,
    amplifiedByBurn: result.amplifiedByBurn || false,
  });
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
      const killed = before > 0 && u.hp === 0;
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
      u.statuses.regen = Math.max(0, stacks - REGEN.decayPerRound);
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

// ─── End of round: Amp decays (no tick — it only ever modified outgoing damage) ──
// Silent: unlike Burn/Regen it changes no HP, so it emits no event. A unit with no
// amp is skipped, so this is a no-op for every golden without a Booster — they stay
// byte-identical. The UI badge refreshes on the next emitted event.
function decayAmp(state) {
  for (const side of ['A', 'B']) {
    for (const u of livingOnSide(state, side)) {
      const stacks = u.statuses.amp || 0;
      if (stacks <= 0) continue;
      u.statuses.amp = Math.max(0, stacks - AMP.decayPerRound);
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

  for (const side of [first, otherSide(first)]) {
    const driver = drivers[side];
    const acted = new Set();
    // Recompute the living pool each step: a creature that died mid-block (e.g. to
    // a Backdraft) is gone, and one already acted this round never acts twice.
    let pool = livingOnSide(state, side).filter((u) => !acted.has(u.uid));
    while (pool.length > 0 && !battleOver(state)) {
      const actor = await driver.chooseNextActor(pool, state);
      const decision = await driver.decide(actor, state);
      applyDecision(state, actor, decision, emit);
      acted.add(actor.uid);
      state.firstActionDone = true;
      pool = livingOnSide(state, side).filter((u) => !acted.has(u.uid));
    }
    if (battleOver(state)) break;
  }

  // Burn resolves at end of round and CAN decide the round (a tick kills the last
  // enemy). But if the action phase already wiped a side, the fight is decided —
  // don't let a post-victory burn tick scratch the winner.
  if (!battleOver(state)) tickBurns(state, emit);
  if (!battleOver(state)) tickRegen(state, emit);
  decayAmp(state); // always: a buff fades whether or not the round was decisive
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
