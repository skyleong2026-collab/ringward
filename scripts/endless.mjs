// Headless test for the Gauntlet's scaling curve: compounding difficulty, pack growth,
// warden cadence, rewards, and scoring. The curve is the thing that must be right.
import {
  ENDLESS_GROWTH, WARDEN_EVERY, endlessCm, endlessPackSize, isWardenRound,
  endlessWaveSpec, endlessRoundSlag, endlessReached,
} from '../src/data/endless.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('  ✗ ' + msg); } };
const approx = (a, b) => Math.abs(a - b) < 1e-9;

// --- compounding difficulty ---
ok(endlessCm(1) === 1, 'round 1 is ×1.0 (no scaling)');
ok(approx(endlessCm(2), ENDLESS_GROWTH), 'each round multiplies by the growth rate');
ok(approx(endlessCm(3), ENDLESS_GROWTH ** 2), 'compounds (not linear)');
for (let r = 2; r <= 50; r++) ok(endlessCm(r) > endlessCm(r - 1), `round ${r} strictly harder than ${r - 1}`);
ok(endlessCm(40) > 20, 'far rounds become effectively impossible (×20+ by round 40)');

// --- pack size grows then caps ---
ok(endlessPackSize(1) === 2 && endlessPackSize(2) === 2, 'early rounds are a pair');
ok(endlessPackSize(3) === 3 && endlessPackSize(7) === 3, 'mid rounds field three');
ok(endlessPackSize(8) === 4 && endlessPackSize(99) === 4, 'caps at four — fights stay readable');

// --- warden cadence ---
ok(isWardenRound(WARDEN_EVERY) && isWardenRound(WARDEN_EVERY * 3), 'every Nth round is a warden');
ok(!isWardenRound(1) && !isWardenRound(WARDEN_EVERY - 1), 'off-cadence rounds are not wardens');

// --- wave spec shape ---
const s7 = endlessWaveSpec(7);
ok(s7.round === 7 && !s7.warden, 'round 7 is a normal pack');
ok(s7.roles.length === s7.count && s7.count === 3, 'roles match count (3 at round 7)');
ok(s7.roles.every((r) => r.hp > 0 && r.atk > 0 && r.temper), 'every role has real stats + a temperament');
ok(approx(s7.cm, endlessCm(7)), 'spec carries the round cm');
const s10 = endlessWaveSpec(10);
ok(s10.warden && s10.count === 2 && s10.roles[0].anchor, 'round 10 is a warden: anchor + support');
ok(s10.roles[0].hp > s7.roles[0].hp, 'warden anchor is beefier than a normal lead');
ok(endlessWaveSpec(3).seed !== endlessWaveSpec(4).seed, 'each round has its own deterministic seed');

// --- rewards + scoring ---
ok(endlessRoundSlag(1) < endlessRoundSlag(10), 'round slag rises with depth');
ok(endlessReached(1) === 0, 'falling on round 1 = 0 cleared');
ok(endlessReached(12) === 11, 'falling on round 12 = 11 cleared');

console.log(`endless: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
