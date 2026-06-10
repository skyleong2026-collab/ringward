#!/usr/bin/env node
// ─── Ringward Outer-Ring Balance Simulator — TIER 2 (with roguelike upgrades) ──
// Extends the Tier-1 harness: before every wave the squad drafts 1-of-3 upgrades,
// injected EXACTLY as the live game does (mods → maxHp/charge/damage via the same
// engine). Brackets the draft with 3 policies to settle "overtuned vs draft-quality":
//   none     = Tier-1 baseline (no upgrades) — the floor
//   autopick = the game's actual auto-pick — now Build-Advisor SCORED (matches SeamLab upgradeScore;
//              was "first squad-scope"). The passive/farming auto-player now drafts by synergy, so this
//              column climbs from the old dumb baseline toward greedy (the ~15–27pp it used to leave behind).
//   greedy   = a competent player who takes the best pick & avoids dead drafts — ceiling-ish
// AUTO (AI-vs-AI). Does NOT modify any live game code. Outputs JSON; prints a table to stderr.

import {
  makeUnitDef, COMBAT_CREATURES, createBattleState, createAIDriver,
} from '../../src/engine/combat/index.js';
import { runBattle } from '../../src/engine/combat/engine.js';
import { createRng } from '../../src/engine/rng.js';
// ONE shared source with the live game (vF-CC) — no more hand-mirrored wave copies.
import { HUNTING_GROUNDS, wavesForGround, applyRingLaw, ringLawMods } from '../../src/engine/waves.js';

const OUTER_RING = HUNTING_GROUNDS[0];
const RINGS = HUNTING_GROUNDS;
const PATCHUP = 0.18;
// Ring laws in the sim: LAWS=0 disables (pre-law baseline); REPEAT=1 models a player who
// reuses the same squad every run (worst case for R8 "The Cold Remembers"; default on —
// that IS the autopilot player the laws exist to challenge).
const LAWS_ON = process.env.LAWS !== '0';
const REPEAT_SQUAD = process.env.REPEAT !== '0';

// ─── Rarity scaling (ported from SeamLab.jsx:161-176) ───────────────────────────
const RARITY_OF = {
  fizzpop: 'Common', glowtail: 'Rare', cinderpaw: 'Legendary', stoneward: 'Common', ironwall: 'Rare',
  mossback: 'Common', dewleaf: 'Rare', buzzline: 'Common', tanglewing: 'Rare', swiftpaw: 'Rare',
  dartwing: 'Legendary', shadefang: 'Rare', veilclaw: 'Legendary', blightcap: 'Legendary',
  hexmoth: 'Unique', frostwarden: 'Legendary', rimecaller: 'Unique',
};
const RARITY_MULT = { Common: 1.0, Rare: 1.2, Legendary: 1.45, Unique: 1.7, Keystone: 2.0 };
const rarityMult = (id) => RARITY_MULT[RARITY_OF[id] || 'Common'];

