#!/usr/bin/env node
// ─── Ringward Outer-Ring Balance Simulator (Tier 1) ───────────────────────────
// Headless sim that replays the Outer Ring run (4 waves → boss) across many
// squad comps and seeds, collecting win-rates, per-wave clear-rates, attrition,
// encounter length, and skill usage. Outputs JSON to stdout; the report script
// reads it. Does NOT modify any live game code.

import {
  simulateAIvsAI,
  makeUnitDef,
  COMBAT_CREATURES,
  COMBAT_ROSTER,
  createBattleState,
  createAIDriver,
} from '../../src/engine/combat/index.js';
import { runBattle } from '../../src/engine/combat/engine.js';
import { livingOnSide } from '../../src/engine/combat/state.js';
import { createRng } from '../../src/engine/rng.js';

// ─── Ported from SeamLab.jsx — enemy wave generation (pure, no React) ─────────
// Depth-scaling curves (copied verbatim from SeamLab.jsx:357-358)
const D_HP  = (d) => 1 + 0.34 * (d - 1) - 0.017 * (d - 1) ** 2;
const D_ATK = (d) => 1 + 0.30 * (d - 1) - 0.018 * (d - 1) ** 2;
const crossMult = (crossing) => 1 + 0.30 * (crossing || 0);

function foe(id, temperament, roleHp, roleAtk, depth, extra = {}, cm = 1) {
  const hp = Math.round(roleHp * D_HP(depth) * cm);
  return { ...makeUnitDef(id, temperament), hp, maxHp: hp, atk: Math.round(roleAtk * D_ATK(depth) * cm), ...extra };
}

// The Outer Ring ground (copied from SeamLab.jsx:102)
const OUTER_RING = {
  id: 'outer-ring', name: 'The Crackling Outer Ring', depth: 1,
  boss: 'The Cinder Maw', biasIds: ['fizzpop', 'glowtail', 'cinderpaw'],
};

function wavesForGround(g, cm = 1) {
  const d = g.depth, pool = g.biasIds, at = (i) => pool[i % pool.length];
  const F = (id, temp, hp, atk, extra) => foe(id, temp, hp, atk, d, extra, cm);
  return [
    { name: 'Scouts', seed: 101,
      enemies: () => [F(at(0), 'Cautious', 110, 26), F(at(1), 'Cautious', 105, 26)] },
    { name: 'The Pack', seed: 202,
      enemies: () => [F(at(0), 'Balanced', 175, 40), F(at(1), 'Balanced', 175, 38), F(at(2), 'Balanced', 165, 40)] },
    { name: 'The Pack-Lord', seed: 303,
      enemies: () => [F(at(0), 'Greedy', 300, 50), F(at(1), 'Greedy', 220, 62)] },
    { name: g.boss, boss: true, seed: 404,
      enemies: () => [F(at(0), 'Greedy', 540, 68, { name: g.boss, speed: 7 }), F('mossback', 'Balanced', 240, 24, { name: 'Tender' })] },
  ];
}

// Between-wave heal (from SeamLab.jsx:47)
const PATCHUP = 0.18;

// ─── Rarity multipliers (ported from SeamLab.jsx:161-176) ───────────────────
// The live game scales player HP and ATK by creature rarity. Enemies use wave
// role stats (unscaled). This is the PULL to chase higher-rarity creatures.
const RARITY_OF = {
  fizzpop: 'Common', glowtail: 'Rare', cinderpaw: 'Legendary',
  stoneward: 'Common', ironwall: 'Rare',
  mossback: 'Common', dewleaf: 'Rare',
  buzzline: 'Common', tanglewing: 'Rare',
  swiftpaw: 'Rare', dartwing: 'Legendary',
  shadefang: 'Rare', veilclaw: 'Legendary',
  blightcap: 'Legendary', hexmoth: 'Unique',
  frostwarden: 'Legendary', rimecaller: 'Unique',
};
const RARITY_MULT = { Common: 1.0, Rare: 1.2, Legendary: 1.45, Unique: 1.7, Keystone: 2.0 };
const rarityMult = (id) => RARITY_MULT[RARITY_OF[id] || 'Common'];

// Build a player-side unit with rarity scaling applied (mimics playerDef in SeamLab.jsx:1332-1339)
function makePlayerUnit(id) {
  const base = makeUnitDef(id, 'Balanced');
  const mult = rarityMult(id);
  const maxHp = Math.round(base.hp * mult);
  return { ...base, hp: maxHp, maxHp, atk: Math.round(base.atk * mult) };
}

