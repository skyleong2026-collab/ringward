// manual-golden-booster.mjs — §26 golden featuring AMPLIFICATION (cross-unit buff).
// A Booster + Reactor squad vs a pure-Reactor squad: proves the Booster's Amp lands
// on a TEAMMATE, runs deterministically through the engine, and actually swings the
// fight (the amplified carry out-trades a raw squad). Re-bless via --print.
import { simulateAIvsAI, makeUnitDef } from '../src/engine/combat/index.js';

const SEED = 9001;
const squadA = () => [makeUnitDef('buzzline', 'Balanced'), makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('cinderpaw', 'Balanced')]; // Booster + 2 Reactor
const squadB = () => [makeUnitDef('glowtail', 'Greedy'), makeUnitDef('cinderpaw', 'Greedy')];   // pure Reactor burst

function eventSig(e) {
  switch (e.type) {
    case 'round-start': return `R${e.round}:first=${e.firstSide}`;
    case 'turn': {
      const hits = (e.hits || []).map((h) => `${h.uid}-${h.dmg}${h.blocked ? `b${h.blocked}` : ''}${h.killed ? 'X' : ''}`).join(',');
      const am = (e.amps || []).map((a) => `${a.uid}^${a.amp}`).join(',');
      return `R${e.round}:${e.actor.uid}>${e.skill.id}[${e.chargeBefore}->${e.chargeAfter}]${e.amplifiedByBurn ? '*' : ''}(${hits})${am ? `[^${am}]` : ''}`;
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

// Locks the Booster PAYOFF: Overdrive loads the carry (A2) with Amp to the cap (^4),
// and the amplified Overload then lands for 218 — the buffed carry out-trades a raw
// squad. (Resonate, the line-wide wildcard, competes for the same charge and is
// shown instead in the SeamLab "Booster combo" matchup with a Greedy temperament.)
const EXPECTED = { winner: 'A', rounds: 4, events: 31, checksum: 1114647994 };
const failures = [];
if (t1 !== transcript(r2)) failures.push('NON-DETERMINISTIC: two runs at the same seed differ');
for (const k of Object.keys(EXPECTED)) if (sig[k] !== EXPECTED[k]) failures.push(`${k}: expected ${EXPECTED[k]}, got ${sig[k]}`);

if (failures.length) {
  console.error('✗ manual-golden-booster FAILED');
  for (const f of failures) console.error('  - ' + f);
  console.error('\nIntentional? re-bless: node scripts/manual-golden-booster.mjs --print');
  process.exit(1);
}
console.log(`✓ manual-golden-booster OK — winner ${sig.winner}, ${sig.rounds} rounds, ${sig.events} events, checksum ${sig.checksum}`);
