import { createRng } from './rng.js';
import { MODULES_BY_ID } from '../data/modules.js';

// ─── Damage formula ───────────────────────────────────────────────────────────
function calcDamage(rawAttack, targetArmor) {
  return Math.max(rawAttack - targetArmor, rawAttack * 0.5);
}

// ─── Apply damage (mutates unit) ──────────────────────────────────────────────
function applyDamage(unit, damage, round) {
  let hpDmg = damage;
  unit.lastProc = null;
  const prevShield = unit.shield;

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

  if (unit.currentHP <= 0 && unit.gearId === 'lastwall' && !unit.lastwallUsed) {
    unit.currentHP = 1;
    unit.lastwallUsed = true;
    unit.lastProc = 'lastwall';
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

  if (
    unit.archetype === 'Guardian' &&
    !unit.hasShielded &&
    unit.alive &&
    unit.currentHP <= unit.maxHP * 0.5
  ) {
    unit.shield = Math.floor(unit.maxHP * 0.2);
    unit.hasShielded = true;
    unit.tel.shieldTriggers += 1;
  }

  if (
    unit.gearId === 'ironhide' &&
    !unit.ironhideUsed &&
    unit.hasShielded &&
    prevShield > 0 &&
    unit.shield === 0
  ) {
    unit.shield = Math.floor(unit.maxHP * 0.1);
    unit.ironhideUsed = true;
    unit.lastProc = 'ironhide';
  }

  // Mirrorplate: on first shield break, release half the damage absorbed so far
  // as a burst back at the attacker (applied by the caller, which has the actor).
  if (
    unit.gearId === 'mirrorplate' &&
    !unit.mirrorBurstUsed &&
    unit.hasShielded &&
    prevShield > 0 &&
    unit.shield === 0
  ) {
    unit.mirrorBurstUsed = true;
    unit.mirrorBurstPending = Math.max(1, Math.floor(unit.tel.shieldAbsorbed * 0.5));
    unit.lastProc = 'mirrorplate';
  }

  return realHpDmg;
}

// ─── Targeting ────────────────────────────────────────────────────────────────
function pickTarget(actor, enemies, lastSquadTarget, rng) {
  const alive = enemies.filter((u) => u.alive);
  if (alive.length === 0) return null;

  const guardians = alive.filter((u) => u.archetype === 'Guardian');
  const pool = guardians.length > 0 ? guardians : alive;

  const module = actor.moduleId ? MODULES_BY_ID[actor.moduleId] : null;
  const useBias = rng && rng() < 0.7;

  if (module && useBias) {
    if (actor.moduleId === 'weakpoint') {
      const lowestHP = pool.reduce((best, u) => (u.currentHP < best.currentHP ? u : best));
      if (lowestHP) return lowestHP;
    }
    if (actor.moduleId === 'echoHunter') {
      const echoes = pool.filter((u) => u.archetype === 'Echo');
      if (echoes.length > 0)
        return echoes.reduce((best, u) => (u.currentHP < best.currentHP ? u : best));
    }
    if (actor.moduleId === 'packCall') {
      if (lastSquadTarget) {
        const allyTarget = pool.find((u) => u.id === lastSquadTarget);
        if (allyTarget) return allyTarget;
      }
    }
    if (actor.moduleId === 'protector') {
      if (actor.allies && actor.allies.length > 0)
        return pool.reduce((best, u) => (u.currentAttack > best.currentAttack ? u : best));
    }
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
    const hpA = unitsA.reduce((s, u) => s + u.currentHP, 0);
    const hpB = unitsB.reduce((s, u) => s + u.currentHP, 0);
    const remHP = winner === 'A' ? hpA : hpB;
    return `Neither squad broke in 10 rounds — ${side} held more HP (${Math.round(remHP)}) and took the timeout victory.`;
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
  return {
    ...creature,
    _uid: `${creature.instanceId ?? creature.id}_${squad}_${_uidCounter++}`,
    squad,
    currentHP: creature.currentHP ?? creature.hp,
    maxHP: creature.hp,
    currentAttack: creature.attack,
    shield: 0,
    hasShielded: false,
    stokeStacks: 0,
    slowBurnStacks: 0,
    alive: true,
    threat: computeThreat(creature),
    lastProc: null,
    ironhideUsed: false,
    lastwallUsed: false,
    quickstrikeUsedThisRound: false,
    firstEchoFiredThisRound: false,
    fastStartUsed: false,
    lastAttackedTargetId: null,
    dartActive: false,
    mirrorBurstUsed: false,
    mirrorBurstPending: 0,
    pyreHeartUsed: false,
    pyreHeartPending: 0,
    openChannelMark: false,
    killMomentumCountThisRound: 0,
    execThreshWideThisRound: false,
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
  }));
}

