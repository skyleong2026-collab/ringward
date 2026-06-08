// THE GAUNTLET — the endless end-game. (Sky's vision: "endless rounds that go up
// mathematically and become eventually impossible — how far can you get?")
//
// Pure scaling math, kept out of the React component so the curve is one place and
// machine-verifiable. SeamLab feeds endlessCm(round) into the SAME foe() builder the
// climb uses, so a round's enemies are just role stats × a compounding multiplier.
// The compounding guarantees an eventual wall: your build is fixed (no upgrades in the
// Gauntlet), the tide isn't. Score = rounds CLEARED; your best persists.
//
// ── TUNING (feel-check freely; these are the only dials) ───────────────────────────
//  ENDLESS_GROWTH — per-round difficulty multiplier. Higher = the wall arrives sooner.
//  WARDEN_EVERY   — every Nth round is a tougher "warden" beat.
// These want Sky's playtest: how many rounds a fresh Legendary trio should clear sets
// the growth. 1.09 ≈ a Legendary trio stalls somewhere in the low-to-mid teens.
export const ENDLESS_GROWTH = 1.09;
export const WARDEN_EVERY = 5;

// Compounding enemy power for a round (1-indexed). Round 1 = ×1.0.
export function endlessCm(round) {
  return Math.pow(ENDLESS_GROWTH, Math.max(0, round - 1));
}

// How many foes stand in a given round (grows early, then caps so fights stay readable).
export function endlessPackSize(round) {
  if (round < 3) return 2;
  if (round < 8) return 3;
  return 4;
}

export const isWardenRound = (round) => round > 0 && round % WARDEN_EVERY === 0;

// Everything SeamLab needs to assemble a round EXCEPT enemy identity (which it pulls
// from a ground's locals for variety). Role HP/ATK are pre-scaling; the cm does the work.
export function endlessWaveSpec(round) {
  const warden = isWardenRound(round);
  const count = warden ? 2 : endlessPackSize(round);
  // Role stats per slot (pre-scaling). A warden fields one heavy anchor + one support;
  // a normal round is a pack with one slightly meaner lead.
  const roles = warden
    ? [{ hp: 420, atk: 60, temper: 'Greedy', anchor: true }, { hp: 230, atk: 34, temper: 'Balanced' }]
    : Array.from({ length: count }, (_, i) => ({
        hp: 150, atk: 33 + (i === 0 ? 3 : 0), temper: i === 0 ? 'Greedy' : 'Balanced',
      }));
  return {
    round,
    warden,
    cm: endlessCm(round),
    count,
    // Identity depth sets the BASELINE stat scale (foe() multiplies role stats by the
    // depth curve). Kept at 1 so round 1 opens at climb-ring-1 difficulty — approachable
    // even for a starter pair — and ALL escalation comes from the compounding cm above.
    // Bump toward 2–3 to make the Gauntlet open harder. (TUNING DIAL — feel-check.)
    identityDepth: 1,
    roles,
    seed: 700 + round, // deterministic per round
  };
}

// Slag banked for clearing a round — small but rising, so the Gauntlet feeds the economy.
export const endlessRoundSlag = (round) => 4 + round;

// Rounds you actually cleared when you fall ON `diedRound` (you didn't finish it).
export const endlessReached = (diedRound) => Math.max(0, diedRound - 1);
