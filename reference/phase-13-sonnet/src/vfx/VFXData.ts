/**
 * VFXData.ts
 * Per-class VFX definitions for 8gents.
 * Each class has a directional signature matching its behavioral identity:
 *   Pressure  → downward/outward impact burst (tectonic weight)
 *   Collapse  → inward spiral then implosion (containment rupture)
 *   Crest     → upward/rising arcs (emergent vectors)
 *   Orbit     → circular rotation burst (perpetual circulation)
 *   Drift     → lateral float + wisp trails (suspended displacement)
 */

export type BehavioralClass = 'Pressure' | 'Collapse' | 'Crest' | 'Orbit' | 'Drift';
export type Faction = 'Light' | 'Shadow' | 'Wild';

export interface ParticleConfig {
  /** Number of particles per emission burst */
  count: number;
  /** Base speed in pixels/sec */
  speed: { min: number; max: number };
  /** Angle range in degrees (0 = right, 90 = up) */
  angle: { min: number; max: number };
  /** Particle lifetime in ms */
  lifespan: { min: number; max: number };
  /** Scale of particles (relative to 1.0) */
  scale: { start: number; end: number };
  /** Alpha fade */
  alpha: { start: number; end: number };
  /** Gravity override (positive = down, negative = up) */
  gravityY: number;
  /** Tint colors (hex) — drawn from faction palette */
  tints: number[];
  /** Blend mode: 'ADD' for bright, 'NORMAL' for solid */
  blendMode: 'ADD' | 'NORMAL';
  /** Particle shape */
  shape: 'circle' | 'rect' | 'spark';
}

export interface VFXProfile {
  class: BehavioralClass;
  /** Primary emission config (fires on ACTIVE frame) */
  primary: ParticleConfig;
  /** Optional secondary emission (lingering after-effect during RECOVERY) */
  secondary?: ParticleConfig;
  /** Offset from creature center in pixels [x, y] */
  emitOffset: [number, number];
  /** Whether secondary fires at RECOVERY start frame */
  secondaryOnRecovery: boolean;
}

// ─── Faction color palettes ───────────────────────────────────────────────────
const LIGHT_PALETTE  = [0xfff4b8, 0xffe082, 0xffd700, 0xffffff];
const SHADOW_PALETTE = [0x9c27b0, 0x4a148c, 0x7b1fa2, 0xe040fb];
const WILD_PALETTE   = [0x558b2f, 0x33691e, 0xa5d6a7, 0xf9a825];

// ─── Class-based VFX profiles ─────────────────────────────────────────────────

/** Pressure: tectonic downward shockwave + ground dust */
const PRESSURE_VFX: VFXProfile = {
  class: 'Pressure',
  emitOffset: [0, 20],
  secondaryOnRecovery: true,
  primary: {
    count: 28,
    speed: { min: 80, max: 240 },
    angle: { min: 200, max: 340 },  // downward fan
    lifespan: { min: 300, max: 600 },
    scale: { start: 0.9, end: 0.1 },
    alpha: { start: 1.0, end: 0.0 },
    gravityY: 180,
    tints: [0xd4a017, 0x8b6914, 0xfff3cd],
    blendMode: 'NORMAL',
    shape: 'rect',
  },
  secondary: {
    count: 14,
    speed: { min: 20, max: 60 },
    angle: { min: 160, max: 380 },  // scatter low
    lifespan: { min: 500, max: 900 },
    scale: { start: 0.5, end: 0.0 },
    alpha: { start: 0.6, end: 0.0 },
    gravityY: 60,
    tints: [0xa0522d, 0x8b4513, 0xd2b48c],
    blendMode: 'NORMAL',
    shape: 'circle',
  },
};

/** Collapse: inward implosion spiral */
const COLLAPSE_VFX: VFXProfile = {
  class: 'Collapse',
  emitOffset: [0, 0],
  secondaryOnRecovery: false,
  primary: {
    count: 32,
    speed: { min: 60, max: 200 },
    angle: { min: 0, max: 360 },    // all directions, gravity pulls inward via negative
    lifespan: { min: 200, max: 500 },
    scale: { start: 0.8, end: 0.05 },
    alpha: { start: 1.0, end: 0.0 },
    gravityY: -40,                   // slight upward pull for implosion feel
    tints: [0x6a0dad, 0x4b0082, 0xe0b0ff],
    blendMode: 'ADD',
    shape: 'spark',
  },
  secondary: {
    count: 8,
    speed: { min: 10, max: 30 },
    angle: { min: 80, max: 100 },
    lifespan: { min: 400, max: 700 },
    scale: { start: 1.2, end: 0.0 },
    alpha: { start: 0.5, end: 0.0 },
    gravityY: -20,
    tints: [0x9b59b6, 0x8e44ad],
    blendMode: 'ADD',
    shape: 'circle',
  },
};