// ─── Battle step generator ────────────────────────────────────────────────────
// Yields { type: 'pending_action', ... } before each action (intervention point).
// Yields { type: 'action_resolved', ... } after each action (display point).
// Returns the same shape as battle() when the generator is exhausted.
//
// To advance without intervening: gen.next(null)
// To redirect: gen.next({ type: 'redirect', actorId, newTargetId })
export function* battleStepEngine(squadA, squadB, seed) {
  const rng = createRng(seed);

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
      unit.quickstrikeUsedThisRound = false;
      unit.firstEchoFiredThisRound = false;
      unit.killMomentumCountThisRound = 0;
      unit.execThreshWideThisRound = false;
    }

    const turnOrder = [...aliveA, ...aliveB].sort((a, b) => {
      if (b.speed !== a.speed) return b.speed - a.speed;
      return rng() - 0.5;
    });

    const roundEvents = [];

    for (const actor of turnOrder) {
      if (!actor.alive) continue;

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
        })),
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

      // ── Resolve the action ────────────────────────────────────────────────
      lastSquadTarget[actor.squad] = target.id;

      const execT = actor.execThreshWideThisRound ? 0.45 : 0.3;
      let rawAttack = actor.currentAttack;
      let isExecute = false;
      if (actor.archetype === 'Swift' && target.currentHP < target.maxHP * execT) {
        rawAttack *= 2;
        isExecute = true;
      }

      // Open Channel: a marked target makes the next ally hit on it empowered.
      let openChannelProc = false;
      if (target.openChannelMark) {
        rawAttack = Math.floor(rawAttack * 1.3);
        target.openChannelMark = false;
        openChannelProc = true;
      }

      let fastStartProc = false;
      let rootedProc = false;
      if (actor.moduleId === 'fastStart' && !actor.fastStartUsed) {
        rawAttack = Math.floor(rawAttack * 1.5);
        actor.fastStartUsed = true;
        fastStartProc = true;
      }
      if (actor.moduleId === 'rooted' && actor.lastAttackedTargetId === target.id) {
        rawAttack = Math.floor(rawAttack * 1.25);
        rootedProc = true;
      }

      let dartProc = false;
      let effectiveDamage = calcDamage(rawAttack, target.armor);
      if (target.moduleId === 'dart' && target.dartActive) {
        effectiveDamage = Math.floor(effectiveDamage * 0.8);
        target.dartActive = false;
        dartProc = true;
      }

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
        wasRedirected: target !== proposedTarget,
      });

      if (target.lastProc === 'ironhide') {
        roundEvents.push({ actorId: target.id, actorName: target.name, actorSquad: target.squad, type: 'gear_proc', gearId: 'ironhide', callout: 'Shield Reformed' });
      }
      if (target.lastProc === 'lastwall') {
        roundEvents.push({ actorId: target.id, actorName: target.name, actorSquad: target.squad, type: 'gear_proc', gearId: 'lastwall', callout: 'LAST STAND' });
      }

      if (target.lastwallUsed && actor.alive) {
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
      if (fastStartProc) roundEvents.push({ actorId: actor.id, actorName: actor.name, actorSquad: actor.squad, type: 'module_proc', moduleId: 'fastStart', callout: 'FAST START' });
      if (rootedProc)    roundEvents.push({ actorId: actor.id, actorName: actor.name, actorSquad: actor.squad, type: 'module_proc', moduleId: 'rooted', callout: 'ROOTED' });
      if (dartProc)      roundEvents.push({ actorId: target.id, actorName: target.name, actorSquad: target.squad, type: 'module_proc', moduleId: 'dart', callout: 'DART' });

      actor.lastAttackedTargetId = target.id;
      if (actor.moduleId === 'dart') actor.dartActive = true;

      // Quickstrike
      if (killed && actor.gearId === 'quickstrike' && !actor.quickstrikeUsedThisRound && actor.alive) {
        actor.quickstrikeUsedThisRound = true;
        const bonusTarget = pickTarget(actor, enemies, lastSquadTarget[actor.squad], rng);
        if (bonusTarget && bonusTarget.alive) {
          let bonusRaw = actor.currentAttack;
          if (actor.archetype === 'Swift' && bonusTarget.currentHP < bonusTarget.maxHP * 0.3) bonusRaw *= 2;
          let bonusEff = calcDamage(bonusRaw, bonusTarget.armor);
          let bonusDartProc = false;
          if (bonusTarget.moduleId === 'dart' && bonusTarget.dartActive) {
            bonusEff = Math.floor(bonusEff * 0.8);
            bonusTarget.dartActive = false;
            bonusDartProc = true;
          }
          const bonusWasAlive = bonusTarget.alive;
          const bonusActual = applyDamage(bonusTarget, bonusEff, round);
          actor.tel.damageDealt += bonusActual;
          if (bonusActual > actor.tel.largestHit) actor.tel.largestHit = bonusActual;
          const bonusKilled = bonusWasAlive && !bonusTarget.alive;
          if (bonusKilled) actor.tel.standardKills += 1;
          roundEvents.push({ actorId: actor.id, actorName: actor.name, actorSquad: actor.squad, targetId: bonusTarget.id, targetName: bonusTarget.name, damage: bonusActual, killed: bonusKilled, type: 'gear_proc', gearId: 'quickstrike', callout: 'EXTRA ACTION' });
          if (bonusDartProc) roundEvents.push({ actorId: bonusTarget.id, actorName: bonusTarget.name, actorSquad: bonusTarget.squad, type: 'module_proc', moduleId: 'dart', callout: 'DART' });
          actor.lastAttackedTargetId = bonusTarget.id;
          if (actor.moduleId === 'dart') actor.dartActive = true;
        }
      }

      // Killing Momentum: each kill refunds an action (cap 2/round) and widens
      // this unit's execute window for the rest of the round.
      if (killed && actor.gearId === 'killingMomentum' && actor.killMomentumCountThisRound < 2 && actor.alive) {
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
          actor.lastAttackedTargetId = bonusTarget.id;
        }
      }

      // Kindling
      if (killed) {
        const deadSquad = target.squad === 'A' ? unitsA : unitsB;
        for (const sp of deadSquad) {
          if (sp.alive && sp.archetype === 'Spark' && sp.gearId === 'kindling' && sp !== target) {
            sp.stokeStacks += 2;
            sp.currentAttack = sp.attack * (1 + 0.12 * sp.stokeStacks + 0.08 * (sp.slowBurnStacks || 0));
            roundEvents.push({ actorId: sp.id, actorName: sp.name, actorSquad: sp.squad, type: 'gear_proc', gearId: 'kindling', callout: 'Flame Inherited' });
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
          heir.stokeStacks += target.pyreHeartPending;
          heir.currentAttack = heir.attack * (1 + 0.12 * heir.stokeStacks + 0.08 * (heir.slowBurnStacks || 0));
        }
        const burst = Math.max(1, 8 + 4 * target.pyreHeartPending);
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
          const echoPower = resonatorActive ? 1.0 : 0.5;
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
            const jumpTarget = enemies.filter((u) => u.alive && u !== target)[0];
            if (jumpTarget) {
              const jumpRaw = actor.currentAttack * 0.5;
              const jumpDmg = calcDamage(jumpRaw, jumpTarget.armor);
              const jumpActual = applyDamage(jumpTarget, jumpDmg, round);
              echo.tel.echoEvents += 1;
              echo.tel.echoDamage += jumpActual;
              echo.tel.damageDealt += jumpActual;
              if (!jumpTarget.alive) echo.tel.standardKills += 1;
              // Open Channel marks the chained target: next ally hit on it is empowered.
              if (echo.gearId === 'openChannel' && jumpTarget.alive) jumpTarget.openChannelMark = true;
              roundEvents.push({ actorId: echo.id, actorName: echo.name, actorSquad: echo.squad, targetId: jumpTarget.id, targetName: jumpTarget.name, damage: jumpActual, killed: !jumpTarget.alive, type: 'gear_proc', gearId: echo.gearId, callout: echo.gearId === 'openChannel' ? 'OPEN CHANNEL' : 'Echo Jump' });
            }
          }
        }
      }

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
        wasRedirected: target !== proposedTarget,
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
      let bonus = 0;
      if (unit.archetype === 'Spark') {
        unit.stokeStacks += 1;
        unit.tel.peakStacks = unit.stokeStacks;
        unit.tel.roundReachedPeak = round;
        bonus += 0.12 * unit.stokeStacks;
      }
      if (unit.moduleId === 'slowBurn') {
        unit.slowBurnStacks += 1;
        bonus += 0.08 * unit.slowBurnStacks;
      }
      if (bonus > 0) unit.currentAttack = unit.attack * (1 + bonus);
    }

    if (unitsA.every((u) => !u.alive)) { winner = 'B'; break; }
    if (unitsB.every((u) => !u.alive)) { winner = 'A'; break; }
  }

  if (!winner) {
    const hpA = unitsA.reduce((s, u) => s + u.currentHP, 0);
    const hpB = unitsB.reduce((s, u) => s + u.currentHP, 0);
    winner = hpA >= hpB ? 'A' : 'B';
  }

  const allUnits = [...unitsA, ...unitsB];
  const totalDmg = allUnits.reduce((s, u) => s + u.tel.damageDealt, 0);
  for (const unit of allUnits) {
    if (unit.archetype === 'Spark' && totalDmg > 0)
      unit.tel.damagePercent = parseFloat(((unit.tel.damageDealt / totalDmg) * 100).toFixed(1));
  }

  const playerWon = winner === 'A';
  const xpRewards = {};
  const survivalUpdates = {};
  const battleUpdates = {};
  for (const unit of unitsA) {
    let xp = 15;
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
