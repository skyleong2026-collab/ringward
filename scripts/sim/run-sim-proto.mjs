#!/usr/bin/env node
// ─── Ringward PROTOTYPE: "tempo-ify the tank" balance experiment ────────────────
// Hypothesis (Tier-2 fix #1): Bulwark only PREVENTS damage, so Bulwark/starter comps
// lose the attrition-through-time race. If the tank instead ACCELERATES kills — e.g.
// Brace also MARKS the target so the whole squad hits it harder — support comps become
// viable. We model that as: a living Bulwark grants the squad an extra dmgMult (a
// "mark/amp" tempo contribution), and SWEEP its magnitude to find what lands the natural
// starter squad (Live Anchor) in the 40-60% target band — WITHOUT over-buffing.
// greedy draft policy (competent player). AUTO. No live game code modified.

import { makeUnitDef, COMBAT_CREATURES, createBattleState, createAIDriver } from '../../src/engine/combat/index.js';
import { runBattle } from '../../src/engine/combat/engine.js';
import { createRng } from '../../src/engine/rng.js';

const D_HP  = (d) => 1 + 0.34 * (d - 1) - 0.017 * (d - 1) ** 2;
const D_ATK = (d) => 1 + 0.30 * (d - 1) - 0.018 * (d - 1) ** 2;
function foe(id, t, hp, atk, depth, extra = {}, cm = 1) {
  const h = Math.round(hp * D_HP(depth) * cm);
  return { ...makeUnitDef(id, t), hp: h, maxHp: h, atk: Math.round(atk * D_ATK(depth) * cm), ...extra };
}
const OUTER = { depth: 1, boss: 'The Cinder Maw', biasIds: ['fizzpop', 'glowtail', 'cinderpaw'] };
function waves(g) {
  const d = g.depth, at = (i) => g.biasIds[i % g.biasIds.length];
  const F = (id, t, hp, atk, ex) => foe(id, t, hp, atk, d, ex, 1);
  return [
    { seed: 101, enemies: () => [F(at(0), 'Cautious', 110, 26), F(at(1), 'Cautious', 105, 26)] },
    { seed: 202, enemies: () => [F(at(0), 'Balanced', 175, 40), F(at(1), 'Balanced', 175, 38), F(at(2), 'Balanced', 165, 40)] },
    { seed: 303, enemies: () => [F(at(0), 'Greedy', 300, 50), F(at(1), 'Greedy', 220, 62)] },
    { seed: 404, boss: true, enemies: () => [F(at(0), 'Greedy', 540, 68, { speed: 7 }), F('mossback', 'Balanced', 240, 24)] },
  ];
}
const PATCHUP = 0.18;
const RARITY_OF = { fizzpop: 'Common', glowtail: 'Rare', cinderpaw: 'Legendary', stoneward: 'Common', ironwall: 'Rare', mossback: 'Common', dewleaf: 'Rare', buzzline: 'Common', tanglewing: 'Rare', swiftpaw: 'Rare', dartwing: 'Legendary', shadefang: 'Rare', veilclaw: 'Legendary', blightcap: 'Legendary', hexmoth: 'Unique', frostwarden: 'Legendary', rimecaller: 'Unique' };
const RM = { Common: 1.0, Rare: 1.2, Legendary: 1.45, Unique: 1.7 };
const rarityMult = (id) => RM[RARITY_OF[id] || 'Common'];

