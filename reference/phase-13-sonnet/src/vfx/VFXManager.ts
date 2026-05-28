/**
 * VFXManager.ts
 * Central controller for all particle VFX in 8gents.
 *
 * Responsibilities:
 *  - Maintains one ParticleEmitter per active creature
 *  - Fires effects on ACTIVE frame (primary burst) and RECOVERY start (secondary)
 *  - All fire calls are synchronized to the GameLoop frame counter
 *  - Logs every emission to TelemetryLogger with frame number
 *
 * Architecture position:
 *   AbilityResolver (damage resolved)
 *     ↓  same frame
 *   VFXManager.onAbilityFired(creatureId, frame)
 *     ↓  same frame
 *   AudioManager.onAbilityFired(creatureId, frame)
 *     ↓  same frame
 *   TelemetryLogger.logVFX(...)
 *
 * Usage:
 *   const vfxManager = new VFXManager(scene, telemetryLogger);
 *   vfxManager.register(creature, spriteX, spriteY);
 *   // In ability resolver callback:
 *   vfxManager.onAbilityFired(creature.id, frameNumber);
 *   // In animation state machine RECOVERY callback:
 *   vfxManager.onRecoveryStart(creature.id, frameNumber);
 */

import Phaser from 'phaser';
import { CreatureParticleEmitter } from './ParticleEmitter';
import {
  VFX_PROFILES,
  applyFactionTint,
  type BehavioralClass,
  type Faction,
  type VFXProfile,
} from './VFXData';

// ─── Minimal interfaces matching the rest of the codebase ─────────────────────

export interface ICreatureRef {
  id: string;
  name: string;
  behavioralClass: BehavioralClass;
  faction: Faction;
}

export interface ITelemetryLogger {
  logVFX(creatureId: string, effect: string, frame: number): void;
}

// ─── Registry entry ───────────────────────────────────────────────────────────

interface EmitterEntry {
  creature: ICreatureRef;
  emitter: CreatureParticleEmitter;
  profile: VFXProfile;
  lastFiredFrame: number;
}

// ─── VFXManager ───────────────────────────────────────────────────────────────

export class VFXManager {
  private scene: Phaser.Scene;
  private telemetry: ITelemetryLogger;
  private registry: Map<string, EmitterEntry> = new Map();

  /**
   * Frame guard: prevents double-firing if the same creature fires twice
   * in the same frame (shouldn't happen but guarded defensively).
   */
  private readonly MIN_FRAME_GAP = 3;

  constructor(scene: Phaser.Scene, telemetry: ITelemetryLogger) {
    this.scene = scene;
    this.telemetry = telemetry;
  }

  /**
   * Registers a creature and creates its ParticleEmitter.
   * Must be called before battle begins for every participating creature.
   *
   * @param creature  Creature reference (id, class, faction)
   * @param spriteX   World-space X origin of creature sprite center
   * @param spriteY   World-space Y origin of creature sprite center
   */
  register(creature: ICreatureRef, spriteX: number, spriteY: number): void {
    if (this.registry.has(creature.id)) {
      this.unregister(creature.id);
    }

    const baseProfile = VFX_PROFILES[creature.behavioralClass];
    if (!baseProfile) {
      console.warn(`[VFXManager] No profile for class: ${creature.behavioralClass}`);
      return;
    }

    const profile = applyFactionTint(baseProfile, creature.faction);
    const emitter = new CreatureParticleEmitter(this.scene, spriteX, spriteY, profile);

    this.registry.set(creature.id, {
      creature,
      emitter,
      profile,
      lastFiredFrame: -999,
    });
  }

  /**
   * Called by AbilityResolver when an ability fires (on ACTIVE fire-point frame).
   * Emits the primary particle burst and logs to telemetry.
   */
  onAbilityFired(creatureId: string, frame: number): void {
    const entry = this.registry.get(creatureId);
    if (!entry) return;

    if (frame - entry.lastFiredFrame < this.MIN_FRAME_GAP) {
      // Debounce: avoid double-fire on same frame
      return;
    }

    entry.lastFiredFrame = frame;
    entry.emitter.fire();

    this.telemetry.logVFX(
      creatureId,
      `${entry.creature.behavioralClass}_primary_burst`,
      frame
    );
  }

  /**
   * Called by AnimationStateMachine when RECOVERY state begins.
   * Fires the secondary (lingering) effect if the profile defines one.
   */
  onRecoveryStart(creatureId: string, frame: number): void {
    const entry = this.registry.get(creatureId);
    if (!entry || !entry.profile.secondaryOnRecovery) return;

    entry.emitter.fireSecondary();

    this.telemetry.logVFX(
      creatureId,
      `${entry.creature.behavioralClass}_recovery_linger`,
      frame
    );
  }

  /**
   * Updates the sprite origin for a creature (e.g., if the sprite moves during animation).
   */
  updateOrigin(creatureId: string, x: number, y: number): void {
    this.registry.get(creatureId)?.emitter.setOrigin(x, y);
  }

  /**
   * Removes and destroys a creature's emitter.
   */
  unregister(creatureId: string): void {
    const entry = this.registry.get(creatureId);
    if (entry) {
      entry.emitter.destroy();
      this.registry.delete(creatureId);
    }
  }

  /**
   * Destroys all emitters. Call on scene shutdown.
   */
  destroyAll(): void {
    for (const [id] of this.registry) {
      this.unregister(id);
    }
  }

  /**
   * Returns the number of registered creatures (debug).
   */
  get registeredCount(): number {
    return this.registry.size;
  }
}
