// manual-golden-mender.mjs — §26 golden featuring SUSTAIN (heal + regen).
// A Reactor+Mender squad vs a pure-Reactor squad: proves the Mender's heals and
// regen ward run deterministically through the engine and actually change a fight.
// Re-bless via --print on an intentional change.
import { simulateAIvsAI, makeUnitDef } from '../src/engine/combat/index.js';

const SEED = 7777;
const squadA = () => [makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('glowtail', 'Balanced'), makeUnitDef('mossback', 'Balanced')]; // 2 Reactor + Mender
const squadB = () => [makeUnitDef('cinderpaw', 'Greedy'), makeUnitDef('glowtail', 'Greedy')];   // pure Reactor burst

function eventSig(e) {
  switch (e.type) {
    case 'round-start': return `R${e.round}:first=${e.firstSide}`;
    case 'turn': {
      const hits = (e.hits || []).map((h) => `${h.uid}-${h.dmg}${h.blocked ? `b${h.blocked}` : ''}${h.killed ? 'X' : ''}`).join(',');
      const hl = (e.heals || []).filter((h) => h.healed > 0).map((h) => `${h.uid}+${h.healed}`).join(',');
      const rg = (e.regens || []).map((r) => `${r.uid}~${r.regen}`).join(',');
      return `R${e.round}:${e.actor.uid}>${e.skill.id}[${e.chargeBefore}->${e.chargeAfter}]${e.amplifiedByBurn ? '*' : ''}(${hits})${hl ? `[+${hl}]` : ''}${rg ? `[~${rg}]` : ''}`;
    }
    case 'burn': return `R${e.round}:burn ${e.target.uid}-${e.dmg}${e.killed ? 'X' : ''}->${e.stacksLeft}`;
    case 'regen': return `R${e.round}:regen ${e.target.uid}+${e.healed}->${e.stacksLeft}`;
    case 'battle-end': return `END:${e.winner}@${e.rounds}`;
    default: return `?${e.type}`;
  }
}
const transcript = (r) => r.log.map(eventSig).join('\n');
function checksum(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0; return h; }

const run = () => simulateAIvsAI(squadA(), squadB(), SEED);
const r1 = await run();
const r2 = await run();
const t1 = transcript(r1);
const sig = { winner: r1.winner, rounds: r1.rounds, events: r1.log.length, checksum: checksum(t1) };

if (process.argv.includes('--print')) {
  console.log(t1);
  console.log('\nSIGNATURE:', JSON.stringify(sig));
  process.exit(0);
}

const EXPECTED = { winner: 'A', rounds: 6, events: 50, checksum: 2585358517 };
const failures = [];
if (t1 !== transcript(r2)) failures.push('NON-DETERMINISTIC: two runs at the same seed differ');
for (const k of Object.keys(EXPECTED)) if (sig[k] !== EXPECTED[k]) failures.push(`${k}: expected ${EXPECTED[k]}, got ${sig[k]}`);

if (failures.length) {
  console.error('✗ manual-golden-mender FAILED');
  for (const f of failures) console.error('  - ' + f);
  console.error('\nIntentional? re-bless: node scripts/manual-golden-mender.mjs --print');
  process.exit(1);
}
console.log(`✓ manual-golden-mender OK — winner ${sig.winner}, ${sig.rounds} rounds, ${sig.events} events, checksum ${sig.checksum}`);
