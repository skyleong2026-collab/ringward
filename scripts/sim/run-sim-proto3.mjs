#!/usr/bin/env node
// ─── PROTOTYPE 3: Brace → MARK (real kit change, golden-safe behind mods.braceMark) ──
// The faithful version of fix #1: the tank's Brace applies vulnerability to its target so
// the CARRIES hit it harder (tank = tempo, not just defense). The engine change lives in
// src/engine/combat/skills/bulwark.js (opt-in mods.braceMark; default off = byte-identical,
// goldens verified). Here we set braceMark=N stacks on each Bulwark unit and sweep N.
// greedy draft, AUTO. Target: lift the Anchor + tank comps into 40-60% without raw stat buffs.

import { makeUnitDef, COMBAT_CREATURES, createBattleState, createAIDriver } from '../../src/engine/combat/index.js';
import { runBattle } from '../../src/engine/combat/engine.js';
import { createRng } from '../../src/engine/rng.js';

const D_HP = (d) => 1 + 0.34 * (d - 1) - 0.017 * (d - 1) ** 2;
const D_ATK = (d) => 1 + 0.30 * (d - 1) - 0.018 * (d - 1) ** 2;
const foe = (id, t, hp, atk, d, ex = {}) => { const h = Math.round(hp * D_HP(d)); return { ...makeUnitDef(id, t), hp: h, maxHp: h, atk: Math.round(atk * D_ATK(d)), ...ex }; };
const OUTER = { depth: 1, biasIds: ['fizzpop', 'glowtail', 'cinderpaw'] };
function waves(g) { const d = g.depth, at = (i) => g.biasIds[i % g.biasIds.length], F = (id, t, hp, atk, ex) => foe(id, t, hp, atk, d, ex);
  return [
    { seed: 101, enemies: () => [F(at(0), 'Cautious', 110, 26), F(at(1), 'Cautious', 105, 26)] },
    { seed: 202, enemies: () => [F(at(0), 'Balanced', 175, 40), F(at(1), 'Balanced', 175, 38), F(at(2), 'Balanced', 165, 40)] },
    { seed: 303, enemies: () => [F(at(0), 'Greedy', 300, 50), F(at(1), 'Greedy', 220, 62)] },
    { seed: 404, enemies: () => [F(at(0), 'Greedy', 540, 68, { speed: 7 }), F('mossback', 'Balanced', 240, 24)] },
  ]; }
const PATCHUP = 0.18;
const RARITY_OF = { fizzpop: 'Common', glowtail: 'Rare', cinderpaw: 'Legendary', stoneward: 'Common', ironwall: 'Rare', mossback: 'Common', dewleaf: 'Rare', buzzline: 'Common', tanglewing: 'Rare', swiftpaw: 'Rare', dartwing: 'Legendary', shadefang: 'Rare', veilclaw: 'Legendary', blightcap: 'Legendary', hexmoth: 'Unique', frostwarden: 'Legendary', rimecaller: 'Unique' };
const RM = { Common: 1.0, Rare: 1.2, Legendary: 1.45, Unique: 1.7 };
const rarityMult = (id) => RM[RARITY_OF[id] || 'Common'];
const UPGRADES = [
  { id: 'sharpen', scope: 'squad', apply: (m) => { m.dmgMult *= 1.3; } }, { id: 'wellspring', scope: 'squad', apply: (m) => { m.healMult *= 1.4; } },
  { id: 'bastion', scope: 'squad', apply: (m) => { m.blockMult *= 1.4; } }, { id: 'primed', scope: 'squad', apply: (m) => { m.chargeStart += 2; } },
  { id: 'thickhide', scope: 'squad', apply: (m) => { m.hpMult *= 1.2; } }, { id: 'wildfire', scope: 'squad', apply: (m) => { m.burnBonus += 1; } },
  { id: 'overhype', scope: 'squad', apply: (m) => { m.ampBonus += 1; } }, { id: 'firststrike', scope: 'squad', apply: (m) => { m.opener = true; } },
  { id: 'leech', scope: 'squad', apply: (m) => { m.lifesteal = (m.lifesteal || 0) + 0.12; } }, { id: 'killingblow', scope: 'squad', apply: (m) => { m.executioner = (m.executioner || 0) + 0.3; } },
  { id: 'secondwind', scope: 'squad', apply: (m) => { m.phoenix = true; } }, { id: 'bloodrush', scope: 'squad', apply: (m) => { m.killCharge = (m.killCharge || 0) + 2; } },
  { id: 'embertrail', scope: 'unit', needsType: 'Reactor', apply: (m) => { m.overloadBurn = (m.overloadBurn || 0) + 2; } },
  { id: 'aegisreflex', scope: 'unit', needsType: 'Bulwark', apply: (m) => { m.braceTeam = 1; } },
  { id: 'lifebloom', scope: 'unit', needsType: 'Mender', apply: (m) => { m.mendRegen = (m.mendRegen || 0) + 1; } },
];
const freshMods = () => ({ dmgMult: 1, healMult: 1, blockMult: 1, hpMult: 1, chargeStart: 0, burnBonus: 0, ampBonus: 0 });
function rollOffer(at, rng) { const pool = UPGRADES.filter((u) => !(u.needsType && !at.has(u.needsType))); const out = [], w = pool.slice(); for (let k = 0; k < 3 && w.length; k++) out.push(w.splice(Math.floor(rng() * w.length), 1)[0]); return out; }
function gval(u, c) { const b = { sharpen: 10, thickhide: 8, secondwind: 7, killingblow: 6, leech: 5, primed: 4, firststrike: 4, bloodrush: 3, wildfire: c.R ? 7 : 2, overhype: c.B ? 6 : 1, bastion: c.W ? 5 : 0.5, wellspring: c.M ? 6 : 0.2 }; return u.scope === 'squad' ? (b[u.id] ?? 1) : (c.at.has(u.needsType) ? 4 : 0); }

