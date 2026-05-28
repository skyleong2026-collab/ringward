/**
 * AudioManager.ts
 * SFX playback controller for 8gents.
 *
 * Responsibilities:
 *  - Plays ability SFX at the exact ACTIVE fire-point frame (frame-perfect sync)
 *  - Manages hit-received sounds on targeted creature when damage resolves
 *  - Plays idle ambient loops during IDLE animation state
 *  - Plays death sound when HP drops to 0
 *  - Logs every audio event to TelemetryLogger with frame number
 *  - Prevents audio stacking (debounce guard same as VFXManager)
 *
 * Architecture position:
 *   VFXManager.onAbilityFired(...)
 *     ↓  same frame
 *   AudioManager.onAbilityFired(creatureId, frame)    ← fires ability SFX
 *   AudioManager.onHitReceived(targetId, frame)       ← fires hit SFX on target
 *   AudioManager.onCreatureDied(creatureId, frame)    ← fires death SFX
 *
 * Usage:
 *   const audio = new AudioManager(scene, telemetry);
 *   audio.preload();                              // call in Phaser preload()
 *   audio.registerCreature(creature);             // call before battle starts
 *   audio.onAbilityFired('boulder_beast', 42);    // fires ability SFX at frame 42
 *   audio.onHitReceived('crystal_guardian', 42);  // fires hit SFX at frame 42
 *   audio.startIdleAmbient('boulder_beast');       // loops ambient during idle
 *   audio.stopIdleAmbient('boulder_beast');        // stops ambient on turn start
 *   audio.onCreatureDied('boulder_beast', 120);    // fires death sound
 *   audio.destroyAll();                            // scene shutdown
 */

import Phaser from 'phaser';
import {
  AUDIO_LIBRARY,
  getAllSFXForPreload,
  getSFXProfile,
  type SFXEvent,
} from './AudioLibrary';

// ─── Interfaces matching the rest of the codebase ────────────────────────────

export interface ICreatureRef {
  id: string;
  name: string;
}

export interface ITelemetryLogger {
  logAudio(creatureId: string, sfxKey: string, frame: number): void;
}

// ─── Active sound tracking ────────────────────────────────────────────────────

interface ActiveAmbient {
  sound: Phaser.Sound.BaseSound;
  creatureId: string;
}

// ─── AudioManager ─────────────────────────────────────────────────────────────

export class AudioManager {
  private scene: Phaser.Scene;
  private telemetry: ITelemetryLogger;
  private registeredCreatures: Set<string> = new Set();
  private ambients: Map<string, ActiveAmbient> = new Map();

  /** Frame guard against double-fire */
  private lastFireFrame: Map<string, number> = new Map();
  private readonly MIN_FRAME_GAP = 3;

  /** Master SFX volume (0..1) */
  private masterVolume = 0.8;
  /** Whether audio is globally muted */
  private muted = false;

  constructor(scene: Phaser.Scene, telemetry: ITelemetryLogger) {
    this.scene = scene;
    this.telemetry = telemetry;
  }

  // ─── Phaser lifecycle ────────────────────────────────────────────────────

  /**
   * Registers all SFX with Phaser's loader.
   * Call inside the Phaser Scene preload() method BEFORE create().
   */
  preload(): void {
    const entries = getAllSFXForPreload();
    for (const entry of entries) {
      if (!this.scene.cache.audio.has(entry.key)) {
        this.scene.load.audio(entry.key, [entry.path, entry.pathMp3]);
      }
    }
  }

  // ─── Registration ────────────────────────────────────────────────────────

  /**
   * Registers a creature for audio management.
   * Validates that its profile exists in AudioLibrary.
   */
  registerCreature(creature: ICreatureRef): void {
    const profile = getSFXProfile(creature.id);
    if (!profile) {
      console.warn(`[AudioManager] No SFX profile for creature: ${creature.id}`);
      return;
    }
    this.registeredCreatures.add(creature.id);
    this.lastFireFrame.set(creature.id, -999);
  }

  // ─── Event handlers ──────────────────────────────────────────────────────

  /**
   * Fires the ability SFX for an attacker.
   * Must be called at the exact ACTIVE fire-point frame.
   */
  onAbilityFired(creatureId: string, frame: number): void {
    this.playCreatureSFX(creatureId, 'ability_fire', frame);
  }

  /**
   * Fires the hit-received SFX on a target creature.
   * Called same frame as damage resolution.
   */
  onHitReceived(targetCreatureId: string, frame: number): void {
    this.playCreatureSFX(targetCreatureId, 'hit_received', frame);
  }

  /**
   * Fires the death sound for a creature whose HP reached 0.
   */
  onCreatureDied(creatureId: string, frame: number): void {
    // Stop ambient first
    this.stopIdleAmbient(creatureId);
    this.playCreatureSFX(creatureId, 'death', frame, true); // bypass debounce for death
  }

  // ─── Ambient management ──────────────────────────────────────────────────

  /**
   * Starts an idle ambient loop for a creature.
   * Should fire when animation enters IDLE state.
   */
  startIdleAmbient(creatureId: string): void {
    if (this.muted) return;
    if (this.ambients.has(creatureId)) return; // already playing

    const profile = getSFXProfile(creatureId);
    if (!profile) return;

    const entry = profile.sfx.idle_ambient;
    const sound = this.scene.sound.add(entry.key, {
      volume: entry.volume * this.masterVolume,
      rate:   entry.rate,
      loop:   true,
    });
    sound.play();
    this.ambients.set(creatureId, { sound, creatureId });
  }

  /**
   * Stops the idle ambient loop for a creature.
   * Should fire when a creature's turn begins (ANTICIPATION start).
   */
  stopIdleAmbient(creatureId: string): void {
    const ambient = this.ambients.get(creatureId);
    if (ambient) {
      ambient.sound.stop();
      ambient.sound.destroy();
      this.ambients.delete(creatureId);
    }
  }

  // ─── Volume controls ─────────────────────────────────────────────────────

  setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  mute(): void {
    this.muted = true;
    this.scene.sound.mute = true;
  }

  unmute(): void {
    this.muted = false;
    this.scene.sound.mute = false;
  }

  // ─── Teardown ────────────────────────────────────────────────────────────

  /**
   * Stops all ambient loops and clears state.
   * Call during Phaser scene shutdown().
   */
  destroyAll(): void {
    for (const [id] of this.ambients) {
      this.stopIdleAmbient(id);
    }
    this.registeredCreatures.clear();
    this.lastFireFrame.clear();
  }

  // ─── Internal helpers ────────────────────────────────────────────────────

  private playCreatureSFX(
    creatureId: string,
    event: SFXEvent,
    frame: number,
    bypassDebounce = false
  ): void {
    if (this.muted) return;
    if (!this.registeredCreatures.has(creatureId)) return;

    const last = this.lastFireFrame.get(creatureId) ?? -999;
    if (!bypassDebounce && frame - last < this.MIN_FRAME_GAP) return;

    const profile = getSFXProfile(creatureId);
    if (!profile) return;

    const entry = profile.sfx[event];
    if (!this.scene.cache.audio.has(entry.key)) {
      console.warn(`[AudioManager] SFX not loaded: ${entry.key}`);
      return;
    }

    const sound = this.scene.sound.add(entry.key, {
      volume: entry.volume * this.masterVolume,
      rate:   entry.rate,
      loop:   entry.loop,
    });
    sound.once('complete', () => sound.destroy());
    sound.play();

    if (!entry.loop) {
      this.lastFireFrame.set(creatureId, frame);
    }

    this.telemetry.logAudio(creatureId, entry.key, frame);
  }
}
