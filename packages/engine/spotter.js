function count(squad, archetype) {
  return squad.filter((u) => u.archetype === archetype).length;
}

export function generateSpotterRead(playerSquad, enemySquad) {
  const myGuardian = count(playerSquad, 'Guardian');
  const myEcho     = count(playerSquad, 'Echo');
  const mySwift    = count(playerSquad, 'Swift');
  const mySpark    = count(playerSquad, 'Spark');

  const theirGuardian = count(enemySquad, 'Guardian');
  const theirSwift    = count(enemySquad, 'Swift');
  const theirSpark    = count(enemySquad, 'Spark');

  const lines = [];

  // Line 1 — what YOUR squad is built to do
  if (myGuardian > 0 && mySpark > 0) {
    lines.push('Guardian buys time. Spark climbs behind it. This comp rewards fights that go long.');
  } else if (mySpark > 0 && myGuardian === 0) {
    lines.push('Your Spark needs time to scale. Nothing is buying it. Early pressure cuts the payoff short.');
  } else if (mySwift >= 2 && myGuardian > 0) {
    lines.push('Execute pressure is high here. Guardian covers the open flank.');
  } else if (mySwift >= 2 && myGuardian === 0) {
    lines.push('High execute potential. No stabilizer — first casualty opens a gap.');
  } else if (myEcho > 0 && playerSquad.length - myEcho >= 4) {
    lines.push(
      `Your Echo has ${playerSquad.length - myEcho} units to amplify. Echo chains should fire consistently.`
    );
  } else if (myGuardian >= 2) {
    lines.push('Double Guardian. Hard to break. You need sustained damage output or this stalls.');
  } else if (myGuardian === 0) {
    lines.push('No Guardian in your lineup. Damage lands directly. Expect early casualties.');
  } else {
    lines.push('Balanced composition. No clear spike — output will be consistent, not explosive.');
  }

  // Line 2 — matchup-specific read (intentionally silent sometimes)
  let line2 = null;

  if (theirSwift >= 2 && myGuardian === 0) {
    line2 = 'Their Swifts find exposed targets immediately.';
  } else if (mySpark > 0 && theirGuardian >= 2) {
    line2 = 'Your Spark may outscale their wall — if it survives long enough.';
  } else if (mySwift > 0 && theirGuardian >= 2) {
    line2 = 'Their Guardians absorb early execute pressure. Swifts need to be patient.';
  } else if (mySpark > 0 && theirSpark > 0) {
    line2 = 'Both sides are scaling. Who survives longer decides it.';
  } else if (theirSpark >= 3) {
    line2 = 'Multiple scaling threats on their side. Individually fragile. Collectively unpredictable.';
  } else if (myEcho > 0 && theirSwift >= 2) {
    line2 = 'Their Swifts will find your Echo once the frontline thins.';
  }

  if (line2) lines.push(line2);

  // Threat labels — relative to YOUR squad composition
  const threatLabels = {};

  if (theirSpark >= 3) {
    const idx = enemySquad.findIndex((u) => u.archetype === 'Spark');
    if (idx >= 0) threatLabels[idx] = 'UNSTABLE';
  } else if (theirSpark > 0 && mySwift === 0 && myGuardian === 0) {
    const idx = enemySquad.findIndex((u) => u.archetype === 'Spark');
    if (idx >= 0) threatLabels[idx] = 'PRIMARY THREAT';
  } else if (theirSwift > 0 && myGuardian === 0) {
    const idx = enemySquad.findIndex((u) => u.archetype === 'Swift');
    if (idx >= 0) threatLabels[idx] = 'PRIMARY THREAT';
  } else if (theirSpark > 0) {
    const eIdx = enemySquad.findIndex((u) => u.archetype === 'Spark');
    if (eIdx >= 0) threatLabels[eIdx] = 'PRIMARY THREAT';
    if (theirGuardian > 0 && mySwift > 0) {
      const aIdx = enemySquad.findIndex((u) => u.archetype === 'Guardian');
      if (aIdx >= 0 && aIdx !== eIdx) threatLabels[aIdx] = 'WATCHLIST';
    }
  } else if (theirGuardian > 0 && mySwift > 0) {
    const idx = enemySquad.findIndex((u) => u.archetype === 'Guardian');
    if (idx >= 0) threatLabels[idx] = 'WATCHLIST';
  }

  return { lines, threatLabels };
}
