import { createRng } from './rng.js';
import { applyLevel } from './progression.js';

// ─── Damage formula ───────────────────────────────────────────────────────────
function calcDamage(rawAttack, targetArmor) {
  return Math.max(rawAttack - targetArmor, rawAttack * 0.5);
}

// Spark per-stack scaling. Backdraft (Stronger dial) steepens it.
function sparkCoeff(u) {
  return u.dials?.has('backdraft') ? 0.20 : 0.16;
}
// Stoke → effective attack. FRONT-LOADED: the first 3 stacks each count 1.5×, so
// Spark becomes a real threat by mid-fight (rounds 4-6) instead of only at peak —
// it dies ~round 8 before late stacks ever land, so the payoff has to arrive
// while it's still alive. Later stacks settle to the base coefficient, preserving
// the "weak early, dangerous if ignored" ramp without flattening it.
function sparkAttack(u) {
  const coeff = sparkCoeff(u);
  const front = Math.min(u.stokeStacks, 3);
  const rest = Math.max(0, u.stokeStacks - 3);
  return u.attack * (1 + coeff * front * 1.5 + coeff * rest);
}

// Evolving-state probe (vG-F): Stoke is no longer a silent single-target ramp.
// At this many stacks a Spark DETONATES — releasing a burst to the whole enemy
// squad, then recharging from zero. Turns Stoke into a visible charge→release
// cycle the player can watch climb and race to interrupt (redirect fire onto it).
export const SPARK_DETONATE_THRESHOLD = 4;
const SPARK_DETONATE_RATIO = 0.6; // fraction of built-up attack dealt to each foe

// Resonate (§19.6 intervention): a player pulls a free ally's next action forward
// to strike the current actor's target in one synchronized burst. The partner
// contributes a full normal strike (ratio 1.0) — no raw-damage inflation; the
// value is concentration + timing (e.g. burst the ARMED Spark before it fires).
// The partner then forfeits its own turn this round.
const RESONANCE_RATIO = 1.0;

// ─── Apply damage (mutates unit) ──────────────────────────────────────────────
function applyDamage(unit, damage, round) {
  let hpDmg = damage;
  unit.lastProc = null;
  const prevShield = unit.shield;
  // Hair Trigger (Repeat dial): once-per-battle survival gear may fire twice.
  const oneShotCap = unit.dials?.has('hairTrigger') ? 2 : 1;

  if (unit.shield > 0) {
    const absorbed = Math.min(unit.shield, damage);
    unit.shield -= absorbed;
    unit.tel.shieldAbsorbed += absorbed;
    hpDmg = damage - absorbed;
  }

  const prevHP = Math.max(0, unit.currentHP);
  unit.currentHP = Math.max(0, unit.currentHP - hpDmg);
  const realHpDmg = prevHP - unit.currentHP;
  unit.tel.damageTaken += realHpDmg;

  if (unit.currentHP <= 0 && unit.gearId === 'lastwall' && unit.lastwallUses < oneShotCap) {
    unit.currentHP = 1;
    unit.lastwallUses += 1;
    unit.lastProc = 'lastwall';
    if (unit.lastwallUses > 1) unit.hairTriggerFired = true;
  }

  // Pyre Heart: does NOT survive — captures its Stoke to pass on + detonate as it falls.
  if (unit.currentHP <= 0 && unit.gearId === 'pyreHeart' && !unit.pyreHeartUsed) {
    unit.pyreHeartUsed = true;
    unit.pyreHeartPending = unit.stokeStacks;
    unit.lastProc = 'pyreHeart';
  }

  if (unit.currentHP <= 0) {
    unit.alive = false;
    if (unit.tel.fell === null) unit.tel.fell = round;
  }

  // Early Wall (Earlier dial): widen the shield trigger from 50% to 60% HP.
  // Hardplate (Stronger dial): shield absorbs 28% maxHP instead of 20%.
  const shieldThreshold = unit.dials?.has('earlyWall') ? 0.6 : 0.5;
  const shieldFrac = unit.dials?.has('hardplate') ? 0.28 : 0.2;
  if (
    unit.archetype === 'Guardian' &&
    !unit.hasShielded &&
    unit.alive &&
    unit.currentHP <= unit.maxHP * shieldThreshold
  ) {
    unit.shield = Math.floor(unit.maxHP * shieldFrac);
    unit.hasShielded = true;
    unit.tel.shieldTriggers += 1;
    // Early Wall only "did something" if the wall came up in the 50–60% band.
    if (unit.dials?.has('earlyWall') && unit.currentHP > unit.maxHP * 0.5) unit.earlyWallPending = true;
    if (unit.dials?.has('hardplate')) unit.hardplatePending = true;
  }

  if (
    unit.gearId === 'ironhide' &&
    unit.ironhideUses < oneShotCap &&
    unit.hasShielded &&
    prevShield > 0 &&
    unit.shield === 0
  ) {
    unit.shield = Math.floor(unit.maxHP * (unit.dials?.has('hardplate') ? 0.15 : 0.1));
    unit.ironhideUses += 1;
    unit.lastProc = 'ironhide';
    if (unit.ironhideUses > 1) unit.hairTriggerFired = true;
  }

  // Mirrorplate: on first shield break, release half the damage absorbed so far
  // as a burst back at the attacker (applied by the caller, which has the actor).
  if (
    unit.gearId === 'mirrorplate' &&
    unit.mirrorBurstUses < oneShotCap &&
    unit.hasShielded &&
    prevShield > 0 &&
    unit.shield === 0
  ) {
    const burstFrac = unit.dials?.has('hardplate') ? 0.7 : 0.5;
    unit.mirrorBurstUses += 1;
    unit.mirrorBurstPending = Math.max(1, Math.floor(unit.tel.shieldAbsorbed * burstFrac));
    unit.lastProc = 'mirrorplate';
    if (unit.mirrorBurstUses > 1) unit.hairTriggerFired = true;
  }

  return realHpDmg;
}

