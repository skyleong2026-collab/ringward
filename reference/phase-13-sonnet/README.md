# Phase 13 Sonnet Architecture Reference

**Status:** Reference architecture (not integrated into main build)  
**Created:** 2026-05-27  
**Purpose:** Blueprint for Phase 13 systems when React codebase reaches that maturity level

---

## What This Is

A complete, standalone implementation of Phase 13 systems using **Phaser 3 + TypeScript**:
- VFXManager with behavioral class particle patterns
- AudioManager with fire-point frame sync
- UI components (CreaturePortrait, HPBar, CombatLog) with class-specific animation
- BattleScene composing all systems into a running battle

## Why It's Here (Not in Main)

The **main branch** (React web build) is the canonical 8gents prototype. It's already at vI-A with working battle system, spawn ecology, and dungeon layer.

This Phaser code explores an alternative architecture. It's kept as **reference** because:

1. **Different tech stack** — Phaser 3 vs React. Both valid, but not compatible to merge.
2. **Architectural patterns are reusable** — frame-perfect fire-point sync, class-specific VFX/audio, behavioral animation tweens all apply regardless of tech.
3. **Native migration consideration** — the main build path is React → React Native. This Phaser code would be useful if we later pivoted to a native game engine.

## How to Use This Reference

### For Implementing Phase 13 in React

When the React codebase reaches Phase 13, refer to these files for design patterns:

**VFX System** (`src/vfx/`)
- **VFXData.ts** — Study the 5 behavioral class profiles (Pressure/Collapse/Crest/Orbit/Drift)
  - Each class has directional angles, lifespan, gravity, blend modes
  - Faction tinting happens at runtime (Light/Shadow/Wild color palettes)
  - Implement similar in Pixi.js or Three.js

- **VFXManager.ts** — Study the fire-point sync pattern
  - `onAbilityFired(creatureId, frame)` fires particles on the exact ACTIVE animation frame
  - Debounce guard prevents double-fire
  - All fires logged to telemetry with frame number

**Audio System** (`src/audio/`)
- **AudioLibrary.ts** — Study the creature SFX profile structure
  - 4 event types per creature: ability_fire, hit_received, idle_ambient, death
  - Faction pitch modulation (Light +5%, Shadow -10%, Wild baseline)

- **AudioManager.ts** — Study async/ambient management
  - Plays ability SFX at exact fire-point frame (same frame as VFX)
  - Manages idle ambient loops (start on IDLE state, stop on turn begin)
  - Master volume + mute controls

**UI Components** (`src/ui/UIComponents.ts`)
- Study class-specific HP bar tweens:
  - Pressure: Back.Out (weight drops with overshoot)
  - Collapse: Power3.In (sharp crushing inward)
  - Crest: Sine.Out (graceful rise)
  - Orbit: Cubic.InOut (smooth arc)
  - Drift: fade → shift (no gravity, drifting feel)

- Study CreaturePortrait 5-state machine (idle/anticipation/active/recovery/dead)

**BattleScene** (`src/scenes/BattleScene.ts`)
- Study the frame pipeline architecture:
  ```
  GameLoop emits frame(N)
    → AnimationPlayer.update(N)
      → on ACTIVE fire-point:
          AbilityResolver.resolve()
          VFXManager.onAbilityFired()
          AudioManager.onAbilityFired()
          TelemetryLogger.log()
  ```
- All systems fire on the same frame for perfect sync

### For Learning Phaser 3

If you ever want to explore a Phaser-based 8gents variant:
- `src/scenes/BattleScene.ts` is a fully functional Phaser scene
- `src/vfx/` uses Phaser's particle system
- `src/audio/` uses Phaser's Sound API
- `src/ui/*` are Phaser GameObjects containers

This code is production-quality and can be run directly (with appropriate assets and dependencies).

---

## File Structure

```
reference/phase-13-sonnet/
├── README.md                     ← You are here
├── PHASE_13_SONNET_HANDOFF.md   ← Detailed architecture notes
└── src/
    ├── vfx/
    │   ├── VFXData.ts            (160 lines) — Class profiles, faction tinting
    │   ├── ParticleEmitter.ts    (80 lines)  — Phaser particle wrapper
    │   └── VFXManager.ts         (110 lines) — Registry, fire-point sync
    ├── audio/
    │   ├── AudioLibrary.ts       (130 lines) — Creature SFX defs
    │   └── AudioManager.ts       (170 lines) — Playback, ambient loops
    ├── ui/
    │   └── UIComponents.ts       (380 lines) — Portrait, HPBar, CombatLog
    └── scenes/
        └── BattleScene.ts        (270 lines) — Full scene composition
```

---

## Key Design Decisions (Explained)

### Fire-Point Frame Sync
All systems (VFX, Audio, Telemetry) fire on the **exact same frame** as the ability resolves. This creates a coherent feedback loop where:
- Player sees particle effect
- Player hears SFX
- Damage number updates
- Combat log appends event
- All at the same moment (frame N)

No async/await, no Promise chains. Single frame = single atomic event.

### Class-Specific Behavior
Rather than generic "attack" animations:
- **Pressure** creatures have downward VFX (weight pushing down)
- **Collapse** creatures have inward VFX (implosion, rupture)
- **Crest** creatures have upward VFX (ascending energy)
- **Orbit** creatures have circular VFX (rotation)
- **Drift** creatures have lateral VFX (flow, float)

Same applies to HP bar tweens. Each class animates health loss differently because health loss *feels* different for each class.

### Behavioral Audio
Audio isn't just "creature A attacks" → random SFX. It's:
- Class determines base sound (Pressure deep, Crest bright, Drift wispy)
- Faction modulates pitch (Light higher register, Shadow lower, Wild baseline)
- Event type determines which of 4 SFX plays (ability vs hit vs ambient vs death)

### Zero-Asset Fallback
BattleScene gracefully degrades if sprite PNGs or audio files aren't loaded:
- Missing sprite → colored rectangle (battle still runs)
- Missing audio → silent (battle continues)
- Missing particles → skip effect (battle plays)

This allows fast iteration without needing all assets before testing gameplay.

---

## Next Steps

**For the React main build:**
- When Phase 13 approaches, refer back here for the architectural patterns
- Port the design (not the code) into Pixi.js or Three.js
- Use the same fire-point sync principle
- Apply class-specific VFX/audio/animation language

**For exploratory work:**
- If you want to test the Phaser approach, this is production-ready
- Add sprite assets in `assets/sprites/creatures/`
- Add audio in `assets/sfx/[class]/[faction]/`
- Run via `npm install phaser && npm run dev`

---

## Reference Links

- **GDD:** Phase A–I strategy (Web build), Phase J (Native migration)
- **Notion:** Phase 13 Implementation Plan + Validation Protocol
- **Main branch:** Current React vI-A build (canonical prototype)

---

**Questions?** See `PHASE_13_SONNET_HANDOFF.md` for deeper architecture notes.
