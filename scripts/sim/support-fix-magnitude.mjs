#!/usr/bin/env node
// ─── Ringward — SUPPORT-FIX MAGNITUDE sweep (Outer Ring) ────────────────────────
// Builds on scripts/sim/role-contribution.mjs (which found every support role adds
// ~0 kill-speed on AUTO). Here we answer: HOW MUCH effective team DPS must each
// support role add to become VIABLE (40–60% win-rate) on the Outer Ring?
//
// MODEL — abstract the hypothetical kit fix as a tunable, team-wide effective-DPS
// contribution: WHILE THE SUPPORT IS ALIVE, the squad's damage output is multiplied
// by (1 + S). Implemented by hooking each damage-dealer's `mods.dmgMult` as a live
// getter that reads the support unit's `.alive` flag — so the buff drops the instant
// the support dies mid-fight (faithful to "while alive"). The engine's combat math
// (combatMath.js: `modMult(actor,'dmgMult')`) reads it on every hit. We do NOT edit
// the engine — we only set mods on units we build, exactly as the upgrade system does.
//
// This (1+S) abstraction is deliberately AI-AGNOSTIC: an always-on passive, no buff
// sequencing required (models a passive aura / reflect / chip). See the doc for the
// AI-agnostic vs AI-dependent classification of concrete kit shapes.
//
// STRETCH: also sweeps a FRONT-LOADED variant (the (1+S) applies only in round 1 of
// each fight) to see whether timing matters under the dumb AUTO AI.
//
// TRIO framing (carry + 1 DPS + 1 support) — the only squad size that reaches the
// boss. TIER-1 (no roguelike upgrades) for a clean signal. AUTO (AI-vs-AI).
//   node scripts/sim/support-fix-magnitude.mjs [runs]

import {
  makeUnitDef, COMBAT_CREATURES, createBattleState, createAIDriver,
} from '../../src/engine/combat/index.js';
import { runBattle } from '../../src/engine/combat/engine.js';

// ─── Wave generation (ported verbatim from run-sim-tier2.mjs / role-contribution) ──
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

