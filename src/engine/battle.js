import { createRng } from './rng.js';

// ─── Damage formula ──────────────────────────────────────────────────────────
// Armor is flat subtraction; cannot reduce a hit below 50% of raw damage.
function calcDamage(rawAttack, targetArmor) {
  return Math.max(rawAttack - targetArmor, rawAttack * 0.5);
}

// ─── Apply damage to a unit (shield → HP) ────────────────────────────────────
// Returns actual HP damage dealt (post-shield).
function applyDamage(unit, damage, round) {
  let hpDmg = damage;

  if (unit.shield > 0) {
    const absorbed = Math.min(unit.shield, damage);
    unit.shield -= absorbed;
    unit.tel.shieldAbsorbed += absorbed;
    hpDmg = damage - absorbed;
  }

  const prevHP = Math.max(0, unit.currentHP);
  unit.currentHP = Math.max(0, unit.currentHP - hpDmg);
  const realHpDmg = prevHP - unit.currentHP; // capped at remaining HP (no overkill)
  unit.tel.damageTaken += realHpDmg;

  if (unit.currentHP <= 0) {
    unit.alive = false;
    if (unit.tel.fell === null) unit.tel.fell = round;
  }

  // Anchor Shield trigger: when HP first drops to/below 50% maxHP
  if (
    unit.archetype === 'Anchor' &&
    !unit.hasShielded &&
    unit.alive &&
    unit.currentHP <= unit.maxHP * 0.5
  ) {
    unit.shield = Math.floor(unit.maxHP * 0.2);
    unit.hasShielded = true;
    unit.tel.shieldTriggers += 1;
  }

  return realHpDmg;
}

// ─── Targeting ────────────────────────────────────────────────────────────────
// Taunt: if any enemy Anchor is alive, attacker must target an Anchor.
// Among forced/eligible targets, each archetype picks by its own rule.
function pickTarget(actor, enemies, lastSquadTarget) {
  const alive = enemies.filter((u) => u.alive);
  if (alive.length === 0) return null;

  const anchors = alive.filter((u) => u.archetype === 'Anchor');
  const pool = anchors.length > 0 ? anchors : alive;

  switch (actor.archetype) {
    case 'Anchor':
      // Highest Attack enemy
      return pool.reduce((best, u) =>
        u.currentAttack > best.currentAttack ? u : best
      );
    case 'Relay': {
      // Same target as last ally that acted; fall back to highest HP
      const last = lastSquadTarget
        ? pool.find((u) => u.id === lastSquadTarget)
        : null;
      return (
        last ||
        pool.reduce((best, u) => (u.currentHP > best.currentHP ? u : best))
      );
    }
    case 'Predator':
      // Lowest current HP enemy
      return pool.reduce((best, u) =>
        u.currentHP < best.currentHP ? u : best
      );
    case 'Ember':
      // Highest current HP enemy
      return pool.reduce((best, u) =>
        u.currentHP > best.currentHP ? u : best
      );
    default:
      return pool[0];
  }
}

// ─── Outcome sentence ─────────────────────────────────────────────────────────
function generateOutcome(winner, rounds, unitsA, unitsB) {
  const side = winner === 'A' ? 'Squad A' : 'Squad B';
  const winUnits = winner === 'A' ? unitsA : unitsB;

  if (rounds >= 10) {
    const hpA = unitsA.reduce((s, u) => s + u.currentHP, 0);
    const hpB = unitsB.reduce((s, u) => s + u.currentHP, 0);
    const remHP = winner === 'A' ? hpA : hpB;
    return `Neither squad broke in 10 rounds — ${side} held more HP (${Math.round(remHP)}) and took the timeout victory.`;
  }

  const embers = winUnits.filter((u) => u.archetype === 'Ember' && u.alive);
  const scaledEmber = embers.find((e) => e.stokeStacks >= 5);
  if (scaledEmber) {
    return `${scaledEmber.name} scaled to ${scaledEmber.stokeStacks} Stoke stacks by round ${scaledEmber.tel.roundReachedPeak}, converting patience into decisive damage.`;
  }

  const predators = winUnits.filter((u) => u.archetype === 'Predator');
  const execKills = predators.reduce((s, p) => s + p.tel.executeKills, 0);
  const anchors = winUnits.filter((u) => u.archetype === 'Anchor' && u.alive);
  if (execKills > 0 && anchors.length > 0) {
    const anchor = anchors[0];
    const pred = predators[0];
    return `${anchor.name} locked enemy fire and kept the front intact while ${pred.name} closed out low-HP targets with ${execKills} execute strike${execKills > 1 ? 's' : ''}.`;
  }
  if (execKills > 0) {
    return `${side}'s Predator secured ${execKills} execute kill${execKills > 1 ? 's' : ''}, eliminating wounded targets before they could recover.`;
  }

  const relays = winUnits.filter((u) => u.archetype === 'Relay');
  const echoTotal = relays.reduce((s, r) => s + r.tel.echoDamage, 0);
  const echoEvents = relays.reduce((s, r) => s + r.tel.echoEvents, 0);
  if (echoEvents >= 5) {
    return `${side}'s Relay network fired ${echoEvents} echoes for ${Math.round(echoTotal)} bonus damage — sustained amplification decided the fight.`;
  }

  if (anchors.length > 0) {
    const absorbed = anchors.reduce((s, a) => s + a.tel.shieldAbsorbed, 0);
    return absorbed > 0
      ? `${anchors[0].name} held the frontline and shielded ${Math.round(absorbed)} damage, giving ${side}'s squad the HP cushion they needed.`
      : `${anchors[0].name} absorbed sustained pressure and kept ${side}'s squad intact through round ${rounds}.`;
  }

  return `${side} won in round ${rounds} through superior damage output and favorable targeting.`;
}

