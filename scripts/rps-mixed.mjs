// Mixed-squad playtest — the real game is 3-unit drafts, not mono-archetype.
// Two questions:
//   1. Is Echo a viable SPLASH (amplifier) even though mono-Echo is 0%?
//      → does [carry, carry, Conduit] beat [carry, carry, carry]?
//   2. Does the RPS read survive when squads are mixed (does counter-picking
//      still matter, or does one blended comp dominate the field)?
import { CREATURES } from '../src/data/creatures.js';
import { resolveBattle } from '../src/engine/battleStepEngine.js';

const c = (id) => CREATURES.find((u) => u.id === id);
const mk = (id, iid, level = 5) => ({ ...c(id), instanceId: iid, id: iid, level, gearId: null, moduleIds: [] });
const build = (ids, side) => ids.map((id, i) => mk(id, `${side}${i}`));
const SEEDS = Array.from({ length: 25 }, (_, i) => i * 7 + 3);

function score(aIds, bIds) {
  let aWins = 0, games = 0;
  for (const seed of SEEDS) {
    for (const flip of [false, true]) {
      const A = build(aIds, 'a'), B = build(bIds, 'b');
      const r = flip ? resolveBattle(B, A, seed) : resolveBattle(A, B, seed);
      if (flip ? r.winner === 'B' : r.winner === 'A') aWins++;
      games++;
    }
  }
  return Math.round((aWins / games) * 100);
}

console.log('\n── Q1: Is Echo a viable SPLASH? ──\n');
const splashTests = [
  ['Burst core + Echo amp', ['fang', 'striker', 'conduit'], ['fang', 'striker', 'claw']],
  ['Tank core + Echo amp',  ['vault', 'bastion', 'conduit'], ['vault', 'bastion', 'bulwark']],
  ['Ramp core + Echo amp',  ['spark', 'flicker', 'conduit'], ['spark', 'flicker', 'cinder']],
];
for (const [label, withEcho, pure] of splashTests) {
  const pct = score(withEcho, pure);
  console.log(`  ${label}: ${pct}%  ${pct > 55 ? '(splash WINS)' : pct < 45 ? '(splash worse)' : '(coinflip)'}`);
}

console.log('\n── Q2: Blended generalists — does any single comp dominate? ──\n');
// A handful of "drafted" comps a player might bring.
const COMPS = {
  'Pure Tank':   ['vault', 'bastion', 'bulwark'],
  'Pure Burst':  ['fang', 'striker', 'claw'],
  'Pure Ramp':   ['spark', 'flicker', 'cinder'],
  'Bruiser':     ['vault', 'fang', 'striker'],   // tank front + burst
  'Siege':       ['bastion', 'spark', 'conduit'], // tank + ramp + amp
  'Balanced':    ['bastion', 'claw', 'spark'],    // one of each role-ish
};
const ks = Object.keys(COMPS);
const pad = (s, n) => String(s).padStart(n);
console.log('            ' + ks.map((k) => pad(k.slice(0, 6), 8)).join(''));
const field = {};
for (const a of ks) field[a] = { w: 0, g: 0 };
for (const a of ks) {
  const cells = [];
  for (const b of ks) {
    if (a === b) { cells.push(pad('—', 8)); continue; }
    const pct = score(COMPS[a], COMPS[b]);
    cells.push(pad(`${pct}%`, 8));
    field[a].w += pct; field[a].g += 1;
  }
  console.log(pad(a.slice(0, 10), 11) + ' ' + cells.join(''));
}
console.log('\nAVG WIN% vs field (want a spread, none ~ totally dominant/dead):');
const ranked = ks.map((a) => [a, Math.round(field[a].w / field[a].g)]).sort((x, y) => y[1] - x[1]);
for (const [a, avg] of ranked) console.log(`  ${pad(a, 11)}  ${avg}%`);
