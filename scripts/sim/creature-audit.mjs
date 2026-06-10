#!/usr/bin/env node
// ─── Ringward Post-Rebalance Roster Power Audit — Outer Ring ────────────────────
// Ranks all 17 creatures by combat contribution using a SWAP-IN DELTA approach:
// fixed reference frame = [cinderpaw (carry), CREATURE_UNDER_TEST, dartwing (neutral DPS)].
// Run 300× per creature with greedy upgrade draft (ceiling-ish, a competent player).
// Win-rate + median rounds-to-clear isolate each creature's contribution in a standard
// slot. Results grouped by rarity so cross-rarity outliers are immediately visible.
//
// QA TARGETS from the rebalance:
//   buzzline/tanglewing (ATK 14→24 / 16→26), stoneward/fizzpop (stat-buffed),
//   mossback (now has passive blight chip + overheal→reflect via Mender rebalance).
//
// Scaffolding ported verbatim from scripts/sim/run-sim-tier2.mjs (DO NOT edit that file).
// Tier-2 (greedy upgrades). AUTO (AI-vs-AI). No engine edits.
//   node scripts/sim/creature-audit.mjs [runs]

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
function wavesForGround(g) {
  const d = g.depth, pool = g.biasIds, at = (i) => pool[i % pool.length];
  const F = (id, temp, hp, atk, extra) => foe(id, temp, hp, atk, d, extra);
  return [
    { name: 'Scouts',       seed: 101, enemies: () => [F(at(0), 'Cautious', 110, 26), F(at(1), 'Cautious', 105, 26)] },
    { name: 'The Pack',     seed: 202, enemies: () => [F(at(0), 'Balanced', 175, 40), F(at(1), 'Balanced', 175, 38), F(at(2), 'Balanced', 165, 40)] },
    { name: 'The Pack-Lord',seed: 303, enemies: () => [F(at(0), 'Greedy',   300, 50), F(at(1), 'Greedy',   220, 62)] },
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

// ─── Upgrade pool (ported verbatim from run-sim-tier2.mjs) ──────────────────────
const UPGRADES = [
  { id: 'sharpen',     scope: 'squad', apply: (m) => { m.dmgMult   *= 1.3; } },
  { id: 'wellspring',  scope: 'squad', needsCap: 'heal',   apply: (m) => { m.healMult  *= 1.4; } },
  { id: 'bastion',     scope: 'squad', needsCap: 'shield', apply: (m) => { m.blockMult *= 1.4; } },
  { id: 'primed',      scope: 'squad', apply: (m) => { m.chargeStart += 2; } },
  { id: 'thickhide',   scope: 'squad', apply: (m) => { m.hpMult    *= 1.2; } },
  { id: 'wildfire',    scope: 'squad', apply: (m) => { m.burnBonus += 1; } },
  { id: 'overhype',    scope: 'squad', apply: (m) => { m.ampBonus  += 1; } },
  { id: 'firststrike', scope: 'squad', apply: (m) => { m.opener = true; } },
  { id: 'leech',       scope: 'squad', apply: (m) => { m.lifesteal = (m.lifesteal || 0) + 0.12; } },
  { id: 'killingblow', scope: 'squad', apply: (m) => { m.executioner = (m.executioner || 0) + 0.3; } },
  { id: 'secondwind',  scope: 'squad', apply: (m) => { m.phoenix = true; } },
  { id: 'bloodrush',   scope: 'squad', apply: (m) => { m.killCharge = (m.killCharge || 0) + 2; } },
  { id: 'embertrail',  scope: 'unit', needsType: 'Reactor',  apply: (m) => { m.overloadBurn = (m.overloadBurn || 0) + 2; } },
  { id: 'twinstrike',  scope: 'unit', needsType: 'Striker',  apply: (m) => { m.extraHits = (m.extraHits || 0) + 1; } },
  { id: 'huntersmark', scope: 'unit', needsType: 'Assassin', apply: (m) => { m.executeWindow = (m.executeWindow || 0) + 0.15; } },
  { id: 'aegisreflex', scope: 'unit', needsType: 'Bulwark',  apply: (m) => { m.braceTeam = 1; } },
  { id: 'lifebloom',   scope: 'unit', needsType: 'Mender',   apply: (m) => { m.mendRegen = (m.mendRegen || 0) + 1; } },
  { id: 'powerchord',  scope: 'unit', needsType: 'Booster',  apply: (m) => { m.primeTeam = 1; } },
  { id: 'combustion',  scope: 'unit', needsType: 'Reactor',  chain: 'embertrail',  apply: (m) => { m.overloadAOE = true; } },
  { id: 'blitzstorm',  scope: 'unit', needsType: 'Striker',  chain: 'twinstrike',  apply: (m) => { m.blitzMulti = true; } },
  { id: 'bloodhunt',   scope: 'unit', needsType: 'Assassin', chain: 'huntersmark', apply: (m) => { m.executeHunt = true; } },
  { id: 'ironbastion', scope: 'unit', needsType: 'Bulwark',  chain: 'aegisreflex', apply: (m) => { m.braceRegen = true; } },
  { id: 'fullbloom',   scope: 'unit', needsType: 'Mender',   chain: 'lifebloom',   apply: (m) => { m.bloomAll = true; } },
  { id: 'surge',       scope: 'unit', needsType: 'Booster',  chain: 'powerchord',  apply: (m) => { m.overdriveAll = true; } },
];

const freshMods = () => ({ dmgMult: 1, healMult: 1, blockMult: 1, hpMult: 1, chargeStart: 0, burnBonus: 0, ampBonus: 0 });

function rollOffer(aliveTypes, livingBendSets, rng, runMods, offerCount = 3) {
  const hasCap = (cap) => cap === 'heal'
    ? (aliveTypes.has('Mender') || (runMods.lifesteal > 0))
    : cap === 'shield' ? aliveTypes.has('Bulwark') : true;
  const pool = UPGRADES.filter((u) => {
    if (u.needsType && !aliveTypes.has(u.needsType)) return false;
    if (u.needsCap && !hasCap(u.needsCap)) return false;
    if (u.chain) return livingBendSets.some((s) => s.has(u.chain));
    return true;
  });
  const out = [], work = pool.slice();
  for (let k = 0; k < offerCount && work.length; k++)
    out.push(work.splice(Math.floor(rng() * work.length), 1)[0]);
  return out;
}

function greedyValue(u, ctx) {
  const base = {
    sharpen: 10, thickhide: 8, secondwind: 7, killingblow: 6, leech: 5, primed: 4,
    firststrike: 4, bloodrush: 3,
    wildfire:   ctx.hasReactor ? 7 : 2,
    overhype:   ctx.hasBooster ? 6 : 1,
    bastion:    ctx.hasBulwark ? 5 : 0.5,
    wellspring: ctx.hasMender  ? 6 : 0.2,
  };
  if (u.scope === 'squad') return base[u.id] ?? 1;
  if (!ctx.aliveTypes.has(u.needsType)) return 0;
  return u.chain ? 5 : 4;
}

function choosePick(offer, ctx) {
  if (!offer.length) return null;
  let best = offer[0], bestV = -Infinity;
  for (const u of offer) { const v = greedyValue(u, ctx); if (v > bestV) { bestV = v; best = u; } }
  return best;
}

// ─── Single full 4-wave run, greedy draft, TRIO squad ───────────────────────────
async function runOne(squadIds, seed) {
  const waves = wavesForGround(OUTER_RING);
  const types = squadIds.map((id) => COMBAT_CREATURES[id].type);
  const runMods = freshMods();
  const unitMods = squadIds.map(() => ({}));
  const unitBends = squadIds.map(() => new Set());
  let hp = squadIds.map((id) => Math.round(makeUnitDef(id, 'Balanced').hp * rarityMult(id)));
  let alive = squadIds.map(() => true);
  const rng = createRng(seed ^ 0x9e3779b9);
  const perWave = Array.from({ length: 4 }, () => ({ reached: false, cleared: false, rounds: null }));
  let won = false;

  for (let wi = 0; wi < waves.length; wi++) {
    perWave[wi].reached = true;
    // greedy draft
    const aliveTypes = new Set();
    squadIds.forEach((_, i) => { if (alive[i]) aliveTypes.add(types[i]); });
    const livingBendSets = unitBends.filter((_, i) => alive[i]);
    const offer = rollOffer(aliveTypes, livingBendSets, rng, runMods);
    const ctx = {
      aliveTypes,
      hasReactor: aliveTypes.has('Reactor'), hasBulwark: aliveTypes.has('Bulwark'),
      hasMender: aliveTypes.has('Mender'),   hasBooster: aliveTypes.has('Booster'),
    };
    const pick = choosePick(offer, ctx);
    if (pick) {
      if (pick.scope === 'squad') pick.apply(runMods);
      else {
        let tgt = -1, tatk = -1;
        squadIds.forEach((id, i) => {
          if (alive[i] && types[i] === pick.needsType) {
            const a = makeUnitDef(id, 'Balanced').atk * rarityMult(id);
            if (a > tatk) { tatk = a; tgt = i; }
          }
        });
        if (tgt >= 0) { pick.apply(unitMods[tgt]); unitBends[tgt].add(pick.id); }
      }
    }

    // build battle units
    const battleUnits = [], idxMap = [];
    squadIds.forEach((id, idx) => {
      if (!alive[idx]) return;
      const b = makeUnitDef(id, 'Balanced'); const rm = rarityMult(id);
      const maxHp = Math.round(b.hp * rm * (runMods.hpMult ?? 1));
      const curHp = Math.min(maxHp, hp[idx]);
      battleUnits.push({
        ...b, hp: curHp, maxHp, atk: Math.round(b.atk * rm),
        charge: Math.min(b.maxCharge ?? 6, runMods.chargeStart ?? 0),
        mods: { ...runMods, ...unitMods[idx] },
      });
      idxMap.push(idx);
    });
    if (!battleUnits.length) break;

    const enemies = waves[wi].enemies();
    const waveSeed = seed * 1000 + waves[wi].seed + wi * 13;
    const state = createBattleState(battleUnits, enemies, waveSeed);
    const br = await runBattle(state, { A: createAIDriver(), B: createAIDriver() });

    state.units.A.forEach((u, k) => {
      const idx = idxMap[k];
      if (!u.alive || u.hp <= 0) { hp[idx] = 0; alive[idx] = false; } else { hp[idx] = u.hp; }
    });

    if (br.winner !== 'A') break;

    perWave[wi].cleared = true;
    perWave[wi].rounds = br.rounds;

    // PATCHUP
    squadIds.forEach((id, idx) => {
      if (!alive[idx]) return;
      const maxHp = Math.round(makeUnitDef(id, 'Balanced').hp * rarityMult(id) * (runMods.hpMult ?? 1));
      hp[idx] = Math.min(maxHp, hp[idx] + Math.round(maxHp * PATCHUP * (runMods.healMult ?? 1)));
    });
  }
  won = perWave.every((w) => w.cleared);
  return { won, perWave };
}

const median = (arr) => {
  if (!arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

async function sweepCreature(id, runs) {
  const squad = ['cinderpaw', id, 'dartwing']; // carry | test slot | neutral DPS
  let wins = 0;
  const roundsBuckets = [[], [], [], []];
  const reached = [0, 0, 0, 0], cleared = [0, 0, 0, 0];
  for (let i = 0; i < runs; i++) {
    const r = await runOne(squad, 10000 + i * 7);
    if (r.won) wins++;
    r.perWave.forEach((w, wi) => {
      if (w.reached) reached[wi]++;
      if (w.cleared) { cleared[wi]++; roundsBuckets[wi].push(w.rounds); }
    });
  }
  return {
    id,
    type: COMBAT_CREATURES[id].type,
    rarity: RARITY_OF[id] || 'Common',
    rarityMult: rarityMult(id),
    winRate: wins / runs,
    wins,
    condClear: reached.map((rc, i) => rc > 0 ? cleared[i] / rc : 0),
    medianRounds: roundsBuckets.map(median),
  };
}

// ─── All 17 creatures in roster order ───────────────────────────────────────────
const ALL_IDS = Object.keys(COMBAT_CREATURES);
const RUNS = parseInt(process.argv[2] || '300', 10);

// ─── QA watch-list (rebalanced this sprint) ─────────────────────────────────────
const QA_FLAGS = new Set(['buzzline', 'tanglewing', 'stoneward', 'fizzpop', 'mossback']);

const RARITY_ORDER = ['Common', 'Rare', 'Legendary', 'Unique'];

// Cross-rarity outlier thresholds (Tier-2 greedy context — win-rates cluster higher).
// "over" = punching above rarity (a Common matching a Legendary is suspect).
// "under" = dead weight for that rarity tier.
const OUTLIER = {
  Common:    { over: 0.82, under: 0.40 },  // Common should trail Rare; >82% = punching into Rare+
  Rare:      { over: 0.93, under: 0.55 },  // Rare trails Legendary; >93% = matches/beats Legendary
  Legendary: { over: 0.99, under: 0.70 },  // Legendary floor is high; <70% is underperforming
  Unique:    { over: 0.99, under: 0.70 },
};

async function main() {
  process.stderr.write(`POST-REBALANCE ROSTER AUDIT — ${OUTER_RING.name}, greedy draft, AUTO, ${RUNS} runs/creature\n`);
  process.stderr.write(`Squad: [cinderpaw (carry) | CREATURE | dartwing (neutral DPS)]\n`);
  process.stderr.write(`QA targets: ${[...QA_FLAGS].join(', ')}\n\n`);

  const results = [];
  for (const id of ALL_IDS) {
    process.stderr.write(`  sweeping ${id.padEnd(12)} (${RARITY_OF[id]?.padEnd(9)} ${COMBAT_CREATURES[id].type})...\r`);
    const r = await sweepCreature(id, RUNS);
    results.push(r);
  }
  process.stderr.write('\n');

  // Sort within each rarity by win-rate desc
  const byRarity = {};
  for (const r of RARITY_ORDER) byRarity[r] = results.filter((x) => x.rarity === r).sort((a, b) => b.winRate - a.winRate);

  const pct  = (x) => x == null ? ' — ' : (100 * x).toFixed(1).padStart(5);
  const rnd  = (x) => x == null ? ' — ' : x.toFixed(1).padStart(4);

  process.stderr.write(`\n${'='.repeat(80)}\nROSTER POWER AUDIT — Outer Ring, Tier-2 greedy, ${RUNS} runs/creature\n${'='.repeat(80)}\n`);

  const allBossRounds = results.map((r) => r.medianRounds[3]).filter((x) => x != null);
  const avgBossRounds = allBossRounds.length ? allBossRounds.reduce((s, x) => s + x, 0) / allBossRounds.length : null;

  for (const rar of RARITY_ORDER) {
    const group = byRarity[rar];
    if (!group?.length) continue;
    process.stderr.write(`\n── ${rar.toUpperCase()} (×${RARITY_MULT[rar]} rarity mult) ──\n`);
    process.stderr.write(`${'Creature'.padEnd(12)} Type       | win%  | W1clr | W2clr | W3clr | W4clr | W3 rnd | W4 rnd | QA | flag\n`);
    process.stderr.write(`${'─'.repeat(12)}-${'─'.repeat(10)}-+${'─'.repeat(6)}+${'─'.repeat(7)}+${'─'.repeat(7)}+${'─'.repeat(7)}+${'─'.repeat(7)}+${'─'.repeat(8)}+${'─'.repeat(8)}+${'─'.repeat(4)}+\n`);
    for (const r of group) {
      const qa    = QA_FLAGS.has(r.id) ? ' ★' : '  ';
      const th    = OUTLIER[r.rarity];
      const flag  = r.winRate > th.over ? '⚠ OVER' : r.winRate < th.under ? '⚠ UNDER' : '';
      process.stderr.write(
        `${r.id.padEnd(12)} ${r.type.padEnd(10)} |${pct(r.winRate)} |${pct(r.condClear[0])} |${pct(r.condClear[1])} |${pct(r.condClear[2])} |${pct(r.condClear[3])} |${rnd(r.medianRounds[2])}  |${rnd(r.medianRounds[3])}  |${qa} | ${flag}\n`,
      );
    }
  }

  // ── Cross-rarity summary ──
  process.stderr.write(`\n── SUMMARY: top + bottom per rarity ──\n`);
  for (const rar of RARITY_ORDER) {
    const g = byRarity[rar];
    if (!g?.length) continue;
    process.stderr.write(`  ${rar.padEnd(10)} TOP: ${g[0].id} (${pct(g[0].winRate).trim()}%)  BOTTOM: ${g[g.length-1].id} (${pct(g[g.length-1].winRate).trim()}%)\n`);
  }

  // ── QA-specific callouts ──
  process.stderr.write(`\n── QA WATCH-LIST (rebalanced this sprint) ──\n`);
  for (const r of results.filter((x) => QA_FLAGS.has(x.id)).sort((a, b) => b.winRate - a.winRate)) {
    const th = OUTLIER[r.rarity];
    const verdict = r.winRate > th.over ? `⚠ OVER threshold (${th.over*100}%)` : r.winRate < th.under ? `⚠ UNDER threshold (${th.under*100}%)` : `OK (${th.under*100}–${th.over*100}% expected for ${r.rarity})`;
    process.stderr.write(`  ${r.id.padEnd(12)} ${r.rarity.padEnd(10)} ${r.type.padEnd(10)} win=${pct(r.winRate).trim()}%  ${verdict}\n`);
  }

  // JSON output
  const out = {
    meta: {
      runs: RUNS, ground: OUTER_RING.name, draft: 'greedy', mode: 'AUTO (AI-vs-AI)', tier: 'Tier 2',
      squad: 'cinderpaw + [CREATURE] + dartwing', qaTargets: [...QA_FLAGS], outlierThresholds: OUTLIER,
    },
    byRarity: Object.fromEntries(RARITY_ORDER.map((r) => [r, byRarity[r] ?? []])),
    all: results.sort((a, b) => b.winRate - a.winRate),
  };
  console.log(JSON.stringify(out, null, 2));
}
main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