// ─── One full Tier-1 run. supportSquadIdx = index of the support unit to buff while
// alive; S = team-DPS contribution; variant = 'always' | 'frontloaded'. ──────────
async function runOne(squadIds, seed, supportSquadIdx, S, variant) {
  const waves = wavesForGround(OUTER_RING, 1);
  let hp = squadIds.map((id) => Math.round(makeUnitDef(id, 'Balanced').hp * rarityMult(id)));
  let alive = squadIds.map(() => true);
  const perWave = Array.from({ length: N_WAVES }, () => ({ reached: false, cleared: false, rounds: null }));
  const result = { won: false, waveOfDeath: -1, wavesCleared: 0, perWave };

  for (let wi = 0; wi < waves.length; wi++) {
    perWave[wi].reached = true;

    const battleUnits = [], idxMap = [];
    squadIds.forEach((id, idx) => {
      if (!alive[idx]) return;
      const b = makeUnitDef(id, 'Balanced'); const rm = rarityMult(id);
      const maxHp = Math.round(b.hp * rm);
      battleUnits.push({ ...b, hp: Math.min(maxHp, hp[idx]), maxHp, atk: Math.round(b.atk * rm), charge: 0, mods: {} });
      idxMap.push(idx);
    });
    if (!battleUnits.length) { result.waveOfDeath = wi; break; }

    const enemies = waves[wi].enemies();
    const waveSeed = seed * 1000 + waves[wi].seed + wi * 13;
    const state = createBattleState(battleUnits, enemies, waveSeed);

    // ── Hook the support's (1+S) team-DPS contribution (only if support fielded) ──
    if (S > 0) {
      const supportPos = idxMap.indexOf(supportSquadIdx);
      if (supportPos >= 0) {
        const supportUnit = state.units.A[supportPos]; // live in-battle object; .alive flips on death
        state.units.A.forEach((u, k) => {
          if (k === supportPos) return; // buff the damage DEALERS (carry + DPS)
          Object.defineProperty(u.mods, 'dmgMult', {
            configurable: true,
            get() {
              if (!supportUnit.alive || supportUnit.hp <= 0) return 1;       // drops when support dies
              if (variant === 'frontloaded') return state.round === 1 ? (1 + S) : 1; // opener-only burst
              return 1 + S;                                                  // always-on passive
            },
          });
        });
      }
    }

    const br = await runBattle(state, { A: createAIDriver(), B: createAIDriver() });

    state.units.A.forEach((u, k) => { const idx = idxMap[k]; if (!u.alive || u.hp <= 0) { hp[idx] = 0; alive[idx] = false; } else { hp[idx] = u.hp; } });
    if (br.winner !== 'A') { result.waveOfDeath = wi; break; }

    perWave[wi].cleared = true;
    perWave[wi].rounds = br.rounds;
    result.wavesCleared = wi + 1;

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

async function sweep(squadIds, supportSquadIdx, S, variant, runs) {
  let wins = 0;
  const reached = Array(N_WAVES).fill(0), cleared = Array(N_WAVES).fill(0);
  const roundsBuckets = Array.from({ length: N_WAVES }, () => []);
  for (let i = 0; i < runs; i++) {
    const r = await runOne(squadIds, 10000 + i * 7, supportSquadIdx, S, variant); // SHARED seed schedule
    if (r.won) wins++;
    r.perWave.forEach((w, wi) => { if (w.reached) reached[wi]++; if (w.cleared) { cleared[wi]++; roundsBuckets[wi].push(w.rounds); } });
  }
  return {
    winRate: wins / runs, wins, runs,
    condClear: reached.map((rc, i) => rc > 0 ? cleared[i] / rc : 0),
    medianRounds: roundsBuckets.map(median),
  };
}

// ─── Config ─────────────────────────────────────────────────────────────────────
const CARRY = 'cinderpaw', PARTNER = 'dartwing';
const ROLES = [
  { support: 'stoneward', role: 'Bulwark/tank' },
  { support: 'mossback',  role: 'Mender/healer' },
  { support: 'buzzline',  role: 'Booster' },
];
const S_VALUES = [0, 0.15, 0.25, 0.40, 0.60, 0.80];
const RUNS = parseInt(process.argv[2] || '300', 10);
const VIABLE_LO = 0.40, VIABLE_HI = 0.60;

const pct = (x) => x == null ? '  —  ' : (100 * x).toFixed(1).padStart(5);

// smallest S whose win-rate ≥ VIABLE_LO (linear-interpolated between bracketing S for a finer target)
function targetS(curve) {
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1], b = curve[i];
    if (b.winRate >= VIABLE_LO) {
      if (a.winRate >= VIABLE_LO) continue; // already past; keep the first crossing
      const t = (VIABLE_LO - a.winRate) / (b.winRate - a.winRate);
      return { sLo: a.S, sHi: b.S, interp: a.S + t * (b.S - a.S), firstViableS: b.S, firstViableWin: b.winRate };
    }
  }
  return null; // never reaches viability within the swept range
}