// ─── Targeting ────────────────────────────────────────────────────────────────
function pickTarget(actor, enemies, lastSquadTarget, rng) {
  const alive = enemies.filter((u) => u.alive);
  if (alive.length === 0) return null;

  const guardians = alive.filter((u) => u.archetype === 'Guardian');
  const pool = guardians.length > 0 ? guardians : alive;

  // ── Signature targeting (vC-F) — these override the archetype taunt rule ──
  // Flank (Fang): bypass the taunt, dive the protected backline (non-Guardians).
  if (actor.sig === 'flank') {
    const backline = alive.filter((u) => u.archetype !== 'Guardian');
    const flankPool = backline.length > 0 ? backline : alive;
    return flankPool.reduce((best, u) => (u.currentHP < best.currentHP ? u : best));
  }
  // Bloodscent (Claw): ignore taunt, always hunt the globally lowest-HP enemy.
  if (actor.sig === 'bloodscent') {
    return alive.reduce((best, u) => (u.currentHP < best.currentHP ? u : best));
  }

  switch (actor.archetype) {
    case 'Guardian':
      return pool.reduce((best, u) => (u.currentAttack > best.currentAttack ? u : best));
    case 'Echo': {
      const last = lastSquadTarget ? pool.find((u) => u.id === lastSquadTarget) : null;
      return last || pool.reduce((best, u) => (u.currentHP > best.currentHP ? u : best));
    }
    case 'Swift':
      return pool.reduce((best, u) => (u.currentHP < best.currentHP ? u : best));
    case 'Spark':
      return pool.reduce((best, u) => (u.currentHP > best.currentHP ? u : best));
    default:
      return pool[0];
  }
}

// ─── Outcome / coaching (same as battle.js) ──────────────────────────────────
function generateOutcome(winner, rounds, unitsA, unitsB) {
  const side = winner === 'A' ? 'Squad A' : 'Squad B';
  const winUnits = winner === 'A' ? unitsA : unitsB;

  if (rounds >= 10) {
    const winSquad = winner === 'A' ? unitsA : unitsB;
    const standing = winSquad.filter((u) => u.alive).length;
    return `Neither squad broke in 10 rounds — ${side} kept more units standing (${standing}) and took the timeout victory.`;
  }

  const sparks = winUnits.filter((u) => u.archetype === 'Spark' && u.alive);
  const scaledSpark = sparks.find((e) => e.stokeStacks >= 5);
  if (scaledSpark)
    return `${scaledSpark.name} scaled to ${scaledSpark.stokeStacks} Stoke stacks by round ${scaledSpark.tel.roundReachedPeak}, converting patience into decisive damage.`;

  const swifts = winUnits.filter((u) => u.archetype === 'Swift');
  const execKills = swifts.reduce((s, p) => s + p.tel.executeKills, 0);
  const guardians = winUnits.filter((u) => u.archetype === 'Guardian' && u.alive);
  if (execKills > 0 && guardians.length > 0) {
    const guardian = guardians[0];
    const swift = swifts[0];
    return `${guardian.name} locked enemy fire and kept the front intact while ${swift.name} closed out low-HP targets with ${execKills} execute strike${execKills > 1 ? 's' : ''}.`;
  }
  if (execKills > 0)
    return `${side}'s Swift secured ${execKills} execute kill${execKills > 1 ? 's' : ''}, eliminating wounded targets before they could recover.`;

  const echos = winUnits.filter((u) => u.archetype === 'Echo');
  const echoTotal = echos.reduce((s, r) => s + r.tel.echoDamage, 0);
  const echoEvents = echos.reduce((s, r) => s + r.tel.echoEvents, 0);
  if (echoEvents >= 5)
    return `${side}'s Echo network fired ${echoEvents} echoes for ${Math.round(echoTotal)} bonus damage — sustained amplification decided the fight.`;

  if (guardians.length > 0) {
    const absorbed = guardians.reduce((s, a) => s + a.tel.shieldAbsorbed, 0);
    return absorbed > 0
      ? `${guardians[0].name} held the frontline and shielded ${Math.round(absorbed)} damage, giving ${side}'s squad the HP cushion they needed.`
      : `${guardians[0].name} absorbed sustained pressure and kept ${side}'s squad intact through round ${rounds}.`;
  }

  return `${side} won in round ${rounds} through superior damage output and favorable targeting.`;
}

function generateCoaching(winner, rounds, unitsA, unitsB) {
  const all = [...unitsA, ...unitsB];

  const scaledSpark = all.find((u) => u.archetype === 'Spark' && u.alive && u.stokeStacks >= 6);
  if (scaledSpark) return `Spark scaled uncontested — no burst to answer it.`;

  const swifts = all.filter((u) => u.archetype === 'Swift');
  if (swifts.length > 0 && swifts.every((p) => p.tel.executeHits === 0))
    return `Swift found no execute opportunities — targets stayed above threshold.`;

  const echos = all.filter((u) => u.archetype === 'Echo');
  const lowEcho = echos.find((r) => r.tel.echoEvents < 3);
  if (lowEcho) return `Echo had low value: squad effects were sparse.`;

  const squadAHasGuardian = unitsA.some((u) => u.archetype === 'Guardian');
  if (winner === 'B' && !squadAHasGuardian)
    return `Squad lacked stabilization — no Guardian to absorb pressure.`;

  return '';
}

function gatherGearProcs(battleLog) {
  const procs = [];
  for (const { round, events } of battleLog) {
    for (const e of events) {
      if (e.type === 'gear_proc')
        procs.push({ unitName: e.actorName, callout: e.callout, round, gearId: e.gearId });
    }
  }
  return procs;
}

function computeThreat(unit) {
  const hpNorm = unit.hp / 500;
  const atkNorm = unit.attack / 50;
  const spdNorm = unit.speed / 10;
  const scaling = unit.archetype === 'Spark' ? 1.4 : 1.0;
  return (hpNorm * 0.35 + atkNorm * 0.45 + spdNorm * 0.2) * scaling;
}

let _uidCounter = 0;
function initUnit(creature, squad) {
  // Phase 17: scale combat stats by level (identity at L1). Override the raw
  // hp/attack/armor so every downstream read sees the leveled values; speed
  // is intentionally left unscaled.
  const eff = applyLevel(creature);
  return {
    ...eff,
    _uid: `${creature.instanceId ?? creature.id}_${squad}_${_uidCounter++}`,
    squad,
    currentHP: creature.currentHP ?? eff.hp,
    maxHP: eff.hp,
    currentAttack: eff.attack,
    shield: 0,
    hasShielded: false,
    stokeStacks: 0,
    alive: true,
    threat: computeThreat(eff),
    lastProc: null,
    // Creature signature (vC-F). `bankedHeat` is implemented as an existing dial,
    // so Cinder's innate version just seeds that dial; all others read sig below.
    signature: creature.signature ?? null,
    sig: creature.signature?.live ? creature.signature.id : null,
    dials: new Set([
      ...(creature.moduleIds ?? []),
      ...(creature.signature?.live && creature.signature.id === 'bankedHeat' ? ['bankedHeat'] : []),
    ]),
    ironhideUses: 0,
    lastwallUses: 0,
    mirrorBurstUses: 0,
    hairTriggerFired: false,
    earlyWallPending: false,
    hardplatePending: false,
    quickstrikeCountThisRound: 0,
    firstEchoFiredThisRound: false,
    mirrorBurstPending: 0,
    pyreHeartUsed: false,
    pyreHeartPending: 0,
    openChannelMark: false,
    killMomentumCountThisRound: 0,
    execThreshWideThisRound: false,
    sentinelUsedThisRound: false,
    anchored: false,
    actedThisRound: false,
    resonateSpent: false,
    shieldBank: 0,        // Vault signature: accrued team-shield reserve
    cascadeLastRound: -99, // Nexus signature: round its cascade last fired
    lastStrikeAttack: 0,   // last attack value used (for cascade replay)
    tel: {
      damageDealt: 0,
      damageTaken: 0,
      shieldAbsorbed: 0,
      shieldTriggers: 0,
      echoEvents: 0,
      echoDamage: 0,
      executeHits: 0,
      executeKills: 0,
      standardKills: 0,
      largestHit: 0,
      peakStacks: 0,
      roundReachedPeak: 0,
      damagePercent: 0,
      fell: null,
    },
  };
}