const UPGRADES = [
  { id: 'sharpen', scope: 'squad', apply: (m) => { m.dmgMult *= 1.3; } },
  { id: 'wellspring', scope: 'squad', apply: (m) => { m.healMult *= 1.4; } },
  { id: 'bastion', scope: 'squad', apply: (m) => { m.blockMult *= 1.4; } },
  { id: 'primed', scope: 'squad', apply: (m) => { m.chargeStart += 2; } },
  { id: 'thickhide', scope: 'squad', apply: (m) => { m.hpMult *= 1.2; } },
  { id: 'wildfire', scope: 'squad', apply: (m) => { m.burnBonus += 1; } },
  { id: 'overhype', scope: 'squad', apply: (m) => { m.ampBonus += 1; } },
  { id: 'firststrike', scope: 'squad', apply: (m) => { m.opener = true; } },
  { id: 'leech', scope: 'squad', apply: (m) => { m.lifesteal = (m.lifesteal || 0) + 0.12; } },
  { id: 'killingblow', scope: 'squad', apply: (m) => { m.executioner = (m.executioner || 0) + 0.3; } },
  { id: 'secondwind', scope: 'squad', apply: (m) => { m.phoenix = true; } },
  { id: 'bloodrush', scope: 'squad', apply: (m) => { m.killCharge = (m.killCharge || 0) + 2; } },
  { id: 'embertrail', scope: 'unit', needsType: 'Reactor', apply: (m) => { m.overloadBurn = (m.overloadBurn || 0) + 2; } },
  { id: 'twinstrike', scope: 'unit', needsType: 'Striker', apply: (m) => { m.extraHits = (m.extraHits || 0) + 1; } },
  { id: 'huntersmark', scope: 'unit', needsType: 'Assassin', apply: (m) => { m.executeWindow = (m.executeWindow || 0) + 0.15; } },
  { id: 'aegisreflex', scope: 'unit', needsType: 'Bulwark', apply: (m) => { m.braceTeam = 1; } },
  { id: 'lifebloom', scope: 'unit', needsType: 'Mender', apply: (m) => { m.mendRegen = (m.mendRegen || 0) + 1; } },
  { id: 'powerchord', scope: 'unit', needsType: 'Booster', apply: (m) => { m.primeTeam = 1; } },
];
const freshMods = () => ({ dmgMult: 1, healMult: 1, blockMult: 1, hpMult: 1, chargeStart: 0, burnBonus: 0, ampBonus: 0 });
function rollOffer(aliveTypes, rng) {
  const pool = UPGRADES.filter((u) => !(u.needsType && !aliveTypes.has(u.needsType)));
  const out = [], work = pool.slice();
  for (let k = 0; k < 3 && work.length; k++) out.push(work.splice(Math.floor(rng() * work.length), 1)[0]);
  return out;
}
function greedyVal(u, ctx) {
  const b = { sharpen: 10, thickhide: 8, secondwind: 7, killingblow: 6, leech: 5, primed: 4, firststrike: 4, bloodrush: 3, wildfire: ctx.R ? 7 : 2, overhype: ctx.B ? 6 : 1, bastion: ctx.W ? 5 : 0.5, wellspring: ctx.M ? 6 : 0.2 };
  if (u.scope === 'squad') return b[u.id] ?? 1;
  return ctx.aliveTypes.has(u.needsType) ? 4 : 0;
}

const COMPS = [
  { name: 'Live Anchor', ids: ['cinderpaw', 'fizzpop', 'stoneward'], bulwark: true },
  { name: 'Balanced', ids: ['cinderpaw', 'stoneward', 'mossback'], bulwark: true },
  { name: 'Tank Heavy', ids: ['stoneward', 'ironwall', 'cinderpaw'], bulwark: true },
  { name: 'Glass Cannon', ids: ['cinderpaw', 'shadefang', 'dartwing'] },
  { name: 'Control', ids: ['frostwarden', 'rimecaller', 'cinderpaw'] },
  { name: 'Striker Rush', ids: ['swiftpaw', 'dartwing', 'cinderpaw'] },
];

const RUNS = parseInt(process.argv[2] || '300', 10);
const TEMPOS = [1.0, 1.15, 1.25, 1.35, 1.5]; // tank's extra squad dmgMult (1.0 = today's baseline)

