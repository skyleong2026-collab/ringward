// Phase 17 — seeded balance harness (a REPORT, not a pass/fail gate).
// Runs many seeded matchups and reports win-rate per archetype and per gear so
// the level curve + TBD gear numbers can be tuned. Run: `npm run test:balance`.
//
// IMPORTANT: the engine has a structural side-A advantage on speed ties under a
// fixed seed. To measure a squad's TRUE strength we play every matchup on BOTH
// sides (swap A/B) and average, which cancels the side bias.
import { CREATURES } from '../src/data/creatures.js';
import { GEAR } from '../src/data/gear.js';
import { resolveBattle } from '../src/engine/battleStepEngine.js';

const SEEDS = Number(process.env.SEEDS ?? 200);
const LEVEL = Number(process.env.LEVEL ?? 3);

const c = (id) => CREATURES.find((u) => u.id === id);
let _iid = 0;
const mk = (id, gearId = null, moduleIds = [], level = LEVEL) => ({
  ...c(id), instanceId: `u${_iid++}`, id: `${id}_${_iid}`, level, gearId, moduleIds,
});

// Representative 3-unit squad per archetype, each on its starter gear.
const STARTER = { Guardian: 'ironhide', Echo: 'resonator', Swift: 'quickstrike', Spark: 'kindling' };
const ROSTER = {
  Guardian: () => [mk('vault', 'ironhide'), mk('bastion', 'ironhide'), mk('bulwark', 'lastwall')],
  Echo:     () => [mk('conduit', 'resonator'), mk('nexus', 'chainlink'), mk('link', 'resonator')],
  Swift:    () => [mk('fang', 'quickstrike'), mk('striker', 'killingMomentum'), mk('claw', 'quickstrike')],
  Spark:    () => [mk('spark', 'kindling'), mk('flicker', 'pyreHeart'), mk('cinder', 'kindling')],
};
const ARCHES = Object.keys(ROSTER);

// Play `subject` vs `opp` over SEEDS, alternating sides each seed. Returns subject win-rate.
function winRate(subjectFn, oppFn) {
  let wins = 0;
  for (let s = 0; s < SEEDS; s++) {
    if (s % 2 === 0) {
      if (resolveBattle(subjectFn(), oppFn(), s).winner === 'A') wins++;
    } else {
      if (resolveBattle(oppFn(), subjectFn(), s).winner === 'B') wins++;
    }
  }
  return wins / SEEDS;
}

const pct = (x) => `${(100 * x).toFixed(0)}%`.padStart(4);

// ─── 1. Archetype round-robin ──────────────────────────────────────────────
console.log(`\n=== ARCHETYPE BALANCE @ Lv.${LEVEL} (${SEEDS} seeds, sides swapped) ===`);
const archWin = {};
for (const a of ARCHES) {
  let total = 0, n = 0;
  const row = [];
  for (const b of ARCHES) {
    if (a === b) { row.push(' --  '); continue; }
    const wr = winRate(ROSTER[a], ROSTER[b]);
    row.push(pct(wr));
    total += wr; n++;
  }
  archWin[a] = total / n;
  console.log(`  ${a.padEnd(9)} vs [${ARCHES.map((x) => x.slice(0, 3)).join('   ')}]  ${row.join('  ')}   avg ${pct(archWin[a])}`);
}
const archVals = Object.values(archWin);
const archSpread = Math.max(...archVals) - Math.min(...archVals);
console.log(`  → archetype win-rate spread (max-min avg): ${pct(archSpread)}  ${archSpread <= 0.2 ? 'OK' : 'IMBALANCED'}`);