// Safe read-only snapshot for yield values (no circular refs)
function snap(units) {
  return units.map((u) => ({
    uid: u._uid,
    id: u.id,
    instanceId: u.instanceId,
    name: u.name,
    archetype: u.archetype,
    squad: u.squad,
    currentHP: Math.max(0, u.currentHP),
    maxHP: u.maxHP,
    shield: u.shield,
    alive: u.alive,
    stokeStacks: u.stokeStacks,
    currentAttack: Math.round(u.currentAttack),
    gearId: u.gearId ?? null,
    moduleIds: u.moduleIds ?? [],
    anchored: u.anchored ?? false,
    actedThisRound: u.actedThisRound ?? false,
  }));
}

// ─── Battle step generator ────────────────────────────────────────────────────
// Yields { type: 'pending_action', ... } before each action (intervention point).
// Yields { type: 'action_resolved', ... } after each action (display point).
// Returns the same shape as battle() when the generator is exhausted.
//
// To advance without intervening: gen.next(null)
// To redirect: gen.next({ type: 'redirect', actorId, newTargetId })
// Drive the step engine to completion with no interventions and return the
// final result object. The single synchronous entry point for non-interactive
// battles (wild captures, retry) — interactive play uses the generator directly.
export function resolveBattle(squadA, squadB, seed, modifiers) {
  const gen = battleStepEngine(squadA, squadB, seed, modifiers);
  let step = gen.next();
  while (!step.done) step = gen.next(null);
  return step.value;
}