// ─── Squad comp definitions ─────────────────────────────────────────────────
const COMPS = [
  { name: 'Live Anchor (Cinderpaw+Fizzpop+Stoneward)', ids: ['cinderpaw', 'fizzpop', 'stoneward'] },
  { name: 'Balanced (Cinderpaw+Stoneward+Mossback)', ids: ['cinderpaw', 'stoneward', 'mossback'] },
  { name: 'Glass Cannon (Cinderpaw+Shadefang+Dartwing)', ids: ['cinderpaw', 'shadefang', 'dartwing'] },
  { name: 'Mono Reactor (Cinderpaw+Fizzpop+Glowtail)', ids: ['cinderpaw', 'fizzpop', 'glowtail'] },
  { name: 'Tank Heavy (Stoneward+Ironwall+Cinderpaw)', ids: ['stoneward', 'ironwall', 'cinderpaw'] },
  { name: 'Best Guess (Cinderpaw+Mossback+Buzzline)', ids: ['cinderpaw', 'mossback', 'buzzline'] },
  { name: 'Striker Rush (Swiftpaw+Dartwing+Cinderpaw)', ids: ['swiftpaw', 'dartwing', 'cinderpaw'] },
  { name: 'Control (Frostwarden+Rimecaller+Cinderpaw)', ids: ['frostwarden', 'rimecaller', 'cinderpaw'] },
  { name: 'Hex Synergy (Blightcap+Hexmoth+Cinderpaw)', ids: ['blightcap', 'hexmoth', 'cinderpaw'] },
  { name: 'Assassin Pair (Shadefang+Veilclaw+Mossback)', ids: ['shadefang', 'veilclaw', 'mossback'] },
];

const RUNS_PER_COMP = parseInt(process.argv[2] || '500', 10);
const VERBOSE = process.argv.includes('--verbose');

// ─── Run a single multi-wave sim ────────────────────────────────────────────
async function runOneSimulation(squadIds, seed) {
  const waves = wavesForGround(OUTER_RING, 1);
  const rng = createRng(seed);

  // Build the squad fresh each run (with rarity scaling, like the live game)
  let squadUnits = squadIds.map((id) => makePlayerUnit(id));

  const result = {
    won: false,
    waveOfDeath: -1,
    wavesCleared: 0,
    perWave: [],
  };

  for (let wi = 0; wi < waves.length; wi++) {
    const wave = waves[wi];
    const enemies = wave.enemies();
    const waveSeed = seed * 1000 + wave.seed;

    // Build squad defs carrying HP forward (and maxHp)
    const squadForBattle = squadUnits.filter(u => u.hp > 0).map(u => ({
      ...u,
      // Keep carried-over HP
    }));

    if (squadForBattle.length === 0) {
      result.waveOfDeath = wi;
      break;
    }

    // Track skill usage via onEvent
    const skillUsage = {};
    const events = [];
    const onEvent = (e) => {
      events.push(e);
      if (e.type === 'turn') {
        const key = e.skill.id;
        if (!skillUsage[key]) skillUsage[key] = { count: 0, sideA: 0, sideB: 0 };
        skillUsage[key].count++;
        skillUsage[key][e.actor.side === 'A' ? 'sideA' : 'sideB']++;
      }
    };

    const state = createBattleState(squadForBattle, enemies, waveSeed);
    const drivers = { A: createAIDriver(), B: createAIDriver() };
    const battleResult = await runBattle(state, drivers, onEvent);

    const squadSurvivors = livingOnSide(state, 'A');
    const totalMaxHp = state.units.A.reduce((s, u) => s + u.maxHp, 0);
    const totalHp = squadSurvivors.reduce((s, u) => s + u.hp, 0);

    const waveData = {
      waveIndex: wi,
      waveName: wave.name,
      isBoss: !!wave.boss,
      won: battleResult.winner === 'A',
      rounds: battleResult.rounds,
      cappedOut: battleResult.cappedOut,
      survivorCount: squadSurvivors.length,
      hpPctAfter: totalMaxHp > 0 ? totalHp / totalMaxHp : 0,
      skillUsage,
    };
    result.perWave.push(waveData);

    if (battleResult.winner !== 'A') {
      result.waveOfDeath = wi;
      break;
    }

    result.wavesCleared = wi + 1;

    // Carry HP forward to surviving squad units, apply PATCHUP heal
    squadUnits = state.units.A.map(u => {
      if (!u.alive || u.hp <= 0) return { ...u, hp: 0, alive: false };
      const healed = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * PATCHUP));
      return {
        id: u.id,
        name: u.name,
        type: u.type,
        spriteId: u.spriteId,
        temperament: u.temperament,
        hp: healed,
        maxHp: u.maxHp,
        atk: u.atk,
        speed: u.speed,
        skillIds: u.skillIds,
        mods: u.mods || {},
      };
    }).filter(u => u.hp > 0);
  }

  if (result.wavesCleared === waves.length) {
    result.won = true;
  }

  return result;
}

