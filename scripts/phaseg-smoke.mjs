import { CREATURES } from '../src/data/creatures.js';
import { battle } from '../src/engine/battle.js';
import { battleStepEngine as stepRun } from '../src/engine/battleStepEngine.js';

const c = (id) => CREATURES.find((u) => u.id === id);
const mk = (id, instanceId, gearId) => ({
  ...c(id), instanceId, id: instanceId, level: 1, gearId, moduleIds: [],
});

// Attackers: Swift with quickstrike (procs EXTRA ACTION on kill).
// Defenders: Guardian with lastwall (procs LAST STAND on lethal hit).
const makeA = () => [mk('fang', 'a1', 'quickstrike'), mk('striker', 'a2', 'quickstrike')];
const makeB = () => [mk('vault', 'b1', 'lastwall'), mk('bastion', 'b2', 'lastwall')];

function summarize(label, procs, key) {
  const ids = [...new Set(procs.map((p) => p.gearId))];
  const allHaveId = procs.length > 0 && procs.every((p) => p.gearId);
  console.log(`\n[${label}] proc key=${key} count=${procs.length} gearIds=${JSON.stringify(ids)}`);
  console.log('  sample:', JSON.stringify(procs.slice(0, 3)));
  return procs.length > 0 && allHaveId;
}

// battle.js (synchronous — wild-hunt / retry path)
const r1 = battle(makeA(), makeB(), 7);
const key1 = r1.gearProcs !== undefined ? 'gearProcs' : 'coreProcs';
const ok1 = summarize('battle.js', r1.gearProcs || [], key1);

// battleStepEngine.js (FTL path used by BattleScreen) — drain generator
let final = null;
const gen = stepRun(makeA(), makeB(), 7);
let step = gen.next();
while (!step.done) step = gen.next();
final = step.value;
const procs2 = final.gearProcs || final.result?.gearProcs || [];
const key2 = (final.gearProcs ?? final.result?.gearProcs) !== undefined ? 'gearProcs' : 'coreProcs';
const ok2 = summarize('battleStepEngine.js', procs2, key2);

console.log('\nRESULT:', ok1 && ok2 ? 'PASS — both engines emit gearProcs carrying gearId' : 'FAIL');
process.exit(ok1 && ok2 ? 0 : 1);