// ─── Coaching line ────────────────────────────────────────────────────────────
function generateCoaching(winner, rounds, unitsA, unitsB) {
  const all = [...unitsA, ...unitsB];

  // 1. Ember survived 6+ rounds (alive, stacks ≥ 6)
  const scaledEmber = all.find(
    (u) => u.archetype === 'Ember' && u.alive && u.stokeStacks >= 6
  );
  if (scaledEmber) {
    return `Ember scaled uncontested — no burst to answer it.`;
  }

  // 2. Any Predator had 0 execute hits (threshold was never reached)
  const predators = all.filter((u) => u.archetype === 'Predator');
  if (predators.length > 0 && predators.every((p) => p.tel.executeHits === 0)) {
    return `Predator found no execute opportunities — targets stayed above threshold.`;
  }

  // 3. Any Relay fired fewer than 3 echo events
  const relays = all.filter((u) => u.archetype === 'Relay');
  const lowRelay = relays.find((r) => r.tel.echoEvents < 3);
  if (lowRelay) {
    return `Relay had low value: squad effects were sparse.`;
  }

  // 4. Squad A had no Anchor and lost
  const squadAHasAnchor = unitsA.some((u) => u.archetype === 'Anchor');
  if (winner === 'B' && !squadAHasAnchor) {
    return `Squad lacked stabilization — no Anchor to absorb pressure.`;
  }

  return '';
}

// ─── Internal threat score (hidden, per GDD §16) ─────────────────────────────
function computeThreat(unit) {
  const hpNorm = unit.hp / 500;
  const atkNorm = unit.attack / 50;
  const spdNorm = unit.speed / 10;
  const scaling = unit.archetype === 'Ember' ? 1.4 : 1.0;
  return (hpNorm * 0.35 + atkNorm * 0.45 + spdNorm * 0.2) * scaling;
}

