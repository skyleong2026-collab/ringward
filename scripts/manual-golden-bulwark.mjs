// manual-golden-bulwark.mjs — §26 CROSS-TYPE golden (Reactor vs Bulwark).
// Proves the seam handles a mixed-Type fight deterministically: a burst squad
// trying to crack a wall squad that charges into shields. Lives beside the other
// goldens; re-bless via --print on an intentional change.
import { simulateAIvsAI, makeUnitDef } from '../src/engine/combat/index.js';

const SEED = 4242;
const squadA = () => [makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('glowtail', 'Balanced')]; // Reactor
const squadB = () => [makeUnitDef('stoneward', 'Balanced'), makeUnitDef('ironwall', 'Balanced')]; // Bulwark

function eventSig(e) {
  switch (e.type) {
    case 'round-start': return `R${e.round}:first=${e.firstSide}`;
    case 'turn': {
      const hits = (e.hits || []).map((h) => `${h.uid}-${h.dmg}${h.blocked ? `b${h.blocked}` : ''}${h.killed ? 'X' : ''}`).join(',');
      const sh = (e.shields || []).map((s) => `${s.uid}=${s.block}`).join(',');
      return `R${e.round}:${e.actor.uid}>${e.skill.id}[${e.chargeBefore}->${e.chargeAfter}]${e.amplifiedByBurn ? '*' : ''}(${hits})${sh ? `{${sh}}` : ''}`;
    }
    case 'burn': return `R${e.round}:burn ${e.target.uid}-${e.dmg}${e.killed ? 'X' : ''}->${e.stacksLeft}`;
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

const EXPECTED = { winner: 'A', rounds: 9, events: 48, checksum: 2406512973 }; // re-anchored: roster audit (Ironwall 300/20 → 380/32, an enemy fixture here)
const failures = [];
if (t1 !== transcript(r2)) failures.push('NON-DETERMINISTIC: two runs at the same seed differ');
for (const k of Object.keys(EXPECTED)) if (sig[k] !== EXPECTED[k]) failures.push(`${k}: expected ${EXPECTED[k]}, got ${sig[k]}`);

if (failures.length) {
  console.error('✗ manual-golden-bulwark FAILED');
  for (const f of failures) console.error('  - ' + f);
  console.error('\nIntentional? re-bless: node scripts/manual-golden-bulwark.mjs --print');
  process.exit(1);
}
console.log(`✓ manual-golden-bulwark OK — winner ${sig.winner}, ${sig.rounds} rounds, ${sig.events} events, checksum ${sig.checksum}`);