async function main() {
  process.stderr.write(`SUPPORT-FIX MAGNITUDE — ${OUTER_RING.name}, TRIO (${CARRY}+${PARTNER}+support), Tier-1, AUTO, ${RUNS} runs/cell\n`);
  process.stderr.write(`Model: while the support is ALIVE, squad damage ×(1+S). Viability band = ${VIABLE_LO*100}–${VIABLE_HI*100}% win-rate.\n`);

  const data = { always: {}, frontloaded: {} };
  for (const variant of ['always', 'frontloaded']) {
    for (const r of ROLES) {
      const squad = [CARRY, PARTNER, r.support];
      const supportIdx = 2;
      const curve = [];
      for (const S of S_VALUES) {
        process.stderr.write(`[${variant}] ${r.support} S=${S.toFixed(2)} ...\r`);
        const res = await sweep(squad, supportIdx, S, variant, RUNS);
        curve.push({ S, ...res });
      }
      data[variant][r.support] = { role: r.role, curve, target: targetS(curve) };
    }
  }
  process.stderr.write(`\n`);

  // ─── ALWAYS-ON table (primary, AI-agnostic) ──────────────────────────────────
  const sCols = S_VALUES.map((s) => s.toFixed(2).padStart(5)).join(' | ');
  process.stderr.write(`\n=== WIN-RATE vs S — ALWAYS-ON (AI-agnostic passive) ===\n`);
  process.stderr.write(`${'Support (role)'.padEnd(24)} | ${sCols}\n${'-'.repeat(24)}-+${'-'.repeat(S_VALUES.length * 8)}\n`);
  for (const r of ROLES) {
    const row = data.always[r.support].curve.map((c) => pct(c.winRate)).join(' | ');
    process.stderr.write(`${`${r.support} (${r.role})`.padEnd(24)} | ${row}\n`);
  }

  process.stderr.write(`\n=== TARGET S for viability (${VIABLE_LO*100}–${VIABLE_HI*100}% win) — ALWAYS-ON ===\n`);
  for (const r of ROLES) {
    const t = data.always[r.support].target;
    if (!t) { process.stderr.write(`  ${r.support.padEnd(10)} (${r.role}): NOT viable within S≤${S_VALUES[S_VALUES.length-1]}\n`); continue; }
    process.stderr.write(`  ${r.support.padEnd(10)} (${r.role}): first viable at S=${t.firstViableS.toFixed(2)} (${pct(t.firstViableWin).trim()}% win); crosses 40% ≈ S=${t.interp.toFixed(3)} (between ${t.sLo}–${t.sHi})\n`);
  }

  // ─── FRONT-LOADED comparison (stretch: does timing matter under AUTO?) ────────
  process.stderr.write(`\n=== WIN-RATE vs S — FRONT-LOADED (round-1-only burst) ===\n`);
  process.stderr.write(`${'Support (role)'.padEnd(24)} | ${sCols}\n${'-'.repeat(24)}-+${'-'.repeat(S_VALUES.length * 8)}\n`);
  for (const r of ROLES) {
    const row = data.frontloaded[r.support].curve.map((c) => pct(c.winRate)).join(' | ');
    process.stderr.write(`${`${r.support} (${r.role})`.padEnd(24)} | ${row}\n`);
  }
  process.stderr.write(`\n(Compare to always-on: if front-loaded needs a far higher S for the same win-rate, timing matters → AI-dependent shapes underperform under AUTO.)\n`);

  // ─── Sanity ──────────────────────────────────────────────────────────────────
  const s0bad = ROLES.some((r) => data.always[r.support].curve[0].winRate > 0.02);
  process.stderr.write(`\nSANITY: S=0 win-rates = ${ROLES.map((r) => pct(data.always[r.support].curve[0].winRate).trim()).join(', ')} (must be ~0, matching role-contribution). ${s0bad ? '⚠ FAIL' : 'OK ✓'}\n`);
  for (const r of ROLES) {
    const w = data.always[r.support].curve.map((c) => c.winRate);
    const mono = w.every((x, i) => i === 0 || x >= w[i - 1] - 0.03); // allow tiny sampling noise
    process.stderr.write(`  monotonic↑ ${r.support}: ${mono ? 'OK ✓' : '⚠ check'} (${w.map((x) => (100*x).toFixed(0)).join('→')})\n`);
  }

  console.log(JSON.stringify({
    meta: {
      runs: RUNS, ground: OUTER_RING.name, framing: `TRIO ${CARRY}+${PARTNER}+support`, tier: 'Tier 1 (no upgrades)',
      mode: 'AUTO (AI-vs-AI)', model: 'while support alive, squad damage ×(1+S)', S_values: S_VALUES,
      viabilityBand: [VIABLE_LO, VIABLE_HI], variants: ['always', 'frontloaded'],
    },
    results: data,
  }, null, 2));
}
main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
