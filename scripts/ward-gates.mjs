// ward-gates.mjs — Ward Gate logic verification (headless, no DOM/React).
// Proves the Warden's Lock end-to-end path that can't be felt quickly in the UI:
// reach the gate → it bars the way → do the deed (right ring + right squad shape)
// → it solves and the way opens. Pure progression logic; the combat engine is untouched.
import { WARDS, WARD_AT, wardBlocking, activateWard, advanceWardDeeds } from '../src/data/wards.js';

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); else console.log('  ✓ ' + msg); };

const ward = WARDS.find((w) => w.id === 'paired');
ok(!!ward, 'The Warden\'s Lock exists');
ok(ward.atDepth === 4, 'it gates ring 4 → 5');
ok(WARD_AT[4]?.id === 'paired', 'WARD_AT maps depth 4 → the paired ward');
const D = ward.deed; // { ring:'fallen-gate', types:['Bulwark','Reactor'], count:2 }

console.log('\n[the gate bars the way until its deed is done]');
// Fresh save: reaching the gate (frontier win at depth 4) finds it blocking.
let wards = {};
ok(wardBlocking(4, wards)?.id === 'paired', 'at ring 4 with no progress, the gate is sealed');
ok(wardBlocking(3, wards) === null, 'no ward bars ring 3 (only depth 4 is warded)');
// Reaching it ACTIVATES the riddle (reveals it + starts tracking), still sealed.
wards = activateWard(wards, 'paired');
ok(wards.paired.active && !wards.paired.solved && (wards.paired.progress || 0) === 0, 'the riddle is now active at 0 progress');
ok(wardBlocking(4, wards)?.id === 'paired', 'still sealed while unsolved');

console.log('\n[only the RIGHT deed advances it]');
// Wrong ring: clearing the wrong place does nothing.
let r = advanceWardDeeds(wards, 'green-seam', ['Bulwark', 'Reactor']);
ok(!r.changed && r.wards === wards, 'clearing the wrong ring does not advance it');
// Right ring, wrong squad: a Bulwark alone (no Reactor) does nothing.
r = advanceWardDeeds(wards, D.ring, ['Bulwark']);
ok(!r.changed, 'the Fallen Gate with only a Bulwark does not advance it');
r = advanceWardDeeds(wards, D.ring, ['Reactor', 'Mender']);
ok(!r.changed, 'the Fallen Gate with no Bulwark does not advance it');

console.log('\n[the deed: a Bulwark + a Reactor through the Fallen Gate, twice]');
// First correct clear → progress 1, not yet solved.
r = advanceWardDeeds(wards, D.ring, ['Bulwark', 'Reactor', 'Striker']);
ok(r.changed && r.wards.paired.progress === 1 && !r.wards.paired.solved, 'first clear → 1/2, still sealed');
ok(r.solved.length === 0, 'not solved at 1/2');
ok(wardBlocking(4, r.wards)?.id === 'paired', 'still bars the way at 1/2');
// Second correct clear → progress 2 = count → SOLVED.
r = advanceWardDeeds(r.wards, D.ring, ['Reactor', 'Bulwark']);
ok(r.wards.paired.progress === 2 && r.wards.paired.solved, 'second clear → 2/2, solved');
ok(r.solved.includes('paired'), 'the solve is reported (→ unlock + key relic in-game)');

console.log('\n[once solved, the way is open for good]');
ok(wardBlocking(4, r.wards) === null, 'the gate no longer bars ring 4 → 5');
// A further clear past solved doesn't regress or double-fire.
const after = advanceWardDeeds(r.wards, D.ring, ['Bulwark', 'Reactor']);
ok(!after.changed && after.solved.length === 0, 'clearing again after solved is a no-op');

if (fails.length) {
  console.error('\n✗ ward-gates FAILED:\n  - ' + fails.join('\n  - '));
  process.exit(1);
}
console.log('\n✓ ward-gates OK — the Warden\'s Lock bars, tracks the deed, solves, and opens.');