// ─── 2. Per-gear marginal value (stat-matched mirror) ───────────────────────
// Isolate gear value by holding stats EQUAL: the test squad and the baseline
// squad are identical except the lead unit's gear. Win-rate vs the starter-gear
// baseline reads as: >55% the gear beats its starter, ~50% neutral, <45% worse.
// This removes the archetype stat mismatch that would otherwise swamp the signal.
console.log(`\n=== GEAR MARGINAL VALUE @ Lv.${LEVEL} (${SEEDS} seeds, mirror vs starter-gear baseline) ===`);
const LEAD = { Guardian: 'vault', Echo: 'conduit', Swift: 'fang', Spark: 'spark' };
for (const arch of ARCHES) {
  const lead = LEAD[arch];
  const support = () => [mk(lead, STARTER[arch]), mk(lead, STARTER[arch])];
  const baseline = () => [mk(lead, STARTER[arch]), ...support()];
  const gears = Object.values(GEAR).filter((g) => g.archetype === arch || g.archetype === null);
  console.log(`  ${arch} (lead ${c(lead).name}, baseline gear ${GEAR[STARTER[arch]].name}):`);
  for (const g of gears) {
    const test = () => [mk(lead, g.id), ...support()];
    const wr = winRate(test, baseline);
    const flag = wr > 0.6 ? '  <-- dominant' : wr < 0.4 ? '  <-- weak' : '';
    console.log(`    ${g.name.padEnd(18)} ${pct(wr)}${flag}`);
  }
}

// ─── 3. Mixed-squad round-robin ─────────────────────────────────────────────
// Mono-archetype squads (section 1) measure "how good is a support class when
// DENIED support" — a false read for synergy archetypes (Echo amplifies allies,
// Spark feeds on allied kills). These comps are squads a player might actually
// field. If Echo/Spark stop looking weak here, the section-1 spread was an
// artifact, not a balance bug. Mono comps are padded to 4 units for fair size.
const starterFor = (id) => mk(id, STARTER[c(id).archetype]);
const COMPS = {
  Balanced: () => ['vault', 'conduit', 'fang', 'spark'].map(starterFor),
  AmpRush:  () => ['conduit', 'link', 'fang', 'striker'].map(starterFor),   // 2 Echo amp 2 Swift
  Bunker:   () => ['vault', 'bastion', 'spark', 'flicker'].map(starterFor), // 2 tanks buy Spark time
  Wall:     () => ['vault', 'bastion', 'bulwark', 'vault'].map(starterFor), // mono-Guardian extreme
  Glass:    () => ['fang', 'striker', 'claw', 'fang'].map(starterFor),      // mono-Swift extreme
};
const COMP_NAMES = Object.keys(COMPS);
console.log(`\n=== MIXED-SQUAD BALANCE @ Lv.${LEVEL} (${SEEDS} seeds, sides swapped) ===`);
const compWin = {};
for (const a of COMP_NAMES) {
  let total = 0, n = 0;
  const row = [];
  for (const b of COMP_NAMES) {
    if (a === b) { row.push(' --  '); continue; }
    const wr = winRate(COMPS[a], COMPS[b]);
    row.push(pct(wr));
    total += wr; n++;
  }
  compWin[a] = total / n;
  console.log(`  ${a.padEnd(9)} ${row.join('  ')}   avg ${pct(compWin[a])}`);
}
console.log(`  cols: [${COMP_NAMES.map((x) => x.padStart(5)).join(' ')}]`);
const compVals = Object.values(compWin);
const compSpread = Math.max(...compVals) - Math.min(...compVals);
console.log(`  → mixed-comp win-rate spread: ${pct(compSpread)}  ${compSpread <= 0.2 ? 'OK' : 'IMBALANCED'}`);