// ─── Run a verbose trace of one run (for sanity check) ──────────────────────
async function runVerboseTrace(squadIds, seed) {
  const waves = wavesForGround(OUTER_RING, 1);
  let squadUnits = squadIds.map((id) => makePlayerUnit(id));
  const lines = [];
  lines.push(`=== VERBOSE TRACE: seed=${seed}, squad=[${squadIds.join(', ')}] ===`);

  for (let wi = 0; wi < waves.length; wi++) {
    const wave = waves[wi];
    const enemies = wave.enemies();
    const waveSeed = seed * 1000 + wave.seed;

    const squadForBattle = squadUnits.filter(u => u.hp > 0);
    if (squadForBattle.length === 0) {
      lines.push(`\n--- Wave ${wi + 1} (${wave.name}): SQUAD DEAD, cannot continue ---`);
      break;
    }

    lines.push(`\n--- Wave ${wi + 1}: ${wave.name}${wave.boss ? ' [BOSS]' : ''} ---`);
    lines.push(`Squad entering: ${squadForBattle.map(u => `${u.name}(${u.hp}/${u.maxHp} HP, ${u.atk} ATK, spd ${u.speed})`).join(', ')}`);
    lines.push(`Enemies: ${enemies.map(u => `${u.name}(${u.hp}/${u.maxHp} HP, ${u.atk} ATK, spd ${u.speed})`).join(', ')}`);

    const state = createBattleState(squadForBattle, enemies, waveSeed);
    const drivers = { A: createAIDriver(), B: createAIDriver() };
    const battleResult = await runBattle(state, drivers, (e) => {
      if (e.type === 'round-start') {
        lines.push(`  Round ${e.round} (first: ${e.firstSide})`);
      } else if (e.type === 'turn') {
        const hits = (e.hits || []).map(h => `${h.uid}:${h.dmg}dmg${h.killed ? ' KILL' : ''}`).join(', ');
        const heals = (e.heals || []).map(h => `${h.uid}:+${h.amount}`).join(', ');
        const shields = (e.shields || []).map(h => `${h.uid}:+${h.amount}blk`).join(', ');
        lines.push(`    ${e.actor.name}(${e.actor.side}) → ${e.skill.id} [charge ${e.chargeBefore}→${e.chargeAfter}]${hits ? ' hits:[' + hits + ']' : ''}${heals ? ' heals:[' + heals + ']' : ''}${shields ? ' shields:[' + shields + ']' : ''}`);
      } else if (e.type === 'burn') {
        lines.push(`    BURN: ${e.target.name}(${e.target.side}) -${e.dmg}hp${e.killed ? ' KILLED' : ''} (${e.stacksLeft} stacks left)`);
      } else if (e.type === 'regen') {
        lines.push(`    REGEN: ${e.target.name}(${e.target.side}) +${e.healed}hp (${e.stacksLeft} stacks left)`);
      } else if (e.type === 'battle-end') {
        lines.push(`  >> BATTLE END: winner=${e.winner}, rounds=${e.rounds}`);
      }
    });

    const survivors = livingOnSide(state, 'A');
    const totalMaxHp = state.units.A.reduce((s, u) => s + u.maxHp, 0);
    const totalHp = survivors.reduce((s, u) => s + u.hp, 0);
    lines.push(`  Result: ${battleResult.winner === 'A' ? 'WIN' : 'LOSS'}, ${survivors.length} survivors, ${totalHp}/${totalMaxHp} HP (${(100 * totalHp / totalMaxHp).toFixed(1)}%)`);

    if (battleResult.winner !== 'A') break;

    // Patch up survivors
    squadUnits = state.units.A.map(u => {
      if (!u.alive || u.hp <= 0) return { ...u, hp: 0, alive: false };
      const healed = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * PATCHUP));
      return {
        id: u.id, name: u.name, type: u.type, spriteId: u.spriteId,
        temperament: u.temperament, hp: healed, maxHp: u.maxHp,
        atk: u.atk, speed: u.speed, skillIds: u.skillIds, mods: u.mods || {},
      };
    }).filter(u => u.hp > 0);

    lines.push(`  After PATCHUP (+${Math.round(PATCHUP * 100)}%): ${squadUnits.map(u => `${u.name}(${u.hp}/${u.maxHp})`).join(', ')}`);
  }

  return lines.join('\n');
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  // Sanity check: run verbose trace on anchor comp
  const traceFile = new URL('./verbose-trace.txt', import.meta.url).pathname;
  const trace = await runVerboseTrace(['cinderpaw', 'fizzpop', 'stoneward'], 42);
  const fs = await import('fs');
  fs.writeFileSync(traceFile, trace);
  if (!VERBOSE) {
    process.stderr.write(`Verbose trace written to ${traceFile}\n`);
  } else {
    process.stderr.write(trace + '\n');
  }

  const allResults = {};

  for (const comp of COMPS) {
    process.stderr.write(`Running ${comp.name} (${RUNS_PER_COMP} runs)...\n`);
    const runs = [];

    for (let i = 0; i < RUNS_PER_COMP; i++) {
      const seed = 10000 + i * 7;
      const r = await runOneSimulation(comp.ids, seed);
      runs.push(r);
    }

    // Aggregate
    const wins = runs.filter(r => r.won).length;
    const waveDeaths = [0, 0, 0, 0]; // count of deaths at each wave index
    const waveReached = [0, 0, 0, 0]; // count of runs that reached each wave
    const waveCleared = [0, 0, 0, 0]; // count of runs that cleared each wave
    const waveRounds = [[], [], [], []]; // rounds per wave (when reached)
    const waveHpPctEntering = [[], [], [], []]; // HP% entering each wave
    const skillUsageTotal = {}; // aggregate skill usage from player side only
    const skillUsageWins = {}; // skill usage in winning runs
    const skillUsageLosses = {}; // skill usage in losing runs

    for (const r of runs) {
      for (let wi = 0; wi < 4; wi++) {
        const waveData = r.perWave[wi];
        if (!waveData) continue;
        waveReached[wi]++;
        if (waveData.won) waveCleared[wi]++;
        waveRounds[wi].push(waveData.rounds);

        // HP% entering this wave: from previous wave's hpPctAfter (after patchup) or 1.0 for wave 0
        if (wi === 0) {
          waveHpPctEntering[wi].push(1.0);
        } else {
          const prev = r.perWave[wi - 1];
          if (prev) {
            // After patchup
            const patchedPct = Math.min(1.0, prev.hpPctAfter + PATCHUP);
            waveHpPctEntering[wi].push(patchedPct);
          }
        }

        // Skill usage (player side = side A)
        for (const [skillId, usage] of Object.entries(waveData.skillUsage)) {
          if (usage.sideA > 0) {
            if (!skillUsageTotal[skillId]) skillUsageTotal[skillId] = 0;
            skillUsageTotal[skillId] += usage.sideA;

            if (r.won) {
              if (!skillUsageWins[skillId]) skillUsageWins[skillId] = 0;
              skillUsageWins[skillId] += usage.sideA;
            } else {
              if (!skillUsageLosses[skillId]) skillUsageLosses[skillId] = 0;
              skillUsageLosses[skillId] += usage.sideA;
            }
          }
        }
      }

      if (!r.won && r.waveOfDeath >= 0) {
        waveDeaths[r.waveOfDeath]++;
      }
    }

    const median = (arr) => {
      if (!arr.length) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    allResults[comp.name] = {
      ids: comp.ids,
      totalRuns: RUNS_PER_COMP,
      wins,
      winRate: wins / RUNS_PER_COMP,
      waveReached,
      waveCleared,
      waveConditionalClearRate: waveReached.map((reached, i) => reached > 0 ? waveCleared[i] / reached : 0),
      waveDeaths,
      waveDeathPct: waveDeaths.map(d => d / RUNS_PER_COMP),
      medianRoundsPerWave: waveRounds.map(median),
      medianHpPctEntering: waveHpPctEntering.map(median),
      skillUsageTotal,
      skillUsageWins,
      skillUsageLosses,
    };
  }

  // Output JSON
  const output = {
    meta: {
      engine: 'src/engine/combat/ (new manual-combat engine)',
      ground: 'The Crackling Outer Ring (depth 1, crossing 0)',
      tier: 'Tier 1 (no upgrades, no wayside events)',
      runsPerComp: RUNS_PER_COMP,
      comps: COMPS.length,
      totalBattles: COMPS.length * RUNS_PER_COMP * 4,
      patchup: PATCHUP,
      mode: 'AUTO (AI-vs-AI)',
      traceFile,
    },
    results: allResults,
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
