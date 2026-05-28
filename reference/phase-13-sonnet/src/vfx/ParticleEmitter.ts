/**
 * ParticleEmitter.ts
 * Wraps Phaser 3's particle system with 8gents-specific behavior.
 * One emitter instance per creature; reused across ability fires.
 *
 * Usage:
 *   const emitter = new CreatureParticleEmitter(scene, x, y, vfxProfile);
 *   emitter.fire();              // primary burst (call on ACTIVE frame)
 *   emitter.fireSecondary();     // lingering after-effect (call on RECOVERY start)
 *   emitter.destroy();           // cleanup on scene teardown
 */

import Phaser from 'phaser';
import type { ParticleConfig, VFXProfile } from './VFXData';

/** Texture key for a minimal 4px circle particle (generated programmatically) */
const PARTICLE_TEXTURE_KEY = 'vfx_particle_dot';

/**
 * Generates a simple circle texture in the Phaser cache if not already present.
 * Avoids needing an external asset for particles.
 */
export function ensureParticleTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(PARTICLE_TEXTURE_KEY)) return;

  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture(PARTICLE_TEXTURE_KEY, 8, 8);
  g.destroy();
}

/** Converts a ParticleConfig into Phaser.Types.GameObjects.Particles.ParticleEmitterConfig */
function toPhaser(cfg: ParticleConfig, ox: number, oy: number): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
  return {
    x: ox,
    y: oy,
    quantity: cfg.count,
    speed: cfg.speed,
    angle: cfg.angle,
    lifespan: cfg.lifespan,
    scale: cfg.scale,
    alpha: cfg.alpha,
    gravityY: cfg.gravityY,
    tints: cfg.tints,
    blendMode: cfg.blendMode === 'ADD'
      ? Phaser.BlendModes.ADD
      : Phaser.BlendModes.NORMAL,
    frequency: -1,   // manual fire mode (explode on demand)
    emitting: false,
  };
}

export class CreatureParticleEmitter {
  private scene: Phaser.Scene;
  private profile: VFXProfile;
  private primaryEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private secondaryEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;

  /** World-space emission origin */
  private originX: number;
  private originY: number;

  constructor(
    scene: Phaser.Scene,
    originX: number,
    originY: number,
    profile: VFXProfile
  ) {
    this.scene = scene;
    this.profile = profile;
    this.originX = originX + profile.emitOffset[0];
    this.originY = originY + profile.emitOffset[1];

    ensureParticleTexture(scene);
    this.buildEmitters();
  }

  private buildEmitters(): void {
    // Primary emitter
    this.primaryEmitter = this.scene.add.particles(
      this.originX,
      this.originY,
      PARTICLE_TEXTURE_KEY,
      toPhaser(this.profile.primary, 0, 0)
    );
    this.primaryEmitter.setDepth(20);

    // Secondary emitter (optional)
    if (this.profile.secondary) {
      this.secondaryEmitter = this.scene.add.particles(
        this.originX,
        this.originY,
        PARTICLE_TEXTURE_KEY,
        toPhaser(this.profile.secondary, 0, 0)
      );
      this.secondaryEmitter.setDepth(19);
    }
  }

  /**
   * Fires the primary particle burst.
   * Must be called on the exact ACTIVE fire-point frame.
   */
  fire(): void {
    this.primaryEmitter.explode(this.profile.primary.count);
  }

  /**
   * Fires the secondary (lingering) effect.
   * Called at the start of RECOVERY when secondaryOnRecovery is true.
   */
  fireSecondary(): void {
    if (this.secondaryEmitter && this.profile.secondary) {
      this.secondaryEmitter.explode(this.profile.secondary.count);
    }
  }

  /**
   * Moves the emission origin (e.g., if the creature sprite moves).
   */
  setOrigin(x: number, y: number): void {
    this.originX = x + this.profile.emitOffset[0];
    this.originY = y + this.profile.emitOffset[1];
    this.primaryEmitter.setPosition(this.originX, this.originY);
    this.secondaryEmitter?.setPosition(this.originX, this.originY);
  }

  /**
   * Destroys both emitters. Call during scene shutdown.
   */
  destroy(): void {
    this.primaryEmitter.destroy();
    this.secondaryEmitter?.destroy();
  }
}
