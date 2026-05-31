// Margin telemetry for the Ramp-dominance question: when Ramp beats the blended
// comps, is it a blowout (oppressive) or a grind (fine)? Print rounds + survivors.
import { CREATURES } from '../src/data/creatures.js';
import { resolveBattle } from '../src/engine/battleStepEngine.js';

const c = (id) => CREATURES.find((u) => u.id === id);
const mk = (id, iid, level = 5) => ({ ...c(id), instanceId: iid, id: iid, level, gearId: null, moduleIds: [] });
const build = (ids, side) => ids.map((id, i) => mk(id, `${side}${i}`));
const SEEDS = Array.from({ length: 10 }, (_, i) => i * 9 + 5);

const RAMP = ['spark', 'flicker', 'cinder'];
const FOES = {
  Tank:     ['vault', 'bastion', 'bulwark'],
  Bruiser:  ['vault', 'fang', 'striker'],
  Siege:    ['bastion', 'spark', 'conduit'],
  Balanced: ['bastion', 'claw', 'spark'],
  Burst:    ['fang', 'striker', 'claw'],
};

for (const [name, foe] of Object.entries(FOES)) {
  let rampWins = 0, totRounds = 0, totRampAlive = 0;
  for (const seed of SEEDS) {
    const A = build(RAMP, 'a'), B = build(foe, 'b');
    const r = resolveBattle(A, B, seed);
    if (r.winner === 'A') rampWins++;
    totRounds += r.rounds;
    totRampAlive += r.telemetry.squadA.filter((u) => u.alive).length;
  }
  const n = SEEDS.length;
  console.log(`Ramp vs ${name.padEnd(9)} win ${rampWins}/${n}  avg ${(totRounds / n).toFixed(1)} rounds  Ramp survivors ${(totRampAlive / n).toFixed(1)}/3`);
}