// ─── Main battle function ─────────────────────────────────────────────────────
export function battle(squadA, squadB, seed) {
  const rng = createRng(seed);

  const initUnit = (creature, squad) => ({
    ...creature,
    squad,
    currentHP: creature.hp,
    maxHP: creature.hp,
    currentAttack: creature.attack,
    shield: 0,
    hasShielded: false,
    stokeStacks: 0,
    alive: true,
    threat: computeThreat(creature),
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
  });

  const unitsA = squadA.map((u) => initUnit(u, 'A'));
  const unitsB = squadB.map((u) => initUnit(u, 'B'));

  // Per-squad "last ally target" id for Relay targeting
  const lastSquadTarget = { A: null, B: null };

  let winner = null;
  let finalRound = 10;
  const battleLog = [];

  for (let round = 1; round <= 10; round++) {
    finalRound = round;
    const aliveA = unitsA.filter((u) => u.alive);
    const aliveB = unitsB.filter((u) => u.alive);
    if (aliveA.length === 0 || aliveB.length === 0) break;

    // Speed-ordered turn list; ties broken by seeded RNG
    const turnOrder = [...aliveA, ...aliveB].sort((a, b) => {
      if (b.speed !== a.speed) return b.speed - a.speed;
      return rng() - 0.5;
    });

    const roundEvents = [];

    for (const actor of turnOrder) {
      if (!actor.alive) continue;

      const enemies = actor.squad === 'A' ? unitsB : unitsA;
      const allies  = actor.squad === 'A' ? unitsA : unitsB;
      const aliveEnemies = enemies.filter((u) => u.alive);
      if (aliveEnemies.length === 0) break;

      const target = pickTarget(actor, enemies, lastSquadTarget[actor.squad]);
      if (!target) continue;

      // Track squad's last targeted enemy (used by Relay)
      lastSquadTarget[actor.squad] = target.id;

      // ── Compute raw attack (Execute doubles vs targets below 30% HP) ──
      let rawAttack = actor.currentAttack;
      let isExecute = false;
      if (
        actor.archetype === 'Predator' &&
        target.currentHP < target.maxHP * 0.3
      ) {
        rawAttack *= 2;
        isExecute = true;
      }

      const damage = calcDamage(rawAttack, target.armor);
      const targetWasAlive = target.alive;
      const actualDmg = applyDamage(target, damage, round);

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
      });

      // ── Echo: all alive Relay allies (not the actor itself) fire immediately ──
      if (actor.archetype !== 'Relay') {
        const relayAllies = allies.filter(
          (u) => u.alive && u.archetype === 'Relay' && u !== actor
        );
        for (const relay of relayAllies) {
          if (!target.alive) continue; // target already dead
          const echoRaw = actor.currentAttack * 0.5;
          const echoDmg = calcDamage(echoRaw, target.armor);
          const echoActual = applyDamage(target, echoDmg, round);

          relay.tel.echoEvents += 1;
          relay.tel.echoDamage += echoActual;
          relay.tel.damageDealt += echoActual;

          if (!target.alive) relay.tel.standardKills += 1;

          roundEvents.push({
            actorId: relay.id,
            actorName: relay.name,
            actorSquad: relay.squad,
            targetId: target.id,
            targetName: target.name,
            damage: echoActual,
            isExecute: false,
            killed: !target.alive,
            type: 'echo',
          });
        }
      }

      // Check win condition after each action
      if (enemies.every((u) => !u.alive)) {
        winner = actor.squad;
        break;
      }
    }

    battleLog.push({ round, events: roundEvents });

    if (winner) break;

    // ── End of round: Ember Stoke (+12% base attack per round survived) ──
    for (const unit of [...unitsA, ...unitsB]) {
      if (unit.alive && unit.archetype === 'Ember') {
        unit.stokeStacks += 1;
        unit.currentAttack = unit.attack * (1 + 0.12 * unit.stokeStacks);
        unit.tel.peakStacks = unit.stokeStacks;
        unit.tel.roundReachedPeak = round;
      }
    }

    // Check for elimination at end of round
    if (unitsA.every((u) => !u.alive)) { winner = 'B'; break; }
    if (unitsB.every((u) => !u.alive)) { winner = 'A'; break; }
  }

  // Timeout: most remaining HP wins
  if (!winner) {
    const hpA = unitsA.reduce((s, u) => s + u.currentHP, 0);
    const hpB = unitsB.reduce((s, u) => s + u.currentHP, 0);
    winner = hpA >= hpB ? 'A' : 'B';
  }

  // Compute Ember % of total damage
  const allUnits = [...unitsA, ...unitsB];
  const totalDmg = allUnits.reduce((s, u) => s + u.tel.damageDealt, 0);
  for (const unit of allUnits) {
    if (unit.archetype === 'Ember' && totalDmg > 0) {
      unit.tel.damagePercent = parseFloat(
        ((unit.tel.damageDealt / totalDmg) * 100).toFixed(1)
      );
    }
  }

  // Compute XP rewards and survival tracking for player squad (squadA)
  const playerWon = winner === 'A';
  const xpRewards = {};
  const survivalUpdates = {};
  const battleUpdates = {};

  for (const unit of unitsA) {
    let xp = 15; // participation base
    if (unit.alive) {
      xp += 5; // survival bonus
      survivalUpdates[unit.instanceId] = 1; // increment survival count
    }
    if (playerWon) xp += 5; // victory bonus
    xpRewards[unit.instanceId] = xp;

    // Battle record: track count, wins, enemy names
    battleUpdates[unit.instanceId] = {
      battleCount: 1,
      winCount: playerWon ? 1 : 0,
      alive: unit.alive,
      enemyNames: unitsB.map(e => e.name),
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
  };
}
