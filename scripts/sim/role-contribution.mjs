#!/usr/bin/env node
// ─── Ringward Outer-Ring ROLE-CONTRIBUTION harness (ablation) ───────────────────
// Measures how much each SUPPORT role (Bulwark/tank, Mender/healer, Booster)
// contributes to TIME-TO-KILL on the Outer Ring. Method: ABLATION. Run the full
// 4-wave run headless on AUTO over many SHARED seeds, recording rounds-to-clear
// per wave + win-rate; then run the SAME comp with the support unit REMOVED, same
// seeds. The support's "tempo contribution" = how much its presence REDUCES
// rounds-to-clear and RAISES clear-rate per wave. If removing it barely changes
// rounds (or helps, by freeing action economy), that role is dead weight on kill
// speed — the key finding.
//
// TWO FRAMINGS (a 2-unit squad can't reach Wave 3, so the boss/W3 headline is only
// measurable with a viable squad):
//   TRIO (primary): carry + fixed DPS partner + support  →  ablate to carry + DPS.
//        This is the "removed (a 2-creature squad)" reading; yields W3/W4 rounds.
//   DUO  (confirm): carry + support                       →  ablate to carry alone.
//        Matches the literal COMPS pairing; only W1/W2 are ever cleared at this size.
//
// TIER-1 ONLY: no roguelike upgrades drafted (clean signal). Scaffolding ported
// verbatim from scripts/sim/run-sim-tier2.mjs (its 'none' policy). Does NOT modify
// any live game code. Prints tables to stderr; JSON to stdout.
//   node scripts/sim/role-contribution.mjs [runs]

import {
  makeUnitDef, COMBAT_CREATURES, createBattleState, createAIDriver,
} from '../../src/engine/combat/index.js';
import { runBattle } from '../../src/engine/combat/engine.js';
import { createRng } from '../../src/engine/rng.js';

// ─── Wave generation (ported verbatim from run-sim-tier2.mjs / SeamLab.jsx) ──────
const D_HP  = (d) => 1 + 0.34 * (d - 1) - 0.017 * (d - 1) ** 2;
const D_ATK = (d) => 1 + 0.30 * (d - 1) - 0.018 * (d - 1) ** 2;
function foe(id, temperament, roleHp, roleAtk, depth, extra = {}, cm = 1) {
  const hp = Math.round(roleHp * D_HP(depth) * cm);
  return { ...makeUnitDef(id, temperament), hp, maxHp: hp, atk: Math.round(roleAtk * D_ATK(depth) * cm), ...extra };
}
const OUTER_RING = { id: 'outer-ring', name: 'The Crackling Outer Ring', depth: 1, boss: 'The Cinder Maw', biasIds: ['fizzpop', 'glowtail', 'cinderpaw'] };
function wavesForGround(g, cm = 1) {
  const d = g.depth, pool = g.biasIds, at = (i) => pool[i % pool.length];
  const F = (id, temp, hp, atk, extra) => foe(id, temp, hp, atk, d, extra, cm);
  return [
    { name: 'Scouts', seed: 101, enemies: () => [F(at(0), 'Cautious', 110, 26), F(at(1), 'Cautious', 105, 26)] },
    { name: 'The Pack', seed: 202, enemies: () => [F(at(0), 'Balanced', 175, 40), F(at(1), 'Balanced', 175, 38), F(at(2), 'Balanced', 165, 40)] },
    { name: 'The Pack-Lord', seed: 303, enemies: () => [F(at(0), 'Greedy', 300, 50), F(at(1), 'Greedy', 220, 62)] },
    { name: g.boss, boss: true, seed: 404, enemies: () => [F(at(0), 'Greedy', 540, 68, { name: g.boss, speed: 7 }), F('mossback', 'Balanced', 240, 24, { name: 'Tender' })] },
  ];
}
const PATCHUP = 0.18;

// ─── Rarity scaling (ported from SeamLab.jsx:161-176) ───────────────────────────
const RARITY_OF = {
  fizzpop: 'Common', glowtail: 'Rare', cinderpaw: 'Legendary', stoneward: 'Common', ironwall: 'Rare',
  mossback: 'Common', dewleaf: 'Rare', buzzline: 'Common', tanglewing: 'Rare', swiftpaw: 'Rare',
  dartwing: 'Legendary', shadefang: 'Rare', veilclaw: 'Legendary', blightcap: 'Legendary',
  hexmoth: 'Unique', frostwarden: 'Legendary', rimecaller: 'Unique',
};
const RARITY_MULT = { Common: 1.0, Rare: 1.2, Legendary: 1.45, Unique: 1.7, Keystone: 2.0 };
const rarityMult = (id) => RARITY_MULT[RARITY_OF[id] || 'Common'];

