import { CREATURES } from './creatures.js';

const c = (id) => CREATURES.find((u) => u.id === id);

// ─── Contracts (§20.8 — The Contract Frame) ───────────────────────────────────
// A contract is the smallest frame that makes a battle's outcome matter and
// gives interventions a real cost (§20.7). It is build-vs-build under a stated
// constraint: the obstacle is always another build, never a number or a timer
// for its own sake (§20.8.1).
//
// Anatomy (§20.8.2): 3 fiction fields + 3 mechanic fields.
//   Fiction : client · situation · stakes
//   Mechanic: modifier · winCondition · payout
//
// vC-A ships ONE contract ("Quiet the Signal") with NO intel layer yet — that
// is Test 2, gated on Test 1 passing (§20.8.6). Every number here is a playtest
// dial, not a lock (§20.8.7).

export const CONTRACTS = [
  {
    id: 'quiet-the-signal',
    client: 'Shadow',
    name: 'Quiet the Signal',
    // ── Fiction ──
    situation:
      'A Spark phenomenon is overcharging in the rail yard. Left alone it keeps building — each surge wider than the last. The client wants it quiet before it finishes the third.',
    stakes:
      'Walk away and the yard is lost to the surge. The client remembers who answers and who does not.',
    // ── Mechanic ──
    modifier: {
      // One readable sentence (§10 kid test) that breaks the default build.
      headline: 'You have 1 intervention this contract, not 3.',
      detail:
        'No hand-holding the fight turn by turn. The squad you bring has to carry itself.',
      interventionBudget: 1, // parameter on the existing intervention system
    },
    winCondition: {
      // Defeat the squad before its Spark completes a 3rd detonation.
      detonationLimit: 3, // the visible clock — 3rd enemy detonation = the signal completes = loss
      summary: 'Defeat the squad before its Spark completes a 3rd detonation.',
      clockLabel: 'SIGNAL',
    },
    payout: {
      // Access only, never stat-power (§20.8.2).
      artifactId: 'firstLight',
      reputation: { faction: 'Shadow', amount: 1 },
      summary: 'First Light artifact · Shadow standing +1',
    },
    rewardsLine: "Rewards an autonomous build that doesn't need babysitting.",
    // ── Enemy build ──
    // Centered on a Spark that charges fast (banked-heat dial → +2 stoke/round)
    // so the 3rd detonation is a genuine threat inside the round budget. The
    // Guardian buys the Spark time; the Swift punishes a slow opener. No combat
    // math is changed — bankedHeat is an existing module dial.
    level: 3,
    squad: [
      c('vault'),
      { ...c('cinder'), name: 'The Signal', moduleIds: ['bankedHeat'] },
      c('striker'),
    ],
  },
];

export const CONTRACTS_BY_ID = Object.fromEntries(CONTRACTS.map((k) => [k.id, k]));