// ─── The upgrade pool (ported verbatim from SeamLab.jsx:753-783) ────────────────
const UPGRADES = [
  { id: 'sharpen',     scope: 'squad', apply: (m) => { m.dmgMult   *= 1.3; } },
  { id: 'wellspring',  scope: 'squad', needsCap: 'heal',  apply: (m) => { m.healMult  *= 1.4; } },
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
const UP_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

const freshMods = () => ({ dmgMult: 1, healMult: 1, blockMult: 1, hpMult: 1, chargeStart: 0, burnBonus: 0, ampBonus: 0 });

// rollOffer — faithful to SeamLab.jsx:2569-2579 (filter by alive types + chain prereq, then random 3)
function rollOffer(aliveTypes, livingBendSets, rng, runMods, offerCount = 3) {
  const hasCap = (cap) => cap === 'heal' ? (aliveTypes.has('Mender') || (runMods.lifesteal > 0)) : cap === 'shield' ? aliveTypes.has('Bulwark') : true;
  const pool = UPGRADES.filter((u) => {
    if (u.needsType && !aliveTypes.has(u.needsType)) return false;
    if (u.needsCap && !hasCap(u.needsCap)) return false;
    if (u.chain) return livingBendSets.some((s) => s.has(u.chain));
    return true;
  });
  const out = [];
  const work = pool.slice();
  for (let k = 0; k < offerCount && work.length; k++) {
    out.push(work.splice(Math.floor(rng() * work.length), 1)[0]);
  }
  return out;
}

// greedy value of an upgrade given the squad's present types — a competent player
// who avoids dead drafts (won't take heal-scaling without a healer, etc.)
function greedyValue(u, ctx) {
  const base = {
    sharpen: 10, thickhide: 8, secondwind: 7, killingblow: 6, leech: 5, primed: 4,
    firststrike: 4, bloodrush: 3,
    wildfire: ctx.hasReactor ? 7 : 2,
    overhype: ctx.hasBooster ? 6 : 1,
    bastion: ctx.hasBulwark ? 5 : 0.5,
    wellspring: ctx.hasMender ? 6 : 0.2, // dead without a healer — a good player skips it
  };
  if (u.scope === 'squad') return base[u.id] ?? 1;
  // unit-scope: valuable only if a living matching-Type creature is fielded
  if (!ctx.aliveTypes.has(u.needsType)) return 0;
  return u.chain ? 5 : 4;
}

// NOTE (review 2026-06-10): 'autopick' and 'greedy' currently share greedyValue — the live
// game's auto-pick uses SeamLab's upgradeScore, which differs in boss-context and synergy
// details. Treat the autopick column as ≈greedy, not as a measurement of the shipped picker.
function choosePick(offer, policy, ctx) {
  if (!offer.length) return null;
  // Both `autopick` and `greedy` now draft by SYNERGY SCORE. The game's auto-pick was upgraded from
  // "first squad-scope" to the same Build-Advisor scoring the manual ★ uses, so the passive/farming
  // player drafts as well as a competent one. Kept as distinct policies so the sweep still prints the
  // none→drafted spectrum, but they share the scorer by design now (autopick ≈ greedy is the WIN).
  let best = offer[0], bestV = -Infinity;
  for (const u of offer) { const v = greedyValue(u, ctx); if (v > bestV) { bestV = v; best = u; } }
  return best;
}

// ─── Comps (same 10 as Tier-1) ──────────────────────────────────────────────────
const COMPS = [
  { name: 'Live Anchor', ids: ['cinderpaw', 'fizzpop', 'stoneward'] },
  { name: 'Balanced', ids: ['cinderpaw', 'stoneward', 'mossback'] },
  { name: 'Glass Cannon', ids: ['cinderpaw', 'shadefang', 'dartwing'] },
  { name: 'Mono Reactor', ids: ['cinderpaw', 'fizzpop', 'glowtail'] },
  { name: 'Tank Heavy', ids: ['stoneward', 'ironwall', 'cinderpaw'] },
  { name: 'Best Guess', ids: ['cinderpaw', 'mossback', 'buzzline'] },
  { name: 'Striker Rush', ids: ['swiftpaw', 'dartwing', 'cinderpaw'] },
  { name: 'Control', ids: ['frostwarden', 'rimecaller', 'cinderpaw'] },
  { name: 'Hex Synergy', ids: ['blightcap', 'hexmoth', 'cinderpaw'] },
  { name: 'Assassin Pair', ids: ['shadefang', 'veilclaw', 'mossback'] },
];

const RUNS = parseInt(process.argv[2] || '300', 10);

// ─── One full run under a given pick policy ─────────────────────────────────────
async function runOne(squadIds, seed, policy, fixture = null, cm = 1, ground = OUTER_RING) {
  const waves = wavesForGround(ground, cm);
  const types = squadIds.map((id) => COMBAT_CREATURES[id].type);
  const runMods = freshMods();
  if (fixture) fixture.apply(runMods); // §31 recut parity: a relic cut's mods, applied run-wide like a relic
  if (LAWS_ON) ringLawMods(ground, runMods); // ring law run-mods (e.g. Witherfen: healing halved)
  const lawCtx = { repeatIds: REPEAT_SQUAD ? new Set(squadIds) : new Set() }; // R8 "Cold Remembers" worst case
  const unitMods = squadIds.map(() => ({}));
  const unitBends = squadIds.map(() => new Set());
  const baseMaxHp = squadIds.map((id) => Math.round(makeUnitDef(id, 'Balanced').hp * rarityMult(id)));
  let hp = baseMaxHp.slice();
  let alive = squadIds.map(() => true);
  const rng = createRng(seed ^ 0x9e3779b9);
  const result = { won: false, waveOfDeath: -1, wavesCleared: 0, picks: [] };

  for (let wi = 0; wi < waves.length; wi++) {
    // ── DRAFT before this wave (policy 'none' skips) ──
    if (policy !== 'none') {
      const aliveTypes = new Set();
      squadIds.forEach((_, i) => { if (alive[i]) aliveTypes.add(types[i]); });
      const livingBendSets = unitBends.filter((_, i) => alive[i]);
      const offer = rollOffer(aliveTypes, livingBendSets, rng, runMods);
      const ctx = { aliveTypes, hasReactor: aliveTypes.has('Reactor'), hasBulwark: aliveTypes.has('Bulwark'), hasMender: aliveTypes.has('Mender'), hasBooster: aliveTypes.has('Booster') };
      const pick = choosePick(offer, policy, ctx);
      if (pick) {
        if (pick.scope === 'squad') pick.apply(runMods);
        else {
          // apply to the strongest living matching-Type unit
          let tgt = -1, tatk = -1;
          squadIds.forEach((id, i) => { if (alive[i] && types[i] === pick.needsType) { const a = makeUnitDef(id, 'Balanced').atk * rarityMult(id); if (a > tatk) { tatk = a; tgt = i; } } });
          if (tgt >= 0) { pick.apply(unitMods[tgt]); unitBends[tgt].add(pick.id); }
        }
        result.picks.push(pick.id);
      } else result.picks.push(null);
    }

    // ── Build battle units with current mods + carried HP ──
    const battleUnits = [], idxMap = [];
    squadIds.forEach((id, idx) => {
      if (!alive[idx]) return;
      const b = makeUnitDef(id, 'Balanced'); const rm = rarityMult(id);
      const maxHp = Math.round(b.hp * rm * (runMods.hpMult ?? 1));
      const curHp = Math.min(maxHp, hp[idx]);
      battleUnits.push({ ...b, hp: curHp, maxHp, atk: Math.round(b.atk * rm), charge: Math.min(b.maxCharge ?? 6, runMods.chargeStart ?? 0), mods: { ...runMods, ...unitMods[idx] } });
      idxMap.push(idx);
    });
    if (!battleUnits.length) { result.waveOfDeath = wi; break; }

    const enemies = waves[wi].enemies();
    const waveSeed = seed * 1000 + waves[wi].seed + wi * 13;
    const state = createBattleState(battleUnits, enemies, waveSeed);
    if (LAWS_ON) applyRingLaw(state, ground, lawCtx); // the ring's LAW seeds the fresh battle (vF-CC)
    const br = await runBattle(state, { A: createAIDriver(), B: createAIDriver() });

    state.units.A.forEach((u, k) => { const idx = idxMap[k]; if (!u.alive || u.hp <= 0) { hp[idx] = 0; alive[idx] = false; } else { hp[idx] = u.hp; } });
    if (br.winner !== 'A') { result.waveOfDeath = wi; break; }
    result.wavesCleared = wi + 1;

    // PATCHUP survivors
    squadIds.forEach((id, idx) => {
      if (!alive[idx]) return;
      const maxHp = Math.round(makeUnitDef(id, 'Balanced').hp * rarityMult(id) * (runMods.hpMult ?? 1));
      hp[idx] = Math.min(maxHp, hp[idx] + Math.round(maxHp * PATCHUP * (runMods.healMult ?? 1))); // Subject-2 fix B: healMult floors the patch
    });
  }
  if (result.wavesCleared === waves.length) result.won = true;
  return result;
}

async function sweep(policy) {
  const out = {};
  for (const comp of COMPS) {
    let wins = 0; const deaths = [0, 0, 0, 0]; const reached = [0, 0, 0, 0]; const cleared = [0, 0, 0, 0];
    for (let i = 0; i < RUNS; i++) {
      const r = await runOne(comp.ids, 10000 + i * 7, policy);
      if (r.won) wins++;
      for (let w = 0; w <= r.wavesCleared && w < 4; w++) reached[w]++;
      for (let w = 0; w < r.wavesCleared; w++) cleared[w]++;
      if (!r.won && r.waveOfDeath >= 0) deaths[r.waveOfDeath]++;
    }
    out[comp.name] = {
      winRate: wins / RUNS, wins,
      condClear: reached.map((rc, i) => rc > 0 ? cleared[i] / rc : 0),
      deathPct: deaths.map((d) => d / RUNS),
    };
  }
  return out;
}

// ── RECUT PARITY (§31 tuning) ──────────────────────────────────────────────────
// Each relic is run on ONE squad chosen so its conditional cut is "live" (e.g. a Warden
// in the squad makes Frostfang's shatter matter). All of a relic's cuts run on that same
// squad → the Original is the baseline; a balanced cut lands within ~±2.5pp of it.
const RECUT_FIXTURES = [
  { relic: 'Whetstone Fang (Rare)', squad: ['frostwarden', 'cinderpaw', 'swiftpaw'], cuts: [
    { label: 'Original  +35% dmg',          apply: (m) => { m.dmgMult *= 1.35; } },
    { label: 'Tempo Edge +28% dmg +1c',     apply: (m) => { m.dmgMult *= 1.28; m.chargeStart += 1; } },
    { label: 'Frostfang +30% dmg +shatter', apply: (m) => { m.dmgMult *= 1.3; m.shatter = true; } },
  ] },
  { relic: 'Ironwood Charm (Common)', squad: ['ironwall', 'cinderpaw', 'swiftpaw'], cuts: [
    { label: 'Original  +18% HP',            apply: (m) => { m.hpMult *= 1.18; } },
    { label: 'Thornwood +12% HP +5% thorns', apply: (m) => { m.hpMult *= 1.12; m.thorns = (m.thorns || 0) + 0.05; } },
  ] },
  { relic: 'Bulwark Stone (Rare)', squad: ['ironwall', 'mossback', 'cinderpaw'], cuts: [
    { label: 'Original +30% HP +30% shield',  apply: (m) => { m.hpMult *= 1.3; m.blockMult *= 1.3; } },
    { label: 'Bastion  +24/+24 +10% thorns',  apply: (m) => { m.hpMult *= 1.24; m.blockMult *= 1.24; m.thorns = (m.thorns || 0) + 0.1; } },
    { label: 'Lifewall +24% HP +14% heal',    apply: (m) => { m.hpMult *= 1.24; m.healMult *= 1.14; } },
  ] },
  { relic: 'Bloodpact (Legendary)', squad: ['cinderpaw', 'swiftpaw', 'glowtail'], cuts: [
    { label: 'Original  +30dmg +40heal -10HP', apply: (m) => { m.dmgMult *= 1.3; m.healMult *= 1.4; m.hpMult *= 0.9; } },
    { label: "Berserker +48dmg -10HP",         apply: (m) => { m.dmgMult *= 1.48; m.hpMult *= 0.9; } },
    // ⚠ MIRROR: keep these cut numbers in sync with RELIC_CUTS in SeamLab.jsx (shipped 17/9).
    { label: 'Bloodwell +17dmg +9% steal -10HP', apply: (m) => { m.dmgMult *= 1.17; m.lifesteal = (m.lifesteal || 0) + 0.09; m.hpMult *= 0.9; } },
  ] },
  { relic: 'Drop-Shard (Legendary)', squad: ['cinderpaw', 'swiftpaw', 'mossback'], cuts: [
    { label: 'Original  +18dmg +18HP +1c', apply: (m) => { m.dmgMult *= 1.18; m.hpMult *= 1.18; m.chargeStart += 1; } },
    { label: 'Edge-Shard +25% dmg +1c',    apply: (m) => { m.dmgMult *= 1.25; m.chargeStart += 1; } },
  ] },
  // ── Phase 2 (stat/tempo cuts that balance generically; pure-verb relics — opener/shatter/
  //    apex/executioner — DROPPED: their verb is their identity and a flat cut over-performs) ──
  { relic: 'Stoneblood (Common)', squad: ['ironwall', 'cinderpaw', 'swiftpaw'], cuts: [
    { label: 'Original  +22% HP',           apply: (m) => { m.hpMult *= 1.22; } },
    { label: 'Spineblood +16% HP +5% thorns', apply: (m) => { m.hpMult *= 1.16; m.thorns = (m.thorns || 0) + 0.05; } },
  ] },
  { relic: 'Ember Brand (Rare)', squad: ['cinderpaw', 'glowtail', 'swiftpaw'], cuts: [
    { label: 'Original  burns+2 +10% dmg',  apply: (m) => { m.burnBonus += 2; m.dmgMult *= 1.1; } },
    { label: 'Searbrand +16% dmg burns+1',  apply: (m) => { m.dmgMult *= 1.16; m.burnBonus += 1; } },
  ] },
  { relic: 'Reckless Charm (Rare)', squad: ['cinderpaw', 'swiftpaw', 'glowtail'], cuts: [
    { label: 'Original  +55% dmg -18% HP',  apply: (m) => { m.dmgMult *= 1.55; m.hpMult *= 0.82; } },
    { label: 'Bloodrage +48% dmg +1c -15% HP', apply: (m) => { m.dmgMult *= 1.48; m.chargeStart += 1; m.hpMult *= 0.85; } },
  ] },
  { relic: 'Wrathcore (Rare)', squad: ['cinderpaw', 'swiftpaw', 'glowtail'], cuts: [
    { label: 'Original +42% dmg -12% heal', apply: (m) => { m.dmgMult *= 1.42; m.healMult *= 0.88; } },
    { label: 'Warcry  +34% dmg +1c -12% heal', apply: (m) => { m.dmgMult *= 1.34; m.chargeStart += 1; m.healMult *= 0.88; } },
  ] },
  { relic: 'Bramble Hide (Rare)', squad: ['ironwall', 'cinderpaw', 'swiftpaw'], cuts: [
    { label: 'Original  25% thorns',        apply: (m) => { m.thorns = (m.thorns || 0) + 0.25; } },
    { label: 'Razorvine +8% dmg +12% thorns', apply: (m) => { m.dmgMult *= 1.08; m.thorns = (m.thorns || 0) + 0.12; } },
  ] },
  { relic: 'Reservoir Core (Rare)', squad: ['cinderpaw', 'swiftpaw', 'glowtail'], cuts: [
    { label: 'Original  killCharge+2',      apply: (m) => { m.killCharge = (m.killCharge || 0) + 2; } },
    { label: 'Surge Core killCharge+1 +8% dmg', apply: (m) => { m.killCharge = (m.killCharge || 0) + 1; m.dmgMult *= 1.08; } },
  ] },
  { relic: 'Glass Edge (Legendary)', squad: ['cinderpaw', 'swiftpaw', 'glowtail'], cuts: [
    { label: 'Original   +70% dmg -30% HP', apply: (m) => { m.dmgMult *= 1.7; m.hpMult *= 0.7; } },
    { label: 'Edgewalker +56% dmg +1c -25% HP', apply: (m) => { m.dmgMult *= 1.56; m.chargeStart += 1; m.hpMult *= 0.75; } },
  ] },
  // Vampiric Edge dropped from recut: its lifesteal is a sustain verb (ill-defined parity on the
  // short Outer Ring — any damage cut over-performs it generically). Same as the other verb relics.
  { relic: 'Frenzy Totem (Legendary)', squad: ['cinderpaw', 'swiftpaw', 'glowtail'], cuts: [
    { label: 'Original  +20% dmg +1c',      apply: (m) => { m.dmgMult *= 1.2; m.chargeStart += 1; } },
    { label: 'Onslaught +26% dmg',          apply: (m) => { m.dmgMult *= 1.26; } },
  ] },
];
async function parity() {
  const N = Number(process.env.PRUNS || 400);
  const CM = Number(process.env.DIFF || 1.5); // harder-than-Ring-1 so win-rates de-saturate and DEFENSE can matter
  process.stderr.write(`\n=== §31 RECUT PARITY — ${N} runs/cut, greedy policy, difficulty ×${CM} ===\n`);
  process.stderr.write(`(Δ = vs Original on the SAME squad; |Δ| ≤ ~2.5pp = balanced sidegrade)\n`);
  const report = [];
  for (const fx of RECUT_FIXTURES) {
    process.stderr.write(`\n${fx.relic}   [squad: ${fx.squad.join(', ')}]\n`);
    let baseWr = null;
    for (const cut of fx.cuts) {
      let wins = 0;
      for (let i = 0; i < N; i++) { const r = await runOne(fx.squad, 20000 + i * 7, 'greedy', cut, CM); if (r.won) wins++; }
      const wr = wins / N;
      if (baseWr === null) baseWr = wr;
      const d = (wr - baseWr) * 100;
      const flag = Math.abs(d) > 2.5 && baseWr !== wr ? '  ⚠' : '';
      process.stderr.write(`  ${(wr * 100).toFixed(1).padStart(5)}%  Δ${(d >= 0 ? '+' : '') + d.toFixed(1)}pp${flag.padStart(4)}  ${cut.label}\n`);
      report.push({ relic: fx.relic, cut: cut.label, wr, delta: d });
    }
  }
  console.log(JSON.stringify(report, null, 2));
}

// ── DEPTH LADDER (content-depth lane) ────────────────────────────────────────────
// Maps the Ring 1→8 climb: every comp × every ring, greedy drafting. Two gear levels:
//   raw    = creatures + drafts only (a player who rushed deep)
//   geared = + a representative meta kit (perks + a 3-relic loadout ≈ what a climber owns)
// Questions it answers: is the curve a fair ladder or a cliff? do different rings favor
// different comps (ring identity → build-counter demand)? where do deaths cluster?
const GEAR_KIT = { label: 'geared (+25% dmg, +25% HP, +1c, +20% heal)',
  apply: (m) => { m.dmgMult *= 1.25; m.hpMult *= 1.25; m.chargeStart += 1; m.healMult *= 1.2; } };
async function depths() {
  const N = Number(process.env.PRUNS || 200);
  const gear = process.env.GEAR === '1' ? GEAR_KIT : null;
  process.stderr.write(`\n=== DEPTH LADDER — ${N} runs/cell, greedy policy, ${gear ? gear.label : 'raw (no meta kit)'} ===\n`);
  process.stderr.write(`${'Comp'.padEnd(14)} | ${RINGS.map((g) => ('R' + g.depth).padStart(5)).join(' |')}\n`);
  process.stderr.write(`${'-'.repeat(14)}-+${RINGS.map(() => '------').join('+')}\n`);
  const matrix = {};
  for (const comp of COMPS) {
    const row = [];
    for (const g of RINGS) {
      let wins = 0;
      for (let i = 0; i < N; i++) { const r = await runOne(comp.ids, 30000 + i * 7, 'greedy', gear, 1, g); if (r.won) wins++; }
      row.push(wins / N);
    }
    matrix[comp.name] = row;
    process.stderr.write(`${comp.name.padEnd(14)} | ${row.map((w) => (100 * w).toFixed(0).padStart(5)).join(' |')}\n`);
  }
  // column means — the ladder's shape at a glance
  const colMean = RINGS.map((_, c) => Object.values(matrix).reduce((s, r) => s + r[c], 0) / COMPS.length);
  process.stderr.write(`${'-'.repeat(14)}-+${RINGS.map(() => '------').join('+')}\n`);
  process.stderr.write(`${'MEAN'.padEnd(14)} | ${colMean.map((w) => (100 * w).toFixed(0).padStart(5)).join(' |')}\n`);
  console.log(JSON.stringify({ meta: { runs: N, gear: !!gear }, matrix, colMean }, null, 2));
}
// Offense vs defense BY DEPTH — two real same-rarity relics as the kits. The product
// question: at what depth (if any) does survivability start beating raw damage?
async function offdef() {
  const N = Number(process.env.PRUNS || 300);
  const KITS = [
    { label: 'Whetstone Fang  +35% dmg',        apply: (m) => { m.dmgMult *= 1.35; } },
    { label: 'Bulwark Stone   +30% HP +30% sh', apply: (m) => { m.hpMult *= 1.3; m.blockMult *= 1.3; } },
  ];
  const SQUADS = [
    { name: 'Balanced', ids: ['cinderpaw', 'stoneward', 'mossback'] },
    { name: 'Tank Heavy', ids: ['stoneward', 'ironwall', 'cinderpaw'] },
  ];
  process.stderr.write(`\n=== OFFENSE vs DEFENSE BY DEPTH — ${N} runs/cell, greedy ===\n`);
  for (const sq of SQUADS) {
    process.stderr.write(`\n[${sq.name}: ${sq.ids.join(', ')}]\n`);
    for (const kit of KITS) {
      const row = [];
      for (const g of RINGS) {
        let wins = 0;
        for (let i = 0; i < N; i++) { const r = await runOne(sq.ids, 40000 + i * 7, 'greedy', kit, 1, g); if (r.won) wins++; }
        row.push(wins / N);
      }
      process.stderr.write(`  ${kit.label.padEnd(28)} | ${row.map((w) => (100 * w).toFixed(0).padStart(5)).join(' |')}\n`);
    }
  }
  console.log('{}');
}

// Kit-threat calibration: SAME depth, each enemy Type in isolation → how much of the
// difficulty is the kit (not the stats)? Drives the per-Type threat coefficients.
const TYPE_PAIRS = {
  Reactor: ['fizzpop', 'glowtail', 'cinderpaw'], Bulwark: ['stoneward', 'ironwall'],
  Mender: ['mossback', 'dewleaf'], Booster: ['buzzline', 'tanglewing'],
  Striker: ['swiftpaw', 'dartwing'], Assassin: ['shadefang', 'veilclaw'],
  Hexer: ['blightcap', 'hexmoth'], Warden: ['frostwarden', 'rimecaller'],
};
async function kits() {
  const N = Number(process.env.PRUNS || 300);
  const d = Number(process.env.DEPTH || 4);
  const SQ = [
    { name: 'Balanced', ids: ['cinderpaw', 'stoneward', 'mossback'] },
    { name: 'Glass Cannon', ids: ['cinderpaw', 'shadefang', 'dartwing'] },
    { name: 'Tank Heavy', ids: ['stoneward', 'ironwall', 'cinderpaw'] },
  ];
  process.stderr.write(`\n=== KIT-THREAT CALIBRATION — depth ${d}, geared, ${N} runs/cell ===\n`);
  process.stderr.write(`${'EnemyType'.padEnd(10)} | ${SQ.map((s) => s.name.padStart(12)).join(' |')} |  mean\n`);
  for (const [type, pool] of Object.entries(TYPE_PAIRS)) {
    const g = { id: 'cal-' + type, depth: d, boss: 'Cal ' + type, biasIds: pool };
    const row = [];
    for (const sq of SQ) {
      let wins = 0;
      for (let i = 0; i < N; i++) { const r = await runOne(sq.ids, 50000 + i * 7, 'greedy', GEAR_KIT, 1, g); if (r.won) wins++; }
      row.push(wins / N);
    }
    const mean = row.reduce((s, x) => s + x, 0) / row.length;
    process.stderr.write(`${type.padEnd(10)} | ${row.map((w) => (100 * w).toFixed(0).padStart(12)).join(' |')} | ${(100 * mean).toFixed(0).padStart(5)}\n`);
  }
  console.log('{}');
}

async function main() {
  if (process.argv.includes('--parity')) { await parity(); return; }
  if (process.argv.includes('--depths')) { await depths(); return; }
  if (process.argv.includes('--offdef')) { await offdef(); return; }
  if (process.argv.includes('--kits')) { await kits(); return; }
  const policies = ['none', 'autopick', 'greedy'];
  const data = {};
  for (const p of policies) { process.stderr.write(`Sweeping policy=${p} (${RUNS} runs × ${COMPS.length} comps)...\n`); data[p] = await sweep(p); }

  // ── readable comparison table to stderr ──
  const pct = (x) => (100 * x).toFixed(1).padStart(5);
  process.stderr.write(`\n=== TIER-2 WIN-RATE BY COMP (${RUNS} runs each, AUTO) ===\n`);
  process.stderr.write(`${'Comp'.padEnd(16)} | none  | auto  | greedy\n`);
  process.stderr.write(`${'-'.repeat(16)}-+-------+-------+-------\n`);
  let tot = { none: 0, autopick: 0, greedy: 0 };
  for (const comp of COMPS) {
    const row = policies.map((p) => pct(data[p][comp.name].winRate)).join(' | ');
    process.stderr.write(`${comp.name.padEnd(16)} | ${row}\n`);
    for (const p of policies) tot[p] += data[p][comp.name].wins;
  }
  const N = RUNS * COMPS.length;
  process.stderr.write(`${'-'.repeat(16)}-+-------+-------+-------\n`);
  process.stderr.write(`${'OVERALL'.padEnd(16)} | ${pct(tot.none / N)} | ${pct(tot.autopick / N)} | ${pct(tot.greedy / N)}\n`);
  process.stderr.write(`\nLegend: none=no upgrades (Tier-1 baseline) · auto=game auto-pick · greedy=competent drafting\n`);

  console.log(JSON.stringify({ meta: { runs: RUNS, comps: COMPS.length, policies, mode: 'AUTO', tier: 'Tier 2 (upgrades)' }, results: data }, null, 2));
}
main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
