// ─── Composition threat rating + counter-read (§22.10 / north-star buildcraft) ──
//
// The frozen engine snowballs: a fight's trajectory is set by COMPOSITION and BODY
// COUNT, then locked. The comp-counter.mjs harness measured exactly how:
//   • vs a Reactor SWARM, the right comp swings the fight +100 pts (fat-stat squads
//     die 0%, a blast-damping comp wins 100%) — composition is mandatory.
//   • a 3-unit squad beats ≤4 bodies but AUTO-LOSES to ≥5 (a hard cliff at +2 bodies),
//     regardless of comp — size is a brutal, separate difficulty knob.
//   • individual gear/module procs DON'T flip a parity fight (Δ0) — the build axis
//     that matters is which ARCHETYPES you field, not which gear sits on them.
//
// None of that depth is legible to the player today. This module turns an enemy
// squad into an actionable read — "what is this fight, and what does it demand" —
// so a loss reads as "wrong tool", not "unfair". Pure + deterministic; reads only
// archetype + size. It NEVER touches battleStepEngine or the goldens — meta layer.

const count = (squad, archetype) => squad.filter((u) => u.archetype === archetype).length;

// The structural profile of an enemy squad → the build it demands. `role` names the
// player ROLE (creatures.js ROLES) that answers it; `why` is the one-line read.
// Reads are TRUE to the harness, not aspirational: the wall read warns AGAINST glass
// (it measured a loss), the swarm read is the strong, confirmed counter.
const PROFILES = {
  swarm: {
    label: 'Reactor Swarm',
    role: 'Blast Damper',
    why: 'Their Reactors outscale raw stats if the fight runs long. Bring blast damping and burn them down fast — fat squads melt here.',
  },
  wall: {
    label: 'Guardian Wall',
    role: 'Shield-Breaker',
    why: 'Heavy HP and armor. Needs sustained damage and armor-stripping — glass burst stalls against the wall.',
  },
  rush: {
    label: 'Swift Rush',
    role: 'Bodyguard',
    why: 'Execute pressure on exposed targets. A high-armor frontline blunts it — bring a body to soak the burst.',
  },
  echo: {
    label: 'Echo Chain',
    role: 'Assassin',
    why: 'Amplifiers are fragile. Burst them down before their chains build — they fold to direct pressure.',
  },
  mixed: {
    label: 'Balanced Formation',
    role: null,
    why: 'No single spike to answer. Field a rounded squad — whoever holds composition longest wins.',
  },
};

// Classify by the dominant archetype (mirrors comp-counter.mjs classify()).
export function classifyComposition(squad = []) {
  const g = count(squad, 'Guardian');
  const s = count(squad, 'Spark');
  const w = count(squad, 'Swift');
  const e = count(squad, 'Echo');
  if (s >= 3) return 'swarm';
  if (g >= 2 && w === 0 && s === 0) return 'wall';
  if (w >= 2 && g === 0) return 'rush';
  if (g >= 2) return 'wall';
  if (w >= 2) return 'rush';
  if (s >= 2) return 'swarm';
  if (e >= 2) return 'echo';
  return 'mixed';
}

// Size threat is RELATIVE to the player's fielded count. The harness cliff: a deficit
// of +1 body is winnable (3 vs 4 = 100%), +2 is fatal (3 vs 5 = 0%). So:
//   fair         — enemy ≤ player
//   outnumbered  — enemy = player + 1 (winnable but pressured)
//   overwhelming — enemy ≥ player + 2 (body cliff — comp can't save it)
export function sizeThreat(enemySize, playerSize = 3) {
  const deficit = enemySize - playerSize;
  if (deficit >= 2) return 'overwhelming';
  if (deficit === 1) return 'outnumbered';
  return 'fair';
}

// Full rating for a pre-battle read. `playerSize` defaults to the 3-unit cap.
export function rateEncounter(enemySquad = [], playerSize = 3) {
  const profileKey = classifyComposition(enemySquad);
  const profile = PROFILES[profileKey];
  const size = enemySquad.length;
  const tier = sizeThreat(size, playerSize);
  return {
    profileKey,
    label: profile.label,
    counterRole: profile.role,
    counterWhy: profile.why,
    size,
    sizeTier: tier,
    // The harness verdict: a +2 body deficit is unwinnable for a squad this size,
    // regardless of composition. Surfaced as a hard warning, not a soft difficulty.
    bodyCliff: tier === 'overwhelming',
  };
}

// ─── Defeat coach — turn a loss into one concrete next move (meta layer) ───────
//
// After a loss the player asks exactly two things: WHY, and WHAT do I change.
// The READ panel already diagnoses the enemy; this answers it against the squad
// the player actually fielded, in priority order, so the prescription is singular
// (one cause, one fix) rather than a wall of advice. Stays pure: it reads only
// archetype + size + the caller's role lookup. `roleTagOf(unit)` returns a unit's
// ROLES tag string (e.g. 'Blast Damper') — passed in so this never imports data.
//
// Severity is also the SHAPE of the answer:
//   'cliff' — outnumbered past the body cliff; honestly, no build wins. Don't send
//             the player to the Stable to chase a fix that doesn't exist.
//   'comp'  — they fielded no answer to the enemy's spike. Name the counter role.
//   'gear'  — right idea, wrong margin. Point at the gear that buys headroom.
export function coachDefeat(playerSquad = [], enemySquad = [], roleTagOf = () => null) {
  const rating = rateEncounter(enemySquad, playerSquad.length);

  // 1) Body cliff first — the build-proof loss. A roster change can't save it, so
  //    don't pretend it can; redirect to fight selection instead of the Stable.
  if (rating.bodyCliff) {
    return {
      severity: 'cliff',
      cause: `Outnumbered ${rating.size} to ${playerSquad.length}. That gap, not your build, lost this.`,
      fix: 'No company of three holds a fight it brings too few bodies to — I measured it, and the line never bends. Take the ones marked FAIR or OUTNUMBERED. Leave this until you field deeper.',
      goStable: false,
    };
  }

  // 2) Wrong tool — did the player bring the role this enemy demands?
  const counter = rating.counterRole;
  if (counter) {
    const hasCounter = playerSquad.some((u) => roleTagOf(u) === counter);
    if (!hasCounter) {
      return {
        severity: 'comp',
        cause: `They run as a ${rating.label}, and you brought no answer to it.`,
        fix: `Field a ${counter}. ${rating.counterWhy}`,
        goStable: true,
      };
    }
  }

  // 3) Right idea, wrong margin — lean on gear that buys a level of headroom.
  return {
    severity: 'gear',
    cause: counter
      ? `You had the right shape for a ${rating.label} — it just came up short.`
      : 'A close one. No single thing they did, no single thing you missed.',
    fix: 'Socket gear that buys tempo or survival — Quickstrike, Sentinel, or Resonator each earn you about a level of headroom. Tune the squad in your Stable, then run it back.',
    goStable: true,
  };
}

export const COMPOSITION_PROFILES = PROFILES;