const N_WAVES = 4;

// ─── One full Tier-1 run (no upgrades). Returns per-wave {reached, cleared, rounds}. ──
async function runOne(squadIds, seed) {
  const waves = wavesForGround(OUTER_RING, 1);
  const baseMaxHp = squadIds.map((id) => Math.round(makeUnitDef(id, 'Balanced').hp * rarityMult(id)));
  let hp = baseMaxHp.slice();
  let alive = squadIds.map(() => true);
  const perWave = Array.from({ length: N_WAVES }, () => ({ reached: false, cleared: false, rounds: null }));
  const result = { won: false, waveOfDeath: -1, wavesCleared: 0, perWave };

  for (let wi = 0; wi < waves.length; wi++) {
    perWave[wi].reached = true;

    // ── Build battle units with carried HP (Tier-1: no mods) ──
    const battleUnits = [], idxMap = [];
    squadIds.forEach((id, idx) => {
      if (!alive[idx]) return;
      const b = makeUnitDef(id, 'Balanced'); const rm = rarityMult(id);
      const maxHp = Math.round(b.hp * rm);
      const curHp = Math.min(maxHp, hp[idx]);
      battleUnits.push({ ...b, hp: curHp, maxHp, atk: Math.round(b.atk * rm), charge: 0, mods: {} });
      idxMap.push(idx);
    });
    if (!battleUnits.length) { result.waveOfDeath = wi; break; }

    const enemies = waves[wi].enemies();
    const waveSeed = seed * 1000 + waves[wi].seed + wi * 13;
    const state = createBattleState(battleUnits, enemies, waveSeed);
    const br = await runBattle(state, { A: createAIDriver(), B: createAIDriver() });

    state.units.A.forEach((u, k) => { const idx = idxMap[k]; if (!u.alive || u.hp <= 0) { hp[idx] = 0; alive[idx] = false; } else { hp[idx] = u.hp; } });
    if (br.winner !== 'A') { result.waveOfDeath = wi; break; }

    perWave[wi].cleared = true;
    perWave[wi].rounds = br.rounds;
    result.wavesCleared = wi + 1;

    // PATCHUP survivors
    squadIds.forEach((id, idx) => {
      if (!alive[idx]) return;
      const maxHp = Math.round(makeUnitDef(id, 'Balanced').hp * rarityMult(id));
      hp[idx] = Math.min(maxHp, hp[idx] + Math.round(maxHp * PATCHUP));
    });
  }
  if (result.wavesCleared === N_WAVES) result.won = true;
  return result;
}

