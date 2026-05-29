// Seeded golden tests — the regression net the engine has lacked.
// Fixed squads + fixed seed must produce a stable winner / round count / survivor
// set. If a balance or engine change shifts these, the diff is intentional and
// the golden values below must be re-blessed (re-run with LOG=1 to print actuals).
import { CREATURES } from '../src/data/creatures.js';
import { resolveBattle } from '../src/engine/battleStepEngine.js';

const c = (id) => CREATURES.find((u) => u.id === id);
const mk = (id, iid, gearId, moduleIds = []) => ({
  ...c(id), instanceId: iid, id: iid, level: 1, gearId, moduleIds,
});

// Fixed scenarios exercising all 4 archetypes, starter + launch gear, and dials.
const SCENARIOS = {
  guardianVsSwift: {
    A: () => [mk('vault', 'a1', 'lastwall', ['earlyWall', 'hardplate']), mk('bastion', 'a2', 'ironhide', [])],
    B: () => [mk('fang', 'b1', 'quickstrike', ['deepCut']), mk('striker', 'b2', 'killingMomentum', ['secondWind'])],
    seed: 11,
    golden: { winner: 'A', rounds: 10, aliveA: ['a1'], aliveB: ['b2'] },
  },
  echoVsSpark: {
    A: () => [mk('conduit', 'a1', 'chainlink', ['longEcho', 'pureTone']), mk('link', 'a2', 'resonator', [])],
    B: () => [mk('spark', 'b1', 'pyreHeart', ['bankedHeat', 'backdraft']), mk('ember', 'b2', 'kindling', [])],
    seed: 22,
    golden: { winner: 'B', rounds: 10, aliveA: ['a1', 'a2'], aliveB: ['b2'] },
  },
  launchMix: {
    A: () => [mk('vault', 'a1', 'mirrorplate', ['hairTrigger']), mk('fang', 'a2', 'glassworkCore', [])],
    B: () => [mk('conduit', 'b1', 'openChannel', []), mk('spark', 'b2', 'pyreHeart', [])],
    seed: 33,
    golden: { winner: 'A', rounds: 8, aliveA: ['a1', 'a2'], aliveB: [] },
  },
};

let pass = true;
const log = process.env.LOG === '1';
function check(label, cond) {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} — ${label}`);
  if (!cond) pass = false;
}
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

for (const [name, s] of Object.entries(SCENARIOS)) {
  console.log(`\n[${name}]`);
  const r = resolveBattle(s.A(), s.B(), s.seed);
  const aliveA = r.telemetry.squadA.filter((u) => u.alive).map((u) => u.instanceId);
  const aliveB = r.telemetry.squadB.filter((u) => u.alive).map((u) => u.instanceId);
  if (log) console.log('  actual:', JSON.stringify({ winner: r.winner, rounds: r.rounds, aliveA, aliveB }));

  check(`winner === ${s.golden.winner}`, r.winner === s.golden.winner);
  check(`rounds === ${s.golden.rounds}`, r.rounds === s.golden.rounds);
  check(`squadA survivors [${s.golden.aliveA}]`, sameSet(aliveA, s.golden.aliveA));
  check(`squadB survivors [${s.golden.aliveB}]`, sameSet(aliveB, s.golden.aliveB));

  // Determinism: same seed twice → identical winner/rounds.
  const r2 = resolveBattle(s.A(), s.B(), s.seed);
  check('deterministic across runs', r2.winner === r.winner && r2.rounds === r.rounds);
}

console.log('\nGOLDEN:', pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 1);
