// RPS matchup-matrix playtest — does the rock-paper-scissors cycle hold?
//
// Intended cycle (vC-H rework):
//   BURST (Swift)  beats  RAMP (Spark)     — kill the chargers before they detonate
//   RAMP  (Spark)  beats  TANK (Guardian)  — %max-HP detonation chews through armor
//   TANK  (Guardian) beats BURST (Swift)   — retaliation grinds the fragile attackers
//   GEN   (Echo)   = generalist, should be COUNTERED by TANK (no dominant comp)
//
// Mono-squad win-rates are a coarse read (they "lie" for fine balance — see the
// mixed-squad telemetry methodology), but for an RPS *cycle* they're the right
// lens: pit pure identities head-to-head and confirm the arrows point the right
// way and no comp dominates the field.
import { CREATURES } from '../src/data/creatures.js';
import { resolveBattle } from '../src/engine/battleStepEngine.js';

const c = (id) => CREATURES.find((u) => u.id === id);
const mk = (id, iid, level = 5) => ({ ...c(id), instanceId: iid, id: iid, level, gearId: null, moduleIds: [] });

// Pure archetype squads at Lv.5, 3 units (current MAX_SQUAD).
const SQUADS = {
  TANK:  ['vault', 'bastion', 'bulwark'],
  BURST: ['fang', 'striker', 'claw'],
  RAMP:  ['spark', 'flicker', 'cinder'],
  GEN:   ['conduit', 'link', 'nexus'],
};
const build = (ids, side) => ids.map((id, i) => mk(id, `${side}${i}`));

const SEEDS = Array.from({ length: 25 }, (_, i) => i * 7 + 3); // 25 fixed seeds
const names = Object.keys(SQUADS);

// To remove side-bias, play each pairing on BOTH sides and average.
function winRate(aName, bName) {
  let aWins = 0, games = 0;
  for (const seed of SEEDS) {
    for (const flip of [false, true]) {
      const A = build(SQUADS[aName], 'a');
      const B = build(SQUADS[bName], 'b');
      const r = flip ? resolveBattle(B, A, seed) : resolveBattle(A, B, seed);
      // when flipped, A is the second arg → winner 'B' means aName won
      const aWon = flip ? r.winner === 'B' : r.winner === 'A';
      if (aWon) aWins++;
      games++;
    }
  }
  return { pct: Math.round((aWins / games) * 100), aWins, games };
}

console.log('\nRPS MATCHUP MATRIX — row win% vs column (Lv.5, 3v3, 25 seeds × 2 sides)\n');
const pad = (s, n) => String(s).padStart(n);
console.log('        ' + names.map((n) => pad(n, 7)).join(''));
const field = {}; // overall win% across all opponents
for (const a of names) field[a] = { w: 0, g: 0 };

for (const a of names) {
  const cells = [];
  for (const b of names) {
    if (a === b) { cells.push(pad('—', 7)); continue; }
    const { pct, aWins, games } = winRate(a, b);
    cells.push(pad(`${pct}%`, 7));
    field[a].w += aWins; field[a].g += games;
  }
  console.log(pad(a, 6) + '  ' + cells.join(''));
}

console.log('\nFIELD WIN% (vs all comps, balance read — closer to 50% = healthier):');
for (const a of names) {
  console.log(`  ${pad(a, 6)}  ${pad(Math.round((field[a].w / field[a].g) * 100) + '%', 5)}`);
}

// Cycle assertions — each arrow should be a majority (>55%).
console.log('\nCYCLE CHECK (intended arrows, want >55%):');
const arrows = [
  ['BURST', 'RAMP'],
  ['RAMP', 'TANK'],
  ['TANK', 'BURST'],
  ['TANK', 'GEN'], // generalist should be counterable by tank
];
let ok = true;
for (const [a, b] of arrows) {
  const { pct } = winRate(a, b);
  const good = pct > 55;
  if (!good) ok = false;
  console.log(`  ${good ? 'OK ' : 'XX '} ${a} > ${b}: ${pct}%`);
}
console.log('\nRPS CYCLE:', ok ? 'HOLDS' : 'BROKEN');
