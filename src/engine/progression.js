export const XP_PER_FEED = 60;
export const MAX_LEVEL = 5;
const THRESHOLDS = [0, 100, 250, 500, 1000];

// ─── Level scaling (Phase 17) ──────────────────────────────────────────────────
// Identity-preserving growth: multiplicative so each archetype's silhouette is
// kept (a Guardian stays tanky, a Swift stays glassy). Speed is NEVER scaled —
// turn order is archetype identity.
export const LEVEL_GROWTH = 0.12; // +12% per level over L1, applied to HP + Attack
export const ARMOR_GROWTH = 0.06; // Guardians only — half rate, keeps tank identity

export function levelMultiplier(level = 1) {
  return 1 + LEVEL_GROWTH * (Math.max(1, level) - 1);
}

// Returns a shallow copy with effective combat stats for the creature's level.
// Level 1 (or missing level) is the identity function — DO NOT BREAK THIS:
// existing balance and the golden tests all assume level-1 stats are unchanged.
export function applyLevel(creature) {
  const level = creature.level ?? 1;
  if (level <= 1) return creature;
  const m = levelMultiplier(level);
  const armorM =
    creature.archetype === 'Guardian' ? 1 + ARMOR_GROWTH * (level - 1) : 1;
  return {
    ...creature,
    hp: Math.round(creature.hp * m),
    attack: Math.round(creature.attack * m),
    armor: Math.round(creature.armor * armorM),
    // speed unchanged by design
  };
}

export function getLevel(xp) {
  for (let i = THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function xpProgress(xp) {
  const level = getLevel(xp);
  if (level >= MAX_LEVEL) return { level, current: xp, needed: null, pct: 100 };
  const base = THRESHOLDS[level - 1];
  const next = THRESHOLDS[level];
  return {
    level,
    current: xp - base,
    needed: next - base,
    pct: Math.round(((xp - base) / (next - base)) * 100),
  };
}

const AURA = {
  Guardian: '#4a90d9',
  Echo:     '#7ed321',
  Swift:    '#d0021b',
  Spark:    '#f5a623',
};

export function computeVisualProfile(feedHistory) {
  if (!feedHistory.length) return { dominant: null, intensity: 0, breakdown: {} };
  const counts = {};
  for (const { archetype } of feedHistory) {
    counts[archetype] = (counts[archetype] || 0) + 1;
  }
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  // Saturates at 6 feeds — subtle at 1, strong at 6+
  const intensity = Math.min(feedHistory.length / 6, 1);
  return { dominant, intensity, breakdown: counts };
}

export function getAuraStyle(feedHistory) {
  const { dominant, intensity } = computeVisualProfile(feedHistory);
  if (!dominant || intensity === 0) return {};
  const color = AURA[dominant];
  const spread = Math.round(4 + intensity * 16);
  const borderAlpha = Math.round(intensity * 200).toString(16).padStart(2, '0');
  const glowAlpha   = Math.round(intensity * 140).toString(16).padStart(2, '0');
  return {
    boxShadow: `0 0 ${spread}px ${color}${glowAlpha}, inset 0 0 ${Math.round(spread / 2)}px ${color}22`,
    borderColor: `${color}${borderAlpha}`,
  };
}