const COMPS = [
  { name: 'Live Anchor', ids: ['cinderpaw', 'fizzpop', 'stoneward'] },
  { name: 'Balanced', ids: ['cinderpaw', 'stoneward', 'mossback'] },
  { name: 'Tank Heavy', ids: ['stoneward', 'ironwall', 'cinderpaw'] },
  { name: 'Best Guess', ids: ['cinderpaw', 'mossback', 'buzzline'] }, // no Bulwark — control
  { name: 'Glass Cannon', ids: ['cinderpaw', 'shadefang', 'dartwing'] }, // no Bulwark — control
];
const RUNS = parseInt(process.argv[2] || '300', 10);
const MARKS = [0, 1, 2, 3, 4]; // braceMark stacks (0 = today; each stack = +15% dmg taken, decays 1/round, cap 4)

async function runOne(ids, seed, mark) {
  const W = waves(OUTER), types = ids.map((id) => COMBAT_CREATURES[id].type);
  const runMods = freshMods(), unitMods = ids.map(() => ({}));
  let hp = ids.map((id) => Math.round(makeUnitDef(id, 'Balanced').hp * rarityMult(id))), alive = ids.map(() => true);
  const rng = createRng(seed ^ 0x9e3779b9); let cleared = 0;
  for (let wi = 0; wi < W.length; wi++) {
    const at = new Set(); ids.forEach((_, i) => { if (alive[i]) at.add(types[i]); });
    const c = { at, R: at.has('Reactor'), W: at.has('Bulwark'), M: at.has('Mender'), B: at.has('Booster') };
    const offer = rollOffer(at, rng);
    if (offer.length) { let best = offer[0], bv = -Infinity; for (const u of offer) { const v = gval(u, c); if (v > bv) { bv = v; best = u; } }
      if (best.scope === 'squad') best.apply(runMods); else { let t = -1, ta = -1; ids.forEach((id, i) => { if (alive[i] && types[i] === best.needsType) { const a = makeUnitDef(id, 'Balanced').atk * rarityMult(id); if (a > ta) { ta = a; t = i; } } }); if (t >= 0) best.apply(unitMods[t]); } }
    const units = [], idxMap = [];
    ids.forEach((id, idx) => { if (!alive[idx]) return; const b = makeUnitDef(id, 'Balanced'), rm = rarityMult(id);
      const maxHp = Math.round(b.hp * rm * (runMods.hpMult ?? 1));
      const mods = { ...runMods, ...unitMods[idx] };
      if (types[idx] === 'Bulwark' && mark > 0) mods.braceMark = mark; // PROTOTYPE: tank marks its target
      units.push({ ...b, hp: Math.min(maxHp, hp[idx]), maxHp, atk: Math.round(b.atk * rm), charge: Math.min(b.maxCharge ?? 6, runMods.chargeStart ?? 0), mods });
      idxMap.push(idx); });
    if (!units.length) break;
    const state = createBattleState(units, W[wi].enemies(), seed * 1000 + W[wi].seed + wi * 13);
    const br = await runBattle(state, { A: createAIDriver(), B: createAIDriver() });
    state.units.A.forEach((u, k) => { const idx = idxMap[k]; if (!u.alive || u.hp <= 0) { hp[idx] = 0; alive[idx] = false; } else hp[idx] = u.hp; });
    if (br.winner !== 'A') break; cleared = wi + 1;
    ids.forEach((id, idx) => { if (alive[idx]) { const mh = Math.round(makeUnitDef(id, 'Balanced').hp * rarityMult(id) * (runMods.hpMult ?? 1)); hp[idx] = Math.min(mh, hp[idx] + Math.round(mh * PATCHUP)); } });
  }
  return cleared === W.length;
}
async function main() {
  const grid = {};
  for (const comp of COMPS) { grid[comp.name] = [];
    for (const m of MARKS) { let w = 0; for (let i = 0; i < RUNS; i++) if (await runOne(comp.ids, 10000 + i * 7, m)) w++; grid[comp.name].push(w / RUNS); }
    process.stderr.write(`done ${comp.name}\n`); }
  const pct = (x) => (100 * x).toFixed(1).padStart(6);
  const hasW = (ids) => ids.some((id) => COMBAT_CREATURES[id].type === 'Bulwark');
  process.stderr.write(`\n=== PROTOTYPE 3: Brace → MARK (real kit change; greedy, ${RUNS} runs, AUTO) ===\n`);
  process.stderr.write(`braceMark stacks →   ${MARKS.map((m) => String(m).padStart(6)).join('  ')}\n`);
  process.stderr.write(`${'-'.repeat(20)}${'-'.repeat(MARKS.length * 8)}\n`);
  for (const comp of COMPS) { const tag = hasW(comp.ids) ? '🛡' : '  ';
    process.stderr.write(`${tag} ${comp.name.padEnd(13)} ${grid[comp.name].map(pct).join('  ')}\n`); }
  process.stderr.write(`\n🛡 = has a Bulwark (marks its target). 0 = today's game. Each stack = +15% dmg taken (cap +60%).\n`);
  console.log(JSON.stringify({ runs: RUNS, marks: MARKS, grid }, null, 2));
}
main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