// ─── 4. Role stress test (outcome-blind) ────────────────────────────────────
// Win-rate hides force multipliers: a support unit can have low kills but high
// amplification and still be overpowered. Run a Balanced mirror and average each
// archetype's ROLE contribution from engine telemetry — so we judge Echo by
// amplification, Spark by scaling reached, Guardian by damage soaked, etc.
console.log(`\n=== ROLE STRESS TEST @ Lv.${LEVEL} (${SEEDS} seeds, Balanced mirror) ===`);
const roleAgg = {};
function tallyRole(units, rounds) {
  for (const u of units) {
    const a = (roleAgg[u.archetype] ??= {
      dealt: 0, taken: 0, shield: 0, echo: 0, kills: 0, peak: 0, alive: 0, surv: 0, n: 0,
    });
    a.dealt += u.tel.damageDealt;
    a.taken += u.tel.damageTaken;
    a.shield += u.tel.shieldAbsorbed;
    a.echo += u.tel.echoDamage;
    a.kills += u.tel.standardKills + u.tel.executeKills;
    a.peak += u.tel.peakStacks;
    a.alive += u.alive ? 1 : 0;
    a.surv += u.tel.fell ?? rounds; // round it fell, or full battle length if it lived
    a.n += 1;
  }
}
for (let s = 0; s < SEEDS; s++) {
  const r = resolveBattle(COMPS.Balanced(), COMPS.Balanced(), s);
  tallyRole(r.telemetry.squadA, r.rounds);
  tallyRole(r.telemetry.squadB, r.rounds);
}
console.log('  archetype  dmgDealt  dmgSoaked  shieldAbs  echoAmp  kills  peakStk  survive%  survRnd');
for (const arch of ARCHES) {
  const a = roleAgg[arch];
  if (!a) continue;
  const v = (x) => (x / a.n);
  console.log(
    `  ${arch.padEnd(9)} ` +
    `${v(a.dealt).toFixed(0).padStart(7)}  ` +
    `${v(a.taken).toFixed(0).padStart(8)}  ` +
    `${v(a.shield).toFixed(0).padStart(8)}  ` +
    `${v(a.echo).toFixed(0).padStart(6)}  ` +
    `${v(a.kills).toFixed(1).padStart(5)}  ` +
    `${v(a.peak).toFixed(1).padStart(6)}  ` +
    `${pct(a.alive / a.n).padStart(7)}  ` +
    `${v(a.surv).toFixed(1).padStart(6)}`
  );
}

// ─── 5. Spark ramp diagnostic (too-small vs too-late) ───────────────────────
// Spark reaching 9 stacks but posting 76 damage (section 4) is ambiguous: is the
// payoff too SMALL (curve is flat) or too LATE (curve spikes after the fight is
// already decided)? Damage-by-round answers it — compare Spark's curve against
// Swift's (a healthy front-loaded dealer). Survival distribution shows whether
// Spark even lives long enough to cash in the stacks it built.
console.log(`\n=== SPARK RAMP DIAGNOSTIC @ Lv.${LEVEL} (${SEEDS} seeds, Balanced mirror) ===`);
const MAXR = 10;
const dmgByRound = {};
const archCount = {};
for (const a of ARCHES) { dmgByRound[a] = Array(MAXR + 1).fill(0); archCount[a] = 0; }
const sparkFell = Array(MAXR + 1).fill(0);
let sparkSurvived = 0, sparkTotal = 0;
for (let s = 0; s < SEEDS; s++) {
  const r = resolveBattle(COMPS.Balanced(), COMPS.Balanced(), s);
  const all = [...r.telemetry.squadA, ...r.telemetry.squadB];
  const archOf = new Map(all.map((u) => [u.id, u.archetype]));
  for (const u of all) {
    archCount[u.archetype] += 1;
    if (u.archetype === 'Spark') {
      sparkTotal += 1;
      if (u.tel.fell == null) sparkSurvived += 1;
      else if (u.tel.fell <= MAXR) sparkFell[u.tel.fell] += 1;
    }
  }
  for (const { round, events } of r.battleLog) {
    if (round < 1 || round > MAXR) continue;
    for (const e of events) {
      if (!e.damage) continue;
      const arch = archOf.get(e.actorId);
      if (arch) dmgByRound[arch][round] += e.damage;
    }
  }
}
console.log('  round  ' + ARCHES.map((a) => a.slice(0, 4).padStart(6)).join('  ') + '   (avg dmg/unit)');
for (let rd = 1; rd <= MAXR; rd++) {
  const cells = ARCHES.map((a) => (dmgByRound[a][rd] / Math.max(1, archCount[a])).toFixed(1).padStart(6));
  console.log(`  ${String(rd).padStart(5)}  ${cells.join('  ')}`);
}
const survRow = sparkFell
  .map((n, rd) => (rd >= 1 && n > 0 ? `r${rd}:${((100 * n) / sparkTotal).toFixed(0)}%` : null))
  .filter(Boolean);
console.log(`  Spark survival: ${((100 * sparkSurvived) / sparkTotal).toFixed(0)}% live to end | fell  ${survRow.join('  ')}`);

console.log('\n(report only — no pass/fail)');
