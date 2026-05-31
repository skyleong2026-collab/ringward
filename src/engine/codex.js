// ─── The Codex (§20.7 / §20.8.2) ──────────────────────────────────────────────
// The persistent, growing record the contract frame writes to. This is the
// "build space that visibly grows" the North Star asks for (§20.1) — NOT a
// survival meter. For vC-A it is a DATA LAYER ONLY (Codex UI is deferred):
//   • artifacts — which rule-mutations you've unlocked access to
//   • synergies — interactions that have fired in a real fight (discovered → repeatable)
//   • reputation — faction standing, which shapes future access (never roster)
//
// Nothing here ever erases progress or touches the roster (anti-permadeath,
// §20.1). Unlocks are access, never stat-power.

const STORAGE_KEY = '8gents_codex';

function emptyCodex() {
  return { artifacts: {}, synergies: {}, reputation: {}, intel: {} };
}

export function loadCodex() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return emptyCodex();
    return { ...emptyCodex(), ...JSON.parse(saved) };
  } catch {
    return emptyCodex();
  }
}

function saveCodex(codex) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(codex));
  } catch {
    /* storage unavailable — codex is best-effort, never blocks play */
  }
}

// ─── Intel (§20.8.4) ──────────────────────────────────────────────────────────
// Per-contract scouting knowledge. Revealed axes persist — a re-taken contract
// stays scouted (knowledge compounds; a loss becomes recon, never wasted). This
// never touches the roster and never expires.

export function loadIntel(contractId) {
  const codex = loadCodex();
  return codex.intel?.[contractId] ?? {};
}

// Mark one axis (composition | behavior | threat) revealed for a contract.
// Returns the updated per-contract intel map.
export function revealIntelAxis(contractId, axis, now = Date.now()) {
  const codex = loadCodex();
  if (!codex.intel) codex.intel = {};
  const forContract = { ...(codex.intel[contractId] ?? {}) };
  forContract[axis] = { revealed: true, at: now };
  codex.intel[contractId] = forContract;
  saveCodex(codex);
  return forContract;
}

// Extract the synergies that actually fired for the player's squad this battle.
// "Synergy" here = a gear/module/engine interaction that procced (the closest
// proxy until artifacts are wired into combat). Returns a de-duplicated list of
// { key, label, unitName, source }.
export function extractFiredSynergies(result) {
  if (!result) return [];
  const out = new Map();

  for (const p of result.gearProcs ?? []) {
    const key = `gear:${p.gearId ?? p.callout}`;
    if (!out.has(key)) {
      out.set(key, { key, label: p.callout, unitName: p.unitName, source: 'gear' });
    }
  }

  // Module procs, echoes and resonance live in the per-round battle log.
  for (const round of result.battleLog ?? []) {
    for (const e of round.events ?? []) {
      if (e.actorSquad !== 'A') continue;
      if (e.type === 'module_proc') {
        const key = `module:${e.moduleId ?? e.callout}`;
        if (!out.has(key)) out.set(key, { key, label: e.callout, unitName: e.actorName, source: 'module' });
      } else if (e.type === 'resonance') {
        const key = 'engine:resonance';
        if (!out.has(key)) out.set(key, { key, label: 'RESONANCE', unitName: e.actorName, source: 'engine' });
      } else if (e.type === 'echo') {
        const key = 'engine:echo';
        if (!out.has(key)) out.set(key, { key, label: 'ECHO', unitName: e.actorName, source: 'engine' });
      }
    }
  }

  return [...out.values()];
}

// Record the outcome of a won contract: unlock its artifact, bank reputation,
// and log every synergy that fired. Idempotent-ish — re-winning just bumps
// counts and refreshes timestamps; it never removes anything. Returns the
// new-this-win artifact + synergy keys so the payout screen can highlight them.
export function recordContractWin(contract, firedSynergies, { repAmount } = {}, now = Date.now()) {
  const codex = loadCodex();

  // ── Artifact unlock (access only) ──
  let newArtifact = null;
  const artifactId = contract.payout?.artifactId;
  if (artifactId) {
    const already = codex.artifacts[artifactId]?.unlocked;
    codex.artifacts[artifactId] = {
      unlocked: true,
      unlockedAt: codex.artifacts[artifactId]?.unlockedAt ?? now,
      contractId: contract.id,
    };
    if (!already) newArtifact = artifactId;
  }

  // ── Reputation (amount set by the §20.8.4 risk dial; falls back to the floor) ──
  const rep = contract.payout?.reputation;
  if (rep?.faction) {
    const gain = repAmount ?? rep.amount ?? 0;
    codex.reputation[rep.faction] = (codex.reputation[rep.faction] ?? 0) + gain;
  }

  // ── Synergies discovered ──
  const newSynergies = [];
  for (const s of firedSynergies) {
    const existing = codex.synergies[s.key];
    if (!existing) newSynergies.push(s.key);
    codex.synergies[s.key] = {
      label: s.label,
      source: s.source,
      count: (existing?.count ?? 0) + 1,
      firstSeenContract: existing?.firstSeenContract ?? contract.id,
      lastSeenAt: now,
    };
  }

  saveCodex(codex);
  return { codex, newArtifact, newSynergies };
}
