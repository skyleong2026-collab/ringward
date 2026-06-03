// manual-golden-assassin.mjs — §26 golden featuring EXECUTE (conditional multiplier).
// An Assassin squad vs a pure-Reactor squad: proves the wounded-target damage spike
// runs deterministically through the engine — a glass cannon closes kills fast by
// hunting the weakest enemy. Re-bless via --print.
import { simulateAIvsAI, makeUnitDef } from '../src/engine/combat/index.js';

const SEED = 6210;
const squadA = () => [makeUnitDef('shadefang', 'Cautious'), makeUnitDef('veilclaw', 'Cautious')]; // 2 Assassin (Cautious → Execute fires)
const squadB = () => [makeUnitDef('fizzpop', 'Balanced'), makeUnitDef('glowtail', 'Balanced')];    // pure Reactor

function eventSig(e) {
  switch (e.type) {
    case 'round-start': return `R${e.round}:first=${e.firstSide}`;
    case 'turn': {
      const hits = (e.hits || []).map((h) => `${h.uid}-${h.dmg}${h.blocked ? `b${h.blocked}` : ''}${h.killed ? 'X' : ''}`).join(',');
      return `R${e.round}:${e.actor.uid}>${e.skill.id}[${e.chargeBefore}->${e.chargeAfter}](${hits})`;
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

// Locks the Assassin PAYOFF + execute mechanic: A0's Execute (76) drops B0 below the
// 45% threshold, then A1's Execute lands the ×2.5 lethal spike for 200 — the kill.
// The same finish closes B1 in R6. (Ambush, the wounded-target wildcard, competes for
// charge and is shown instead in the SeamLab "Assassin hunt" matchup, Balanced temper.)
const EXPECTED = { winner: 'A', rounds: 6, events: 26, checksum: 2748152200 };
const failures = [];
if (t1 !== transcript(r2)) failures.push('NON-DETERMINISTIC: two runs at the same seed differ');
for (const k of Object.keys(EXPECTED)) if (sig[k] !== EXPECTED[k]) failures.push(`${k}: expected ${EXPECTED[k]}, got ${sig[k]}`);

if (failures.length) {
  console.error('✗ manual-golden-assassin FAILED');
  for (const f of failures) console.error('  - ' + f);
  console.error('\nIntentional? re-bless: node scripts/manual-golden-assassin.mjs --print');
  process.exit(1);
}
console.log(`✓ manual-golden-assassin OK — winner ${sig.winner}, ${sig.rounds} rounds, ${sig.events} events, checksum ${sig.checksum}`);