async function runOne(squadIds, seed, tankTempo) {
  const W = waves(OUTER);
  const types = squadIds.map((id) => COMBAT_CREATURES[id].type);
  const runMods = freshMods();
  const unitMods = squadIds.map(() => ({}));
  let hp = squadIds.map((id) => Math.round(makeUnitDef(id, 'Balanced').hp * rarityMult(id)));
  let alive = squadIds.map(() => true);
  const rng = createRng(seed ^ 0x9e3779b9);
  let cleared = 0;

  for (let wi = 0; wi < W.length; wi++) {
    const aliveTypes = new Set(); squadIds.forEach((_, i) => { if (alive[i]) aliveTypes.add(types[i]); });
    const ctx = { aliveTypes, R: aliveTypes.has('Reactor'), W: aliveTypes.has('Bulwark'), M: aliveTypes.has('Mender'), B: aliveTypes.has('Booster') };
    const offer = rollOffer(aliveTypes, rng);
    if (offer.length) {
      let best = offer[0], bv = -Infinity;
      for (const u of offer) { const v = greedyVal(u, ctx); if (v > bv) { bv = v; best = u; } }
      if (best.scope === 'squad') best.apply(runMods);
      else { let t = -1, ta = -1; squadIds.forEach((id, i) => { if (alive[i] && types[i] === best.needsType) { const a = makeUnitDef(id, 'Balanced').atk * rarityMult(id); if (a > ta) { ta = a; t = i; } } }); if (t >= 0) best.apply(unitMods[t]); }
    }

    // PROTOTYPE: a living Bulwark grants the squad a tempo dmgMult (models Brace→mark/amp)
    const hasLiveBulwark = squadIds.some((id, i) => alive[i] && types[i] === 'Bulwark');
    const tempoMult = hasLiveBulwark ? tankTempo : 1.0;

    const units = [], idxMap = [];
    squadIds.forEach((id, idx) => {
      if (!alive[idx]) return;
      const b = makeUnitDef(id, 'Balanced'); const rm = rarityMult(id);
      const maxHp = Math.round(b.hp * rm * (runMods.hpMult ?? 1));
      const mods = { ...runMods, ...unitMods[idx] };
      mods.dmgMult = (mods.dmgMult ?? 1) * tempoMult; // tank tempo contribution
      units.push({ ...b, hp: Math.min(maxHp, hp[idx]), maxHp, atk: Math.round(b.atk * rm), charge: Math.min(b.maxCharge ?? 6, runMods.chargeStart ?? 0), mods });
      idxMap.push(idx);
    });
    if (!units.length) break;

    const state = createBattleState(units, W[wi].enemies(), seed * 1000 + W[wi].seed + wi * 13);
    const br = await runBattle(state, { A: createAIDriver(), B: createAIDriver() });
    state.units.A.forEach((u, k) => { const idx = idxMap[k]; if (!u.alive || u.hp <= 0) { hp[idx] = 0; alive[idx] = false; } else hp[idx] = u.hp; });
    if (br.winner !== 'A') break;
    cleared = wi + 1;
    squadIds.forEach((id, idx) => { if (alive[idx]) { const maxHp = Math.round(makeUnitDef(id, 'Balanced').hp * rarityMult(id) * (runMods.hpMult ?? 1)); hp[idx] = Math.min(maxHp, hp[idx] + Math.round(maxHp * PATCHUP)); } });
  }
  return cleared === W.length;
}

async function main() {
  const grid = {}; // comp -> [winrate per tempo]
  for (const comp of COMPS) {
    grid[comp.name] = [];
    for (const tempo of TEMPOS) {
      let wins = 0;
      for (let i = 0; i < RUNS; i++) if (await runOne(comp.ids, 10000 + i * 7, tempo)) wins++;
      grid[comp.name].push(wins / RUNS);
    }
    process.stderr.write(`done ${comp.name}\n`);
  }

  const pct = (x) => (100 * x).toFixed(1).padStart(6);
  process.stderr.write(`\n=== PROTOTYPE: tank-tempo sweep (greedy draft, ${RUNS} runs each, AUTO) ===\n`);
  process.stderr.write(`Tank tempo dmgMult →   ${TEMPOS.map((t) => ('×' + t.toFixed(2)).padStart(6)).join('  ')}\n`);
  process.stderr.write(`${'-'.repeat(22)}${'-'.repeat(TEMPOS.length * 8)}\n`);
  for (const comp of COMPS) {
    const tag = comp.bulwark ? '🛡' : '  ';
    process.stderr.write(`${tag} ${comp.name.padEnd(16)} ${grid[comp.name].map((x) => pct(x)).join('  ')}\n`);
  }
  process.stderr.write(`\n🛡 = has a Bulwark (affected by the buff). ×1.00 = today. Target: lift Live Anchor into 40-60%.\n`);
  console.log(JSON.stringify({ runs: RUNS, tempos: TEMPOS, grid }, null, 2));
}
main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