// `modifiers` (optional) — battle-level rule overrides set by a contract frame.
//   singleTargetDamageScale: scales the PRIMARY (single-target) attack only;
//   chains, spreads, echoes and detonations are unaffected (§20.8.5 "Hold the
//   Crossing"). Defaulting to an empty object keeps every existing battle
//   byte-identical (golden tests must stay green).
export function* battleStepEngine(squadA, squadB, seed, modifiers = {}) {
  const rng = createRng(seed);
  const singleTargetScale = modifiers.singleTargetDamageScale ?? 1;

  const unitsA = squadA.map((u) => initUnit(u, 'A'));
  const unitsB = squadB.map((u) => initUnit(u, 'B'));

  const lastSquadTarget = { A: null, B: null };
  let winner = null;
  let finalRound = 10;
  const battleLog = [];

  // Glasswork Core: convert all armor into raw attack at init (a glass cannon).
  const initEvents = [];
  for (const u of [...unitsA, ...unitsB]) {
    if (u.gearId === 'glassworkCore' && u.armor > 0) {
      const converted = u.armor;
      u.attack += converted;
      u.currentAttack += converted;
      u.armor = 0;
      initEvents.push({ actorId: u.id, actorName: u.name, actorSquad: u.squad, type: 'gear_proc', gearId: 'glassworkCore', callout: 'GLASSWORK' });
    }
  }
  if (initEvents.length) battleLog.push({ round: 0, events: initEvents });

  for (let round = 1; round <= 10; round++) {
    finalRound = round;
    const aliveA = unitsA.filter((u) => u.alive);
    const aliveB = unitsB.filter((u) => u.alive);
    if (aliveA.length === 0 || aliveB.length === 0) break;

    for (const unit of [...unitsA, ...unitsB]) {
      unit.quickstrikeCountThisRound = 0;
      unit.firstEchoFiredThisRound = false;
      unit.killMomentumCountThisRound = 0;
      unit.execThreshWideThisRound = false;
      unit.sentinelUsedThisRound = false;
      unit.interceptUsedThisRound = false;
      unit.actedThisRound = false;
      unit.resonateSpent = false;
    }

    const turnOrder = [...aliveA, ...aliveB].sort((a, b) => {
      if (b.speed !== a.speed) return b.speed - a.speed;
      return rng() - 0.5;
    });

    const roundEvents = [];

    for (const actor of turnOrder) {
      if (!actor.alive) continue;

      if (actor.anchored) {
        actor.anchored = false;
        actor.actedThisRound = true;
        roundEvents.push({ type: 'anchor_skip', actorId: actor.id, actorName: actor.name, actorSquad: actor.squad, callout: 'ANCHORED' });
        yield { type: 'anchored', round, actorId: actor._uid, actorSquad: actor.squad, actorName: actor.name, unitsA: snap(unitsA), unitsB: snap(unitsB) };
        continue;
      }

      // Resonate skip: this unit already spent its action on a synchronized
      // strike earlier this round (pulled forward by a player Resonate).
      if (actor.resonateSpent) {
        actor.resonateSpent = false;
        actor.actedThisRound = true;
        roundEvents.push({ type: 'resonance_skip', actorId: actor.id, actorName: actor.name, actorSquad: actor.squad, callout: 'RESONANCE SPENT' });
        yield { type: 'resonance_skip', round, actorId: actor._uid, actorSquad: actor.squad, actorName: actor.name, unitsA: snap(unitsA), unitsB: snap(unitsB) };
        continue;
      }

      const enemies = actor.squad === 'A' ? unitsB : unitsA;
      const allies = actor.squad === 'A' ? unitsA : unitsB;
      const aliveEnemies = enemies.filter((u) => u.alive);
      if (aliveEnemies.length === 0) break;

      actor.allies = allies;
      const proposedTarget = pickTarget(actor, enemies, lastSquadTarget[actor.squad], rng);
      if (!proposedTarget) continue;

      // ── PAUSE POINT: yield before resolving the action ────────────────────
      const intervention = yield {
        type: 'pending_action',
        round,
        actorId: actor._uid,
        actorSquad: actor.squad,
        actor: {
          uid: actor._uid,
          id: actor.id,
          instanceId: actor.instanceId,
          name: actor.name,
          archetype: actor.archetype,
          currentHP: Math.max(0, actor.currentHP),
          maxHP: actor.maxHP,
        },
        proposedTarget: {
          uid: proposedTarget._uid,
          id: proposedTarget.id,
          name: proposedTarget.name,
          archetype: proposedTarget.archetype,
          currentHP: Math.max(0, proposedTarget.currentHP),
          maxHP: proposedTarget.maxHP,
        },
        aliveEnemies: aliveEnemies.map((u) => ({
          uid: u._uid,
          id: u.id,
          name: u.name,
          archetype: u.archetype,
          currentHP: Math.max(0, u.currentHP),
          maxHP: u.maxHP,
          stokeStacks: u.stokeStacks,
        })),
        resonancePartners: allies
          .filter((u) => u.alive && !u.actedThisRound && u._uid !== actor._uid)
          .map((u) => ({
            uid: u._uid,
            id: u.id,
            name: u.name,
            archetype: u.archetype,
            currentHP: Math.max(0, u.currentHP),
            maxHP: u.maxHP,
          })),
        // Player-side active signatures that are charged and ready to spend.
        squadActives: [
          ...(() => {
            const v = unitsA.find((u) => u.alive && u.sig === 'bank' && u.shieldBank > 0);
            return v ? [{ type: 'release', unitName: v.name, amount: v.shieldBank }] : [];
          })(),
          ...(() => {
            const n = unitsA.find((u) => u.alive && u.sig === 'cascade' && round - u.cascadeLastRound >= 3);
            return n ? [{ type: 'cascade', unitName: n.name }] : [];
          })(),
        ],
        unitsA: snap(unitsA),
        unitsB: snap(unitsB),
      };

      // Apply redirect if valid
      let target = proposedTarget;
      if (intervention?.type === 'redirect' && intervention.actorId === actor._uid) {
        const redirected = enemies.find(
          (u) => u._uid === intervention.newTargetId && u.alive,
        );
        if (redirected) target = redirected;
      }
      // Anchor: flag a chosen enemy to skip its next action
      if (intervention?.type === 'anchor' && intervention.targetUid) {
        const u = [...unitsA, ...unitsB].find((x) => x._uid === intervention.targetUid && x.alive);
        if (u) u.anchored = true;
      }
      // Resonate: a free ally is pulled into THIS actor's strike. Resolved after
      // the actor's action (below). The partner must be a living same-squad ally
      // that hasn't acted yet this round.
      let resonancePartner = null;
      if (intervention?.type === 'resonate' && intervention.partnerUid) {
        const p = allies.find(
          (x) => x._uid === intervention.partnerUid && x.alive && !x.actedThisRound && x !== actor,
        );
        if (p) resonancePartner = p;
      }

      // ── Release (Vault active signature, vC-G): spend an intervention to pour
      // the accrued shield bank across all living allies as fresh shield. Instant
      // — does not consume the current actor's action; the round continues.
      if (intervention?.type === 'release') {
        // Player-side: always the A squad, regardless of whose turn we paused on.
        const vault = unitsA.find((u) => u.alive && u.sig === 'bank' && u.shieldBank > 0);
        if (vault) {
          const recipients = unitsA.filter((u) => u.alive);
          const each = Math.round(vault.shieldBank / recipients.length);
          for (const ally of recipients) ally.shield += each;
          roundEvents.push({ actorId: vault.id, actorName: vault.name, actorSquad: vault.squad, damage: vault.shieldBank, type: 'signature_proc', sig: 'bank', callout: `RELEASE (+${each} shield each)` });
          vault.shieldBank = 0;
        }
      }

      // ── Cascade (Nexus active signature, vC-G): spend an intervention to have
      // every living ally fire a synchronized 0.5× strike on its best target — the
      // burst turn. Charge-gated (once per 3 rounds), enforced runner-side too.
      if (intervention?.type === 'cascade') {
        const nexus = unitsA.find((u) => u.alive && u.sig === 'cascade');
        if (nexus && round - nexus.cascadeLastRound >= 3) {
          nexus.cascadeLastRound = round;
          for (const ally of unitsA.filter((u) => u.alive)) {
            const t = pickTarget(ally, unitsB, lastSquadTarget.A, rng);
            if (!t) continue;
            const cRaw = ally.currentAttack * 0.5;
            const cWas = t.alive;
            const cActual = applyDamage(t, calcDamage(cRaw, t.armor), round);
            ally.tel.damageDealt += cActual;
            if (cWas && !t.alive) ally.tel.standardKills += 1;
            roundEvents.push({ actorId: ally.id, actorName: ally.name, actorSquad: ally.squad, targetId: t.id, targetName: t.name, damage: cActual, killed: cWas && !t.alive, type: 'signature_proc', sig: 'cascade', callout: 'CASCADE' });
          }
        }
      }

      const wasPlayerRedirect = target !== proposedTarget;

      // Sentinel (overwatch intercept): the first enemy attack each round aimed
      // at a non-Sentinel ally is pulled onto an alive Sentinel Guardian, which
      // eats the hit instead. A once-per-round reaction-taunt — the defensive
      // half of "reaction topology." An explicit player redirect is treated as a
      // manual override and suppresses the automatic intercept.
      if (!wasPlayerRedirect) {
        const defenders = target.squad === 'A' ? unitsA : unitsB;
        const sentinel = defenders.find(
          (u) => u.alive && u.gearId === 'sentinel' && u._uid !== target._uid && !u.sentinelUsedThisRound,
        );
        if (sentinel) {
          sentinel.sentinelUsedThisRound = true;
          const guarded = target;
          target = sentinel;
          roundEvents.push({
            actorId: sentinel.id, actorName: sentinel.name, actorSquad: sentinel.squad,
            targetId: guarded.id, targetName: guarded.name,
            type: 'gear_proc', gearId: 'sentinel', callout: 'INTERCEPT',
          });
        }
      }

      // Intercept (Bastion signature, vC-F): the dedicated bodyguard. Once per
      // round, the first hit aimed at a wounded ally is pulled onto a living
      // Bastion. Same reaction-taunt shape as Sentinel, but creature-innate.
      if (!wasPlayerRedirect) {
        const defenders = target.squad === 'A' ? unitsA : unitsB;
        const bastion = defenders.find(
          (u) => u.alive && u.sig === 'intercept' && u._uid !== target._uid && !u.interceptUsedThisRound,
        );
        if (bastion) {
          bastion.interceptUsedThisRound = true;
          const guarded = target;
          target = bastion;
          roundEvents.push({
            actorId: bastion.id, actorName: bastion.name, actorSquad: bastion.squad,
            targetId: guarded.id, targetName: guarded.name,
            type: 'signature_proc', sig: 'intercept', callout: 'INTERCEPT',
          });
        }
      }

      // ── Resolve the action ────────────────────────────────────────────────
      lastSquadTarget[actor.squad] = target.id;

      // Deep Cut (Wider dial): execute window widens 30% → 42% of target HP.
      const baseExecT = actor.dials.has('deepCut') ? 0.42 : 0.3;
      const execT = actor.execThreshWideThisRound ? Math.max(0.45, baseExecT) : baseExecT;
      let rawAttack = actor.currentAttack;
      let isExecute = false;
      let deepCutProc = false;
      if (actor.archetype === 'Swift' && target.currentHP < target.maxHP * execT) {
        rawAttack *= 2;
        isExecute = true;
        // Deep Cut "did something" when the target sat in the 30–42% band.
        if (actor.dials.has('deepCut') && target.currentHP >= target.maxHP * 0.3) deepCutProc = true;
      }

      // Open Channel: a marked target makes the next ally hit on it empowered.
      let openChannelProc = false;
      if (target.openChannelMark) {
        rawAttack = Math.floor(rawAttack * 1.3);
        target.openChannelMark = false;
        openChannelProc = true;
      }

      // Single-target modifier (§20.8.5): a contract may halve the primary hit.
      // Spreads/chains/echoes/detonations below are deliberately left at full.
      let effectiveDamage = calcDamage(rawAttack, target.armor);
      if (singleTargetScale !== 1) effectiveDamage = Math.max(1, Math.round(effectiveDamage * singleTargetScale));

      const targetWasAlive = target.alive;
      const actualDmg = applyDamage(target, effectiveDamage, round);

      actor.tel.damageDealt += actualDmg;
      if (actualDmg > actor.tel.largestHit) actor.tel.largestHit = actualDmg;
      if (isExecute) actor.tel.executeHits += 1;

      const killed = targetWasAlive && !target.alive;
      if (killed) {
        if (isExecute) actor.tel.executeKills += 1;
        else actor.tel.standardKills += 1;
      }

      // Sunder (Striker signature, vC-F): the shield-breaker. Each hit strips a
      // chunk of the target's armor (permanent) and shaves remaining shield —
      // cracks enemy tanks open for the rest of the squad.
      let sunderProc = false;
      if (actor.sig === 'sunder' && target.alive) {
        const before = target.armor;
        target.armor = Math.max(0, target.armor - 6);
        if (target.shield > 0) target.shield = Math.floor(target.shield * 0.5);
        if (target.armor < before) sunderProc = true;
      }
      if (sunderProc) roundEvents.push({
        actorId: actor.id, actorName: actor.name, actorSquad: actor.squad,
        targetId: target.id, targetName: target.name,
        type: 'signature_proc', sig: 'sunder', callout: 'SUNDER',
      });

      roundEvents.push({
        actorId: actor.id,
        actorName: actor.name,
        actorSquad: actor.squad,
        targetId: target.id,
        targetName: target.name,
        damage: actualDmg,
        isExecute,
        killed,
        type: 'attack',
        wasRedirected: wasPlayerRedirect,
      });

      if (target.lastProc === 'ironhide') {
        roundEvents.push({ actorId: target.id, actorName: target.name, actorSquad: target.squad, type: 'gear_proc', gearId: 'ironhide', callout: 'Shield Reformed' });
      }
      if (target.lastProc === 'lastwall') {
        roundEvents.push({ actorId: target.id, actorName: target.name, actorSquad: target.squad, type: 'gear_proc', gearId: 'lastwall', callout: 'LAST STAND' });
      }

      if (target.lastwallUses > 0 && actor.alive) {
        const reflection = Math.max(1, Math.floor(actualDmg * 0.3));
        actor.currentHP = Math.max(0, actor.currentHP - reflection);
        actor.tel.damageTaken += reflection;
        if (actor.currentHP <= 0 && actor.alive) {
          actor.alive = false;
          if (actor.tel.fell === null) actor.tel.fell = round;
        }
        roundEvents.push({ actorId: target.id, actorName: target.name, actorSquad: target.squad, targetId: actor.id, targetName: actor.name, damage: reflection, type: 'gear_proc', gearId: 'lastwall', callout: 'LAST STAND' });
      }

      if (target.lastProc === 'mirrorplate' && target.mirrorBurstPending > 0 && actor.alive) {
        const burst = target.mirrorBurstPending;
        target.mirrorBurstPending = 0;
        actor.currentHP = Math.max(0, actor.currentHP - burst);
        actor.tel.damageTaken += burst;
        if (actor.currentHP <= 0 && actor.alive) {
          actor.alive = false;
          if (actor.tel.fell === null) actor.tel.fell = round;
        }
        roundEvents.push({ actorId: target.id, actorName: target.name, actorSquad: target.squad, targetId: actor.id, targetName: actor.name, damage: burst, type: 'gear_proc', gearId: 'mirrorplate', callout: 'MIRROR BURST' });
      }

      if (openChannelProc) roundEvents.push({ actorId: actor.id, actorName: actor.name, actorSquad: actor.squad, targetId: target.id, targetName: target.name, type: 'gear_proc', gearId: 'openChannel', callout: 'OPEN CHANNEL' });
      if (deepCutProc) roundEvents.push({ actorId: actor.id, actorName: actor.name, actorSquad: actor.squad, targetId: target.id, targetName: target.name, type: 'module_proc', moduleId: 'deepCut', callout: 'DEEP CUT' });
      // Early Wall / Hardplate fired inside applyDamage(target); surface them now.
      if (target.earlyWallPending) { target.earlyWallPending = false; roundEvents.push({ actorId: target.id, actorName: target.name, actorSquad: target.squad, type: 'module_proc', moduleId: 'earlyWall', callout: 'EARLY WALL' }); }
      if (target.hardplatePending) { target.hardplatePending = false; roundEvents.push({ actorId: target.id, actorName: target.name, actorSquad: target.squad, type: 'module_proc', moduleId: 'hardplate', callout: 'HARDPLATE' }); }
      if (target.hairTriggerFired) { target.hairTriggerFired = false; roundEvents.push({ actorId: target.id, actorName: target.name, actorSquad: target.squad, type: 'module_proc', moduleId: 'hairTrigger', callout: 'HAIR TRIGGER' }); }

      // Quickstrike: a kill refunds an action. Second Wind lets the chain extend
      // to a 2nd bonus action when the first one also kills.
      const quickstrikeCap = actor.dials.has('secondWind') ? 2 : 1;
      let quickstrikeChainKilled = killed;
      while (quickstrikeChainKilled && actor.gearId === 'quickstrike' && actor.quickstrikeCountThisRound < quickstrikeCap && actor.alive) {
        actor.quickstrikeCountThisRound += 1;
        if (actor.quickstrikeCountThisRound > 1) roundEvents.push({ actorId: actor.id, actorName: actor.name, actorSquad: actor.squad, type: 'module_proc', moduleId: 'secondWind', callout: 'SECOND WIND' });
        const bonusTarget = pickTarget(actor, enemies, lastSquadTarget[actor.squad], rng);
        if (!bonusTarget || !bonusTarget.alive) break;
        let bonusRaw = actor.currentAttack;
        if (actor.archetype === 'Swift' && bonusTarget.currentHP < bonusTarget.maxHP * baseExecT) bonusRaw *= 2;
        const bonusEff = calcDamage(bonusRaw, bonusTarget.armor);
        const bonusWasAlive = bonusTarget.alive;
        const bonusActual = applyDamage(bonusTarget, bonusEff, round);
        actor.tel.damageDealt += bonusActual;
        if (bonusActual > actor.tel.largestHit) actor.tel.largestHit = bonusActual;
        const bonusKilled = bonusWasAlive && !bonusTarget.alive;
        if (bonusKilled) actor.tel.standardKills += 1;
        roundEvents.push({ actorId: actor.id, actorName: actor.name, actorSquad: actor.squad, targetId: bonusTarget.id, targetName: bonusTarget.name, damage: bonusActual, killed: bonusKilled, type: 'gear_proc', gearId: 'quickstrike', callout: 'EXTRA ACTION' });
        lastSquadTarget[actor.squad] = bonusTarget.id;
        quickstrikeChainKilled = bonusKilled;
      }

      // Killing Momentum: each kill refunds an action and widens this unit's
      // execute window for the round. Second Wind raises the cap 2 → 3.
      const momentumCap = actor.dials.has('secondWind') ? 3 : 2;
      if (killed && actor.gearId === 'killingMomentum' && actor.killMomentumCountThisRound < momentumCap && actor.alive) {
        if (actor.killMomentumCountThisRound >= 2) roundEvents.push({ actorId: actor.id, actorName: actor.name, actorSquad: actor.squad, type: 'module_proc', moduleId: 'secondWind', callout: 'SECOND WIND' });
        actor.killMomentumCountThisRound += 1;
        actor.execThreshWideThisRound = true;
        const bonusTarget = pickTarget(actor, enemies, lastSquadTarget[actor.squad], rng);
        if (bonusTarget && bonusTarget.alive) {
          let bonusRaw = actor.currentAttack;
          if (actor.archetype === 'Swift' && bonusTarget.currentHP < bonusTarget.maxHP * 0.45) bonusRaw *= 2;
          const bonusEff = calcDamage(bonusRaw, bonusTarget.armor);
          const bonusWasAlive = bonusTarget.alive;
          const bonusActual = applyDamage(bonusTarget, bonusEff, round);
          actor.tel.damageDealt += bonusActual;
          if (bonusActual > actor.tel.largestHit) actor.tel.largestHit = bonusActual;
          const bonusKilled = bonusWasAlive && !bonusTarget.alive;
          if (bonusKilled) actor.tel.standardKills += 1;
          roundEvents.push({ actorId: actor.id, actorName: actor.name, actorSquad: actor.squad, targetId: bonusTarget.id, targetName: bonusTarget.name, damage: bonusActual, killed: bonusKilled, type: 'gear_proc', gearId: 'killingMomentum', callout: 'MOMENTUM' });
        }
      }

      // Kindling
      if (killed) {
        const deadSquad = target.squad === 'A' ? unitsA : unitsB;
        for (const sp of deadSquad) {
          if (sp.alive && sp.archetype === 'Spark' && sp.gearId === 'kindling' && sp !== target) {
            const gain = sp.dials.has('bankedHeat') ? 3 : 2;
            sp.stokeStacks += gain;
            sp.currentAttack = sparkAttack(sp);
            roundEvents.push({ actorId: sp.id, actorName: sp.name, actorSquad: sp.squad, type: 'gear_proc', gearId: 'kindling', callout: 'Flame Inherited' });
            if (sp.dials.has('bankedHeat')) roundEvents.push({ actorId: sp.id, actorName: sp.name, actorSquad: sp.squad, type: 'module_proc', moduleId: 'bankedHeat', callout: 'BANKED HEAT' });
          }
        }
      }

      // Pyre Heart: when it falls, pass its built-up Stoke to the highest-Stoke
      // ally and detonate for AoE on the enemy squad.
      if (target.lastProc === 'pyreHeart') {
        const allySquad = target.squad === 'A' ? unitsA : unitsB;
        const enemySquad = target.squad === 'A' ? unitsB : unitsA;
        const heirs = allySquad.filter((u) => u.alive && u !== target);
        if (heirs.length && target.pyreHeartPending > 0) {
          heirs.sort((a, b) => b.stokeStacks - a.stokeStacks);
          const heir = heirs[0];
          heir.stokeStacks += target.pyreHeartPending + (heir.dials.has('bankedHeat') ? 1 : 0);
          heir.currentAttack = sparkAttack(heir);
        }
        // Backdraft (Stronger dial): Pyre detonation hits wider.
        const burst = target.dials.has('backdraft')
          ? Math.max(1, 12 + 6 * target.pyreHeartPending)
          : Math.max(1, 8 + 4 * target.pyreHeartPending);
        for (const e of enemySquad.filter((u) => u.alive)) {
          e.currentHP = Math.max(0, e.currentHP - burst);
          e.tel.damageTaken += burst;
          if (e.currentHP <= 0 && e.alive) { e.alive = false; if (e.tel.fell === null) e.tel.fell = round; }
        }
        roundEvents.push({ actorId: target.id, actorName: target.name, actorSquad: target.squad, damage: burst, type: 'gear_proc', gearId: 'pyreHeart', callout: 'PASS THE FLAME' });
      }

      // Echo
      if (actor.archetype !== 'Echo') {
        const echoAllies = allies.filter((u) => u.alive && u.archetype === 'Echo' && u !== actor);
        for (const echo of echoAllies) {
          if (!target.alive) continue;
          const isFirstEcho = !echo.firstEchoFiredThisRound;
          const resonatorActive = echo.gearId === 'resonator' && isFirstEcho;
          // Pure Tone (Stronger dial): echoes ring louder — base 0.5 → 0.65, resonator 1.0 → 1.15.
          const pureTone = echo.dials.has('pureTone');
          // Amplify (Conduit signature, vC-F): its echo rings at full strength
          // (1.0) instead of the base half — drafts to double your carry's hit.
          const amplify = echo.sig === 'amplify';
          const echoPower = amplify
            ? (resonatorActive ? (pureTone ? 1.3 : 1.15) : (pureTone ? 1.15 : 1.0))
            : (resonatorActive ? (pureTone ? 1.15 : 1.0) : (pureTone ? 0.65 : 0.5));
          const jumpPower = pureTone ? 0.65 : 0.5;
          if (isFirstEcho && pureTone) roundEvents.push({ actorId: echo.id, actorName: echo.name, actorSquad: echo.squad, type: 'module_proc', moduleId: 'pureTone', callout: 'PURE TONE' });
          echo.firstEchoFiredThisRound = true;
          const echoRaw = actor.currentAttack * echoPower;
          const echoDmg = calcDamage(echoRaw, target.armor);
          const echoActual = applyDamage(target, echoDmg, round);
          echo.tel.echoEvents += 1;
          echo.tel.echoDamage += echoActual;
          echo.tel.damageDealt += echoActual;
          if (!target.alive) echo.tel.standardKills += 1;
          roundEvents.push({ actorId: echo.id, actorName: echo.name, actorSquad: echo.squad, targetId: target.id, targetName: target.name, damage: echoActual, isExecute: false, killed: !target.alive, type: resonatorActive ? 'gear_proc' : 'echo', gearId: resonatorActive ? 'resonator' : null, callout: resonatorActive ? 'Resonance' : null });
          if (echo.gearId === 'chainlink' || echo.gearId === 'openChannel') {
            // Long Echo (Wider dial): chains jump to one additional target.
            const jumpCount = echo.dials.has('longEcho') ? 2 : 1;
            const jumpTargets = enemies.filter((u) => u.alive && u !== target).slice(0, jumpCount);
            jumpTargets.forEach((jumpTarget, jumpIdx) => {
              if (!jumpTarget.alive) return;
              const jumpRaw = actor.currentAttack * jumpPower;
              const jumpDmg = calcDamage(jumpRaw, jumpTarget.armor);
              const jumpActual = applyDamage(jumpTarget, jumpDmg, round);
              echo.tel.echoEvents += 1;
              echo.tel.echoDamage += jumpActual;
              echo.tel.damageDealt += jumpActual;
              if (!jumpTarget.alive) echo.tel.standardKills += 1;
              // Open Channel marks the chained target: next ally hit on it is empowered.
              if (echo.gearId === 'openChannel' && jumpTarget.alive) jumpTarget.openChannelMark = true;
              roundEvents.push({ actorId: echo.id, actorName: echo.name, actorSquad: echo.squad, targetId: jumpTarget.id, targetName: jumpTarget.name, damage: jumpActual, killed: !jumpTarget.alive, type: 'gear_proc', gearId: echo.gearId, callout: echo.gearId === 'openChannel' ? 'OPEN CHANNEL' : 'Echo Jump' });
              if (jumpIdx === 1) roundEvents.push({ actorId: echo.id, actorName: echo.name, actorSquad: echo.squad, targetId: jumpTarget.id, targetName: jumpTarget.name, type: 'module_proc', moduleId: 'longEcho', callout: 'LONG ECHO' });
            });
          }
        }
      }

      // ── Resonance strike: a player-pulled ally adds a clean 1.0× strike onto
      // this actor's target, in the same synchronized burst. No execute doubling,
      // no gear procs — concentration + timing, not damage inflation. The partner
      // forfeits its own turn this round (resonateSpent → resonance_skip beat).
      if (resonancePartner && target.alive) {
        const rRaw = resonancePartner.currentAttack * RESONANCE_RATIO;
        const rEff = calcDamage(rRaw, target.armor);
        const rWasAlive = target.alive;
        const rActual = applyDamage(target, rEff, round);
        resonancePartner.tel.damageDealt += rActual;
        if (rActual > resonancePartner.tel.largestHit) resonancePartner.tel.largestHit = rActual;
        const rKilled = rWasAlive && !target.alive;
        if (rKilled) resonancePartner.tel.standardKills += 1;
        resonancePartner.resonateSpent = true;
        roundEvents.push({ actorId: resonancePartner.id, actorName: resonancePartner.name, actorSquad: resonancePartner.squad, targetId: target.id, targetName: target.name, damage: rActual, killed: rKilled, type: 'resonance', callout: 'RESONANCE' });
      }

      actor.actedThisRound = true;

      const wentA = enemies === unitsB && unitsB.every((u) => !u.alive);
      const wentB = enemies === unitsA && unitsA.every((u) => !u.alive);

      // ── DISPLAY POINT: yield after action so UI can animate the hit ──────
      yield {
        type: 'action_resolved',
        round,
        actorId: actor._uid,
        actorSquad: actor.squad,
        actor: { uid: actor._uid, id: actor.id, name: actor.name, archetype: actor.archetype, currentHP: Math.max(0, actor.currentHP), maxHP: actor.maxHP },
        target: { uid: target._uid, id: target.id, name: target.name, archetype: target.archetype, currentHP: Math.max(0, target.currentHP), maxHP: target.maxHP },
        damage: actualDmg,
        isExecute,
        killed,
        wasRedirected: wasPlayerRedirect,
        events: roundEvents.slice(),
        unitsA: snap(unitsA),
        unitsB: snap(unitsB),
      };

      if (wentA) { winner = 'A'; break; }
      if (wentB) { winner = 'B'; break; }
    }

    battleLog.push({ round, events: roundEvents });
    if (winner) break;

    // End-of-round scaling
    for (const unit of [...unitsA, ...unitsB]) {
      if (!unit.alive) continue;
      // Bank (Vault signature, vC-G): accrue a team-shield reserve each round,
      // capped. The player spends it via the Release intervention.
      if (unit.sig === 'bank') {
        const cap = Math.round(unit.maxHP * 0.45);
        unit.shieldBank = Math.min(cap, unit.shieldBank + Math.round(unit.maxHP * 0.07));
      }
      // Tether (Link signature, vC-G): a defensive Echo — each round it extends a
      // protective shield to the squad's most-wounded ally (it can be itself).
      if (unit.sig === 'tether') {
        const squad = (unit.squad === 'A' ? unitsA : unitsB).filter((u) => u.alive);
        const wounded = squad.reduce((lo, u) => (u.currentHP / u.maxHP < lo.currentHP / lo.maxHP ? u : lo), squad[0]);
        if (wounded) {
          const amt = Math.round(unit.currentAttack * 0.5);
          wounded.shield += amt;
          roundEvents.push({ actorId: unit.id, actorName: unit.name, actorSquad: unit.squad, targetId: wounded.id, targetName: wounded.name, damage: amt, type: 'signature_proc', sig: 'tether', callout: `TETHER (+${amt} shield)` });
        }
      }
      if (unit.archetype === 'Spark') {
        // Banked Heat (Stronger dial): every Stoke gain comes with an extra stack.
        const gain = unit.dials.has('bankedHeat') ? 2 : 1;
        unit.stokeStacks += gain;
        unit.tel.peakStacks = unit.stokeStacks;
        unit.tel.roundReachedPeak = round;
        unit.currentAttack = sparkAttack(unit);
        if (unit.dials.has('bankedHeat')) roundEvents.push({ actorId: unit.id, actorName: unit.name, actorSquad: unit.squad, type: 'module_proc', moduleId: 'bankedHeat', callout: 'BANKED HEAT' });
        if (unit.dials.has('backdraft')) roundEvents.push({ actorId: unit.id, actorName: unit.name, actorSquad: unit.squad, type: 'module_proc', moduleId: 'backdraft', callout: 'BACKDRAFT' });

        // ── Detonation: the charge releases ─────────────────────────────────
        // Sputter (Flicker signature, vC-F): detonates at half the threshold for
        // half the burst — frequent chip pressure instead of one big blast.
        const sputter = unit.sig === 'sputter';
        const detThreshold = sputter ? 2 : SPARK_DETONATE_THRESHOLD;
        if (unit.stokeStacks >= detThreshold) {
          const foes = (unit.squad === 'A' ? unitsB : unitsA).filter((u) => u.alive);
          const burst = Math.round(unit.currentAttack * SPARK_DETONATE_RATIO * (sputter ? 0.5 : 1));
          const hits = [];
          for (const foe of foes) {
            // Aegis (Bulwark signature): spread damage to a squad with a living
            // Bulwark is softened — the anti-Spark anchor.
            const foeSquad = foe.squad === 'A' ? unitsA : unitsB;
            const aegis = foeSquad.some((u) => u.alive && u.sig === 'aegis');
            const effBurst = aegis ? Math.round(burst * 0.6) : burst;
            const was = foe.alive;
            const actual = applyDamage(foe, calcDamage(effBurst, foe.armor), round);
            unit.tel.damageDealt += actual;
            if (actual > unit.tel.largestHit) unit.tel.largestHit = actual;
            const killed = was && !foe.alive;
            if (killed) unit.tel.standardKills += 1;
            hits.push({ targetName: foe.name, damage: actual, killed });
            roundEvents.push({ actorId: unit.id, actorName: unit.name, actorSquad: unit.squad, targetId: foe.id, targetName: foe.name, damage: actual, killed, type: 'detonate', callout: aegis ? 'DETONATE (AEGIS)' : 'DETONATE' });
          }
          unit.stokeStacks = 0;
          unit.currentAttack = sparkAttack(unit);

          // Chain Igniter (Spark signature): its blast feeds allied Sparks,
          // pushing them toward their own detonations — multi-Spark build glue.
          if (unit.sig === 'chainIgniter') {
            const allySparks = (unit.squad === 'A' ? unitsA : unitsB)
              .filter((u) => u.alive && u.archetype === 'Spark' && u._uid !== unit._uid);
            for (const s of allySparks) {
              s.stokeStacks += 2;
              s.currentAttack = sparkAttack(s);
            }
            if (allySparks.length) roundEvents.push({ actorId: unit.id, actorName: unit.name, actorSquad: unit.squad, type: 'signature_proc', sig: 'chainIgniter', callout: 'CHAIN IGNITER' });
          }
          yield {
            type: 'detonation', round,
            actorId: unit._uid, actorSquad: unit.squad, actorName: unit.name,
            hits, unitsA: snap(unitsA), unitsB: snap(unitsB),
          };
        }
      }
    }

    if (unitsA.every((u) => !u.alive)) { winner = 'B'; break; }
    if (unitsB.every((u) => !u.alive)) { winner = 'A'; break; }
  }

  if (!winner) {
    // Timeout (Phase 17): judge by board control, not raw HP pool. A tanky squad
    // shouldn't win purely on HP volume — units still standing dominate, and
    // average squad-health FRACTION is the fine tiebreak. This gives damage
    // dealers a fair timeout instead of handing it to whoever has the biggest
    // HP bar.
    const timeoutScore = (units) => {
      const alive = units.filter((u) => u.alive).length;
      const frac =
        units.reduce((s, u) => s + Math.max(0, u.currentHP) / u.maxHP, 0) / units.length;
      return alive + frac;
    };
    winner = timeoutScore(unitsA) >= timeoutScore(unitsB) ? 'A' : 'B';
  }

  const allUnits = [...unitsA, ...unitsB];
  const totalDmg = allUnits.reduce((s, u) => s + u.tel.damageDealt, 0);
  for (const unit of allUnits) {
    if (unit.archetype === 'Spark' && totalDmg > 0)
      unit.tel.damagePercent = parseFloat(((unit.tel.damageDealt / totalDmg) * 100).toFixed(1));
  }

  const playerWon = winner === 'A';
  // Reward gradient (Phase 17): harder (higher-level) enemies pay more.
  // L1 → 15 (unchanged from the old flat base), L5 → 35.
  const avgEnemyLevel =
    unitsB.reduce((s, u) => s + (u.level ?? 1), 0) / Math.max(1, unitsB.length);
  const baseXp = Math.round(10 + 5 * avgEnemyLevel);
  const xpRewards = {};
  const survivalUpdates = {};
  const battleUpdates = {};
  for (const unit of unitsA) {
    let xp = baseXp;
    if (unit.alive) { xp += 5; survivalUpdates[unit.instanceId] = 1; }
    if (playerWon) xp += 5;
    xpRewards[unit.instanceId] = xp;
    battleUpdates[unit.instanceId] = {
      battleCount: 1,
      winCount: playerWon ? 1 : 0,
      alive: unit.alive,
      enemyNames: unitsB.map((e) => e.name),
    };
  }

  return {
    winner,
    rounds: finalRound,
    telemetry: { squadA: unitsA, squadB: unitsB },
    outcomeText: generateOutcome(winner, finalRound, unitsA, unitsB),
    coachingLine: generateCoaching(winner, finalRound, unitsA, unitsB),
    battleLog,
    seed,
    xpRewards,
    survivalUpdates,
    battleUpdates,
    gearProcs: gatherGearProcs(battleLog),
  };
}