const median = (arr) => {
  if (!arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// ─── Sweep one squad over RUNS shared seeds ─────────────────────────────────────
async function sweep(squadIds, runs) {
  let wins = 0;
  const reached = Array(N_WAVES).fill(0);
  const cleared = Array(N_WAVES).fill(0);
  const roundsBuckets = Array.from({ length: N_WAVES }, () => []);
  for (let i = 0; i < runs; i++) {
    const r = await runOne(squadIds, 10000 + i * 7); // SAME seed schedule across every condition
    if (r.won) wins++;
    r.perWave.forEach((w, wi) => {
      if (w.reached) reached[wi]++;
      if (w.cleared) { cleared[wi]++; roundsBuckets[wi].push(w.rounds); }
    });
  }
  return {
    squad: squadIds, winRate: wins / runs, wins, runs,
    condClear: reached.map((rc, i) => rc > 0 ? cleared[i] / rc : 0),
    reached, cleared,
    medianRounds: roundsBuckets.map(median),
    meanRounds: roundsBuckets.map((b) => b.length ? b.reduce((s, x) => s + x, 0) / b.length : null),
  };
}

// ─── Comp definitions ───────────────────────────────────────────────────────────
const CARRY = 'cinderpaw';     // Legendary DPS — the run's carry
const PARTNER = 'dartwing';    // fixed Legendary DPS partner (the constant 2nd slot in the TRIO framing)
const SUPPORTS = [
  { id: 'stoneward', role: 'Bulwark/tank' },
  { id: 'ironwall',  role: 'Bulwark/tank' },
  { id: 'mossback',  role: 'Mender/healer' },
  { id: 'buzzline',  role: 'Booster' },
];

const RUNS = parseInt(process.argv[2] || '300', 10);

const pct = (x) => x == null ? '  —  ' : (100 * x).toFixed(1).padStart(5);
const rnd = (x) => x == null ? '  —  ' : x.toFixed(1).padStart(5);
const dlt = (x) => x == null ? '  —  ' : (x >= 0 ? '+' : '') + x.toFixed(1);

async function main() {
  process.stderr.write(`ROLE-CONTRIBUTION ablation — ${OUTER_RING.name}, Tier-1 (no upgrades), AUTO, ${RUNS} runs/condition\n`);

  // ── TRIO framing (primary): carry + PARTNER + support, ablated to carry + PARTNER ──
  process.stderr.write(`\n[TRIO] Sweeping ablation baseline ${CARRY}+${PARTNER}...\n`);
  const trioBase = await sweep([CARRY, PARTNER], RUNS);                       // WITHOUT support (2 units)
  process.stderr.write(`[TRIO] Sweeping DPS ceiling ${CARRY}+${PARTNER}+shadefang...\n`);
  const trioCeil = await sweep([CARRY, PARTNER, 'shadefang'], RUNS);          // 3rd-DPS reference
  const trio = [];
  for (const s of SUPPORTS) {
    process.stderr.write(`[TRIO] Sweeping ${CARRY}+${PARTNER}+${s.id}...\n`);
    const withS = await sweep([CARRY, PARTNER, s.id], RUNS);
    trio.push({ support: s.id, role: s.role, with: withS, without: trioBase });
  }

  // ── DUO framing (confirm): carry + support, ablated to carry alone ──
  process.stderr.write(`\n[DUO] Sweeping ablation baseline ${CARRY} alone...\n`);
  const duoBase = await sweep([CARRY], RUNS);                                 // WITHOUT support (1 unit)
  process.stderr.write(`[DUO] Sweeping 2-DPS reference ${CARRY}+${PARTNER}...\n`);
  const duoRef = trioBase;                                                    // same squad as trioBase
  const duo = [];
  for (const s of SUPPORTS) {
    process.stderr.write(`[DUO] Sweeping ${CARRY}+${s.id}...\n`);
    const withS = await sweep([CARRY, s.id], RUNS);
    duo.push({ support: s.id, role: s.role, with: withS, without: duoBase });
  }

  // ─── TRIO tables (primary) ───────────────────────────────────────────────────
  process.stderr.write(`\n${'='.repeat(78)}\nTRIO FRAMING (primary) — carry+DPS+support vs carry+DPS. Yields W3/W4 rounds.\n${'='.repeat(78)}\n`);

  process.stderr.write(`\n--- Win-rate (full 4-wave run) ---\n`);
  process.stderr.write(`${`${CARRY}+${PARTNER} (no support, baseline)`.padEnd(40)} | ${pct(trioBase.winRate)}\n`);
  process.stderr.write(`${`${CARRY}+${PARTNER}+shadefang (3-DPS ceiling)`.padEnd(40)} | ${pct(trioCeil.winRate)}\n`);
  for (const c of trio) process.stderr.write(`${`${CARRY}+${PARTNER}+${c.support} (${c.role})`.padEnd(40)} | ${pct(c.with.winRate)}\n`);

  process.stderr.write(`\n--- Median rounds-to-clear per wave (lower=faster kill; among runs that reached+cleared) ---\n`);
  process.stderr.write(`${'Squad'.padEnd(40)} | W1   | W2   | W3*  | W4(boss)\n${'-'.repeat(40)}-+------+------+------+--------\n`);
  const rrow = (n, d) => `${n.padEnd(40)} | ${rnd(d.medianRounds[0])}| ${rnd(d.medianRounds[1])}| ${rnd(d.medianRounds[2])}| ${rnd(d.medianRounds[3])}`;
  process.stderr.write(rrow(`${CARRY}+${PARTNER} (baseline)`, trioBase) + '\n');
  process.stderr.write(rrow(`${CARRY}+${PARTNER}+shadefang (ceiling)`, trioCeil) + '\n');
  for (const c of trio) process.stderr.write(rrow(`${CARRY}+${PARTNER}+${c.support}`, c.with) + '\n');
  process.stderr.write(`* W3 = The Pack-Lord, W4 = boss (The Cinder Maw + Tender)\n`);

  process.stderr.write(`\n--- SUPPORT CONTRIBUTION (with-support vs ${CARRY}+${PARTNER}) ---\n`);
  process.stderr.write(`Δrounds<0 = support speeds the kill · Δrounds≥0 = no help / SLOWS it (dead weight on tempo)\n`);
  process.stderr.write(`${'Support'.padEnd(11)} | role          | Δwin%  | ΔW3 rnds | ΔW4 rnds | W3 clr%(w/wo) | W4 clr%(w/wo)\n`);
  process.stderr.write(`${'-'.repeat(11)}-+---------------+--------+----------+----------+---------------+--------------\n`);
  const deltaRow = (c) => {
    const d3 = (c.with.medianRounds[2] != null && c.without.medianRounds[2] != null) ? c.with.medianRounds[2] - c.without.medianRounds[2] : null;
    const d4 = (c.with.medianRounds[3] != null && c.without.medianRounds[3] != null) ? c.with.medianRounds[3] - c.without.medianRounds[3] : null;
    const dWin = 100 * (c.with.winRate - c.without.winRate);
    return `${c.support.padEnd(11)} | ${c.role.padEnd(13)} | ${dlt(dWin).padStart(6)} | ${dlt(d3).padStart(8)} | ${dlt(d4).padStart(8)} | ${pct(c.with.condClear[2])}/${pct(c.without.condClear[2])} | ${pct(c.with.condClear[3])}/${pct(c.without.condClear[3])}`;
  };
  for (const c of trio) process.stderr.write(deltaRow(c) + '\n');

  // The literal "without support" baseline (carry+DPS) can't reach W3, so ΔW3/ΔW4
  // above are uncomputable. The SAME-SLOT SWAP isolates tempo without the squad-size
  // confound: fill slot 3 with this support vs with a 3rd DPS (shadefang).
  process.stderr.write(`\n--- SAME-SLOT SWAP (support in slot 3 vs a 3rd DPS, shadefang) — isolates kill-speed ---\n`);
  process.stderr.write(`Δrounds = support_rounds − dps_rounds. >0 = support is SLOWER than a DPS in the same slot.\n`);
  process.stderr.write(`${'Support'.padEnd(11)} | role          | Δwin%  | ΔW3 rnds | ΔW4 rnds | W3 clr%(sup/dps) | W4 clr%(sup/dps)\n`);
  process.stderr.write(`${'-'.repeat(11)}-+---------------+--------+----------+----------+------------------+-----------------\n`);
  for (const c of trio) {
    const d3 = (c.with.medianRounds[2] != null && trioCeil.medianRounds[2] != null) ? c.with.medianRounds[2] - trioCeil.medianRounds[2] : null;
    const d4 = (c.with.medianRounds[3] != null && trioCeil.medianRounds[3] != null) ? c.with.medianRounds[3] - trioCeil.medianRounds[3] : null;
    const dWin = 100 * (c.with.winRate - trioCeil.winRate);
    process.stderr.write(`${c.support.padEnd(11)} | ${c.role.padEnd(13)} | ${dlt(dWin).padStart(6)} | ${dlt(d3).padStart(8)} | ${dlt(d4).padStart(8)} | ${pct(c.with.condClear[2])}/${pct(trioCeil.condClear[2])} | ${pct(c.with.condClear[3])}/${pct(trioCeil.condClear[3])}\n`);
  }

  // ─── DUO tables (confirmation) ───────────────────────────────────────────────
  process.stderr.write(`\n${'='.repeat(78)}\nDUO FRAMING (confirmation) — carry+support vs carry alone. (W3/W4 unreachable at 2-unit size.)\n${'='.repeat(78)}\n`);
  process.stderr.write(`\n--- Win-rate + early-wave median rounds + clear-rates ---\n`);
  process.stderr.write(`${'Squad'.padEnd(34)} | win% | W1 rnd | W2 rnd | W1 clr% | W2 clr%\n${'-'.repeat(34)}-+------+--------+--------+---------+--------\n`);
  const duoRow = (n, d) => `${n.padEnd(34)} | ${pct(d.winRate)}| ${rnd(d.medianRounds[0])} | ${rnd(d.medianRounds[1])} | ${pct(d.condClear[0])} | ${pct(d.condClear[1])}`;
  process.stderr.write(duoRow(`${CARRY} alone (baseline)`, duoBase) + '\n');
  process.stderr.write(duoRow(`${CARRY}+${PARTNER} (2-DPS ref)`, duoRef) + '\n');
  for (const c of duo) process.stderr.write(duoRow(`${CARRY}+${c.support} (${c.role})`, c.with) + '\n');

  console.log(JSON.stringify({
    meta: {
      runs: RUNS, ground: OUTER_RING.name, tier: 'Tier 1 (no upgrades)', mode: 'AUTO (AI-vs-AI)',
      carry: CARRY, partner: PARTNER, waves: ['Scouts', 'The Pack', 'The Pack-Lord', 'boss'],
      note: 'TRIO framing is primary (yields W3/W4 rounds via the "removed → 2-creature squad" reading); DUO framing confirms via the literal carry+support pairing.',
    },
    trio: { baseline: trioBase, dps_ceiling: trioCeil, support_comps: trio },
    duo: { baseline: duoBase, dps_reference: duoRef, support_comps: duo },
  }, null, 2));
}
main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
