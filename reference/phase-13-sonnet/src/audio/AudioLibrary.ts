/**
 * AudioLibrary.ts
 * Per-creature and per-class SFX definitions for 8gents.
 *
 * Sound design philosophy (from §9 Companion Voice + combat doctrine):
 *   Pressure  → deep, low-frequency impact (tectonic weight felt before heard)
 *   Collapse  → implosion crack + void resonance (inward rupture, not outward explosion)
 *   Crest     → bright ascending tone + shimmer (upward emergence, crystalline)
 *   Orbit     → harmonic ring/chime loop (circular, endless, perpetual)
 *   Drift     → soft whoosh + water wisp (motion without force)
 *
 * Faction modifies the SFX layer:
 *   Light  → higher register, brighter harmonics
 *   Shadow → lower register, reverb heavy, hollow
 *   Wild   → organic, earthy, wet/natural textures
 *
 * Asset filenames reference: assets/sfx/[class]/[faction]/[event].webm
 * (WebM preferred for browser; mp3 fallback included)
 */

export type BehavioralClass = 'Pressure' | 'Collapse' | 'Crest' | 'Orbit' | 'Drift';
export type Faction = 'Light' | 'Shadow' | 'Wild';
export type SFXEvent = 'ability_fire' | 'hit_received' | 'idle_ambient' | 'death';

export interface SFXEntry {
  /** Phaser audio key (registered in preload) */
  key: string;
  /** Relative path under assets/sfx/ */
  path: string;
  /** Fallback mp3 path */
  pathMp3: string;
  /** Volume 0..1 */
  volume: number;
  /** Playback rate 0.5..2.0 (1.0 = normal) */
  rate: number;
  /** Whether to loop (only for ambient/idle sounds) */
  loop: boolean;
}

export interface CreatureSFXProfile {
  creatureId: string;
  creatureName: string;
  behavioralClass: BehavioralClass;
  faction: Faction;
  sfx: Record<SFXEvent, SFXEntry>;
}

// ─── SFX key generator ────────────────────────────────────────────────────────

function sfxKey(cls: string, faction: string, event: string): string {
  return `sfx_${cls.toLowerCase()}_${faction.toLowerCase()}_${event}`;
}

function sfxPath(cls: string, faction: string, event: string, ext = 'webm'): string {
  return `assets/sfx/${cls.toLowerCase()}/${faction.toLowerCase()}/${event}.${ext}`;
}

// ─── Class + Faction base volumes ─────────────────────────────────────────────
// Pressure hits harder in the mix; Drift is subtle
const CLASS_VOLUMES: Record<BehavioralClass, number> = {
  Pressure: 0.9,
  Collapse: 0.75,
  Crest:    0.7,
  Orbit:    0.65,
  Drift:    0.55,
};

// Faction pitch shift (applied as rate multiplier offset)
const FACTION_RATE_MOD: Record<Faction, number> = {
  Light:  1.05,  // slightly brighter
  Shadow: 0.90,  // darker, lower
  Wild:   1.00,  // natural baseline
};

// ─── Per-creature SFX profiles ────────────────────────────────────────────────

function buildProfile(
  creatureId: string,
  creatureName: string,
  cls: BehavioralClass,
  faction: Faction
): CreatureSFXProfile {
  const vol   = CLASS_VOLUMES[cls];
  const rate  = FACTION_RATE_MOD[faction];

  return {
    creatureId,
    creatureName,
    behavioralClass: cls,
    faction,
    sfx: {
      ability_fire: {
        key:     sfxKey(cls, faction, 'ability_fire'),
        path:    sfxPath(cls, faction, 'ability_fire'),
        pathMp3: sfxPath(cls, faction, 'ability_fire', 'mp3'),
        volume:  vol,
        rate:    rate,
        loop:    false,
      },
      hit_received: {
        key:     sfxKey(cls, faction, 'hit_received'),
        path:    sfxPath(cls, faction, 'hit_received'),
        pathMp3: sfxPath(cls, faction, 'hit_received', 'mp3'),
        volume:  vol * 0.8,
        rate:    rate * 0.95,
        loop:    false,
      },
      idle_ambient: {
        key:     sfxKey(cls, faction, 'idle_ambient'),
        path:    sfxPath(cls, faction, 'idle_ambient'),
        pathMp3: sfxPath(cls, faction, 'idle_ambient', 'mp3'),
        volume:  0.2,
        rate:    rate,
        loop:    true,
      },
      death: {
        key:     sfxKey(cls, faction, 'death'),
        path:    sfxPath(cls, faction, 'death'),
        pathMp3: sfxPath(cls, faction, 'death', 'mp3'),
        volume:  vol * 1.1,
        rate:    rate * 0.85,
        loop:    false,
      },
    },
  };
}

/** Full audio library indexed by creature ID */
export const AUDIO_LIBRARY: Record<string, CreatureSFXProfile> = {
  // ── Light faction ────────────────────────────────────────────────────────
  crystal_guardian:  buildProfile('crystal_guardian',  'Crystal Guardian',  'Pressure', 'Light'),
  radiant_striker:   buildProfile('radiant_striker',   'Radiant Striker',   'Crest',    'Light'),
  sacred_spire:      buildProfile('sacred_spire',      'Sacred Spire',      'Crest',    'Light'),
  luminous_orbit:    buildProfile('luminous_orbit',    'Luminous Orbit',    'Orbit',    'Light'),
  geometric_spiral:  buildProfile('geometric_spiral',  'Geometric Spiral',  'Collapse', 'Light'),

  // ── Shadow faction ───────────────────────────────────────────────────────
  fractured_sentinel: buildProfile('fractured_sentinel', 'Fractured Sentinel', 'Pressure', 'Shadow'),
  driftstone_anchor:  buildProfile('driftstone_anchor',  'Driftstone Anchor',  'Drift',    'Shadow'),
  cracked_void:       buildProfile('cracked_void',       'Cracked Void',       'Collapse', 'Shadow'),
  fractured_leech:    buildProfile('fractured_leech',    'Fractured Leech',    'Pressure', 'Shadow'),
  void_reaper:        buildProfile('void_reaper',        'Void Reaper',        'Drift',    'Shadow'),

  // ── Wild faction ─────────────────────────────────────────────────────────
  muscle_glide:    buildProfile('muscle_glide',    'Muscle Glide',    'Orbit',    'Wild'),
  boulder_beast:   buildProfile('boulder_beast',   'Boulder Beast',   'Pressure', 'Wild'),
  rooted_coil:     buildProfile('rooted_coil',     'Rooted Coil',     'Collapse', 'Wild'),
  burden_crawler:  buildProfile('burden_crawler',  'Burden Crawler',  'Pressure', 'Wild'),
  charging_apex:   buildProfile('charging_apex',   'Charging Apex',   'Crest',    'Wild'),
};

/**
 * Returns all unique SFX entries in the library for Phaser preloading.
 * De-duplicates by class+faction since multiple creatures share base sounds.
 */
export function getAllSFXForPreload(): SFXEntry[] {
  const seen = new Set<string>();
  const entries: SFXEntry[] = [];

  for (const profile of Object.values(AUDIO_LIBRARY)) {
    for (const entry of Object.values(profile.sfx)) {
      if (!seen.has(entry.key)) {
        seen.add(entry.key);
        entries.push(entry);
      }
    }
  }

  return entries;
}

/**
 * Lookup helper used by AudioManager.
 */
export function getSFXProfile(creatureId: string): CreatureSFXProfile | undefined {
  return AUDIO_LIBRARY[creatureId];
}
