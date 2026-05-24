function count(squad, archetype) {
  return squad.filter((u) => u.archetype === archetype).length;
}

export function generateSpotterRead(playerSquad, enemySquad) {
  const myAnchor    = count(playerSquad, 'Anchor');
  const myRelay     = count(playerSquad, 'Relay');
  const myPredator  = count(playerSquad, 'Predator');
  const myEmber     = count(playerSquad, 'Ember');

  const theirAnchor   = count(enemySquad, 'Anchor');
  const theirPredator = count(enemySquad, 'Predator');
  const theirEmber    = count(enemySquad, 'Ember');

  const lines = [];

  // Line 1 — what YOUR squad is built to do
  if (myAnchor > 0 && myEmber > 0) {
    lines.push('Anchor buys time. Ember climbs behind it. This comp rewards fights that go long.');
  } else if (myEmber > 0 && myAnchor === 0) {
    lines.push('Your Ember needs time to scale. Nothing is buying it. Early pressure cuts the payoff short.');
  } else if (myPredator >= 2 && myAnchor > 0) {
    lines.push('Execute pressure is high here. Anchor covers the open flank.');
  } else if (myPredator >= 2 && myAnchor === 0) {
    lines.push('High execute potential. No stabilizer — first casualty opens a gap.');
  } else if (myRelay > 0 && playerSquad.length - myRelay >= 4) {
    lines.push(
      `Your Relay has ${playerSquad.length - myRelay} units to amplify. Echo chains should fire consistently.`
    );
  } else if (myAnchor >= 2) {
    lines.push('Double Anchor. Hard to break. You need sustained damage output or this stalls.');
  } else if (myAnchor === 0) {
    lines.push('No Anchor in your lineup. Damage lands directly. Expect early casualties.');
  } else {
    lines.push('Balanced composition. No clear spike — output will be consistent, not explosive.');
  }

  // Line 2 — matchup-specific read (intentionally silent sometimes)
  let line2 = null;

  if (theirPredator >= 2 && myAnchor === 0) {
    line2 = 'Their Predators find exposed targets immediately.';
  } else if (myEmber > 0 && theirAnchor >= 2) {
    line2 = 'Your Ember may outscale their wall — if it survives long enough.';
  } else if (myPredator > 0 && theirAnchor >= 2) {
    line2 = 'Their Anchors absorb early execute pressure. Predators need to be patient.';
  } else if (myEmber > 0 && theirEmber > 0) {
    line2 = 'Both sides are scaling. Who survives longer decides it.';
  } else if (theirEmber >= 3) {
    line2 = 'Multiple scaling threats on their side. Individually fragile. Collectively unpredictable.';
  } else if (myRelay > 0 && theirPredator >= 2) {
    line2 = 'Their Predators will find your Relay once the frontline thins.';
  }

  if (line2) lines.push(line2);

  // Threat labels — relative to YOUR squad composition
  const threatLabels = {};

  if (theirEmber >= 3) {
    // Swarm: one UNSTABLE marker is enough; spotter line covers the rest
    const idx = enemySquad.findIndex((u) => u.archetype === 'Ember');
    if (idx >= 0) threatLabels[idx] = 'UNSTABLE';
  } else if (theirEmber > 0 && myPredator === 0 && myAnchor === 0) {
    const idx = enemySquad.findIndex((u) => u.archetype === 'Ember');
    if (idx >= 0) threatLabels[idx] = 'PRIMARY THREAT';
  } else if (theirPredator > 0 && myAnchor === 0) {
    const idx = enemySquad.findIndex((u) => u.archetype === 'Predator');
    if (idx >= 0) threatLabels[idx] = 'PRIMARY THREAT';
  } else if (theirEmber > 0) {
    const eIdx = enemySquad.findIndex((u) => u.archetype === 'Ember');
    if (eIdx >= 0) threatLabels[eIdx] = 'PRIMARY THREAT';
    if (theirAnchor > 0 && myPredator > 0) {
      const aIdx = enemySquad.findIndex((u) => u.archetype === 'Anchor');
      if (aIdx >= 0 && aIdx !== eIdx) threatLabels[aIdx] = 'WATCHLIST';
    }
  } else if (theirAnchor > 0 && myPredator > 0) {
    const idx = enemySquad.findIndex((u) => u.archetype === 'Anchor');
    if (idx >= 0) threatLabels[idx] = 'WATCHLIST';
  }

  return { lines, threatLabels };
}
