// ─── Manual-combat golden (§26.4) — NEW fixture, lives BESIDE the existing ones ──
// This does NOT replace phaseg-golden.mjs or touch resolveBattle. It is the
// regression net for the new manual engine: a fixed-seed AI-vs-AI fight must be
// (a) reproducible across runs and (b) byte-stable against the blessed signature.
//
// If a deliberate engine/dial change shifts these values, re-bless with:
//   node scripts/manual-golden.mjs --print
import { simulateAIvsAI, makeUnitDef } from '../src/engine/combat/index.js';

const SEED = 1337;

// Fixed squads exercising the charge→Overload spine and temperament knob:
// Balanced (fires Overload at 4) vs Greedy (holds for 6). Speed differs so side
// initiative is decided, not a coin-flip.
const squadA = () => [makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('glowtail', 'Balanced')];
const squadB = () => [makeUnitDef('cinderpaw', 'Greedy'), makeUnitDef('glowtail', 'Greedy')];

// A stable string view of one event — only the fields that define combat outcome.
function eventSig(e) {
  switch (e.type) {
    case 'round-start':
      return `R${e.round}:first=${e.firstSide}`;
    case 'turn': {
      const hits = (e.hits || []).map((h) => `${h.uid}-${h.dmg}${h.killed ? 'X' : ''}`).join(',');
      return `R${e.round}:${e.actor.uid}>${e.skill.id}[${e.chargeBefore}->${e.chargeAfter}]${e.amplifiedByBurn ? '*' : ''}(${hits})`;
    }
    case 'burn':
      return `R${e.round}:burn ${e.target.uid}-${e.dmg}${e.killed ? 'X' : ''}->${e.stacksLeft}`;
    case 'battle-end':
      return `END:${e.winner}@${e.rounds}`;
    default:
      return `?${e.type}`;
  }
}

function transcript(result) {
  return result.log.map(eventSig).join('\n');
}

// djb2 — tiny, stable, dependency-free. The whole transcript hashes to one number.
function checksum(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h;
}

function run() {
  return simulateAIvsAI(squadA(), squadB(), SEED);
}

const r1 = await run();
const r2 = await run();
const t1 = transcript(r1);
const t2 = transcript(r2);

const sig = {
  winner: r1.winner,
  rounds: r1.rounds,
  events: r1.log.length,
  checksum: checksum(t1),
};

if (process.argv.includes('--print')) {
  console.log(t1);
  console.log('\nSIGNATURE:', JSON.stringify(sig));
  process.exit(0);
}

// ── Blessed signature (re-bless via --print only on an intentional change) ──
const EXPECTED = { winner: 'A', rounds: 6, events: 33, checksum: 2512779283 }; // re-anchored: starter buff (Fizzpop/Stoneward)

const failures = [];

// (a) Determinism: two runs at the same seed must be byte-identical.
if (t1 !== t2) failures.push('NON-DETERMINISTIC: two runs at the same seed differ');

// (b) Signature stability.
for (const k of Object.keys(EXPECTED)) {
  if (sig[k] !== EXPECTED[k]) failures.push(`${k}: expected ${EXPECTED[k]}, got ${sig[k]}`);
}

if (failures.length) {
  console.error('✗ manual-golden FAILED');
  for (const f of failures) console.error('  - ' + f);
  console.error('\nIf this change was intentional, re-bless: node scripts/manual-golden.mjs --print');
  process.exit(1);
}

console.log(`✓ manual-golden OK — winner ${sig.winner}, ${sig.rounds} rounds, ${sig.events} events, checksum ${sig.checksum}`);