/** Crest: upward rising arcs, ascending vectors */
const CREST_VFX: VFXProfile = {
  class: 'Crest',
  emitOffset: [0, -10],
  secondaryOnRecovery: true,
  primary: {
    count: 24,
    speed: { min: 100, max: 280 },
    angle: { min: 240, max: 300 },  // upward arc (270 = straight up ± 30°)
    lifespan: { min: 400, max: 800 },
    scale: { start: 0.6, end: 0.0 },
    alpha: { start: 1.0, end: 0.0 },
    gravityY: -60,                   // floats upward
    tints: [0xffd700, 0xfff8dc, 0x87ceeb],
    blendMode: 'ADD',
    shape: 'spark',
  },
  secondary: {
    count: 10,
    speed: { min: 20, max: 70 },
    angle: { min: 250, max: 290 },
    lifespan: { min: 600, max: 1000 },
    scale: { start: 0.4, end: 0.0 },
    alpha: { start: 0.7, end: 0.0 },
    gravityY: -30,
    tints: [0xffd700, 0xfff8dc],
    blendMode: 'ADD',
    shape: 'circle',
  },
};

/** Orbit: circular rotational burst */
const ORBIT_VFX: VFXProfile = {
  class: 'Orbit',
  emitOffset: [0, 0],
  secondaryOnRecovery: true,
  primary: {
    count: 20,
    speed: { min: 120, max: 220 },
    angle: { min: 0, max: 360 },    // full circle
    lifespan: { min: 350, max: 700 },
    scale: { start: 0.5, end: 0.0 },
    alpha: { start: 1.0, end: 0.0 },
    gravityY: 0,                     // weightless orbit
    tints: [0xffe082, 0xffffff, 0xffd700],
    blendMode: 'ADD',
    shape: 'circle',
  },
  secondary: {
    count: 12,
    speed: { min: 30, max: 80 },
    angle: { min: 0, max: 360 },
    lifespan: { min: 500, max: 900 },
    scale: { start: 0.3, end: 0.0 },
    alpha: { start: 0.5, end: 0.0 },
    gravityY: 0,
    tints: [0xffd700, 0xffeb3b],
    blendMode: 'ADD',
    shape: 'spark',
  },
};

/** Drift: lateral float with wisp trails */
const DRIFT_VFX: VFXProfile = {
  class: 'Drift',
  emitOffset: [10, -5],
  secondaryOnRecovery: true,
  primary: {
    count: 18,
    speed: { min: 40, max: 120 },
    angle: { min: 340, max: 380 },  // lateral + slight up
    lifespan: { min: 500, max: 1000 },
    scale: { start: 0.7, end: 0.0 },
    alpha: { start: 0.8, end: 0.0 },
    gravityY: -15,                   // gentle float
    tints: [0x80deea, 0xb2ebf2, 0xe0f7fa],
    blendMode: 'ADD',
    shape: 'circle',
  },
  secondary: {
    count: 8,
    speed: { min: 15, max: 40 },
    angle: { min: 320, max: 400 },
    lifespan: { min: 700, max: 1200 },
    scale: { start: 0.4, end: 0.0 },
    alpha: { start: 0.5, end: 0.0 },
    gravityY: -10,
    tints: [0x4dd0e1, 0x80deea],
    blendMode: 'ADD',
    shape: 'spark',
  },
};

/**
 * VFX_PROFILES maps behavioral class → base VFX profile.
 * Faction modulates tint at runtime via applyFactionTint().
 */
export const VFX_PROFILES: Record<BehavioralClass, VFXProfile> = {
  Pressure: PRESSURE_VFX,
  Collapse: COLLAPSE_VFX,
  Crest:    CREST_VFX,
  Orbit:    ORBIT_VFX,
  Drift:    DRIFT_VFX,
};

/**
 * Returns a tinted copy of a VFXProfile adjusted for the creature's faction.
 * Light  → brighter, more saturated additive blend
 * Shadow → deeper, void-touched purples
 * Wild   → organic greens and earthy warm tones
 */
export function applyFactionTint(profile: VFXProfile, faction: Faction): VFXProfile {
  const tintMap: Record<Faction, { primary: number[]; secondary: number[] }> = {
    Light: {
      primary:   [...LIGHT_PALETTE],
      secondary: [0xffffff, 0xfff9c4],
    },
    Shadow: {
      primary:   [...SHADOW_PALETTE],
      secondary: [0x7b1fa2, 0xce93d8],
    },
    Wild: {
      primary:   [...WILD_PALETTE],
      secondary: [0x558b2f, 0xdce775],
    },
  };

  const tints = tintMap[faction];
  return {
    ...profile,
    primary: { ...profile.primary, tints: tints.primary },
    secondary: profile.secondary
      ? { ...profile.secondary, tints: tints.secondary }
      : undefined,
  };
}
