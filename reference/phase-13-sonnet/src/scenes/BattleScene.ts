/**
 * BattleScene.ts
 * Main Phaser scene for 8gents battle.
 *
 * Composes all Phase 13 systems into a running battle:
 *   - GameLoop     → frame counter heartbeat
 *   - BattleManager → speed check, turn order, round loop
 *   - AnimationStateMachine → creature state transitions
 *   - AbilityResolver → damage calculation
 *   - VFXManager   → particle effects (fire-point synced)
 *   - AudioManager → SFX playback (fire-point synced)
 *   - TelemetryLogger → frame-precise event log
 *   - UI: CreaturePortrait, HPBar, CombatLog
 *
 * Frame pipeline (single frame N):
 *   GameLoop emits frame(N)
 *     → AnimationPlayer.update(N)   — advances all animation state machines
 *       → on ACTIVE fire-point:
 *         → AbilityResolver.resolve()  — damage calc
 *         → VFXManager.onAbilityFired()   — primary burst
 *         → AudioManager.onAbilityFired() — ability SFX
 *         → AudioManager.onHitReceived()  — hit SFX on target
 *         → TelemetryLogger.log()         — event recorded
 *       → on RECOVERY start:
 *         → VFXManager.onRecoveryStart()  — linger effect
 *         → Portrait.setState('recovery')
 *       → on IDLE return:
 *         → Portrait.setState('idle')
 *         → AudioManager.startIdleAmbient()
 *     → BattleManager.checkWinCondition() — victory check
 */

import Phaser from 'phaser';
import { VFXManager }   from '../vfx/VFXManager';
import { AudioManager } from '../audio/AudioManager';
import {
  CreaturePortrait,
  HPBar,
  CombatLog,
  type HpBarClass,
} from './UIComponents';

// ─── Minimal interfaces (match existing Haiku-built types) ───────────────────

export interface ICreature {
  id:              string;
  name:            string;
  behavioralClass: 'Pressure' | 'Collapse' | 'Crest' | 'Orbit' | 'Drift';
  faction:         'Light' | 'Shadow' | 'Wild';
  rarity:          'Common' | 'Rare' | 'Elite' | 'Legendary';
  baseStats: {
    hp:     number;
    attack: number;
    armor:  number;
    speed:  number;
  };
}

export interface IAbilityResolverResult {
  attackerId: string;
  targetId:   string;
  abilityName: string;
  damageDealt: number;
  targetHPAfter: number;
  targetDied: boolean;
  frame: number;
}

export interface IBattleManager {
  speedCheck(creatures: ICreature[]): ICreature[];
  checkWinCondition(playerHP: number, enemyHP: number): 'player' | 'enemy' | null;
}

export interface IAbilityResolver {
  resolve(attacker: ICreature, target: ICreature, frame: number): IAbilityResolverResult;
}

export interface IAnimationPlayer {
  registerCreature(creature: ICreature, sprite: Phaser.GameObjects.Image): void;
  update(frame: number): void;
  onFirePoint(cb: (creatureId: string, frame: number) => void): void;
  onStateChange(cb: (creatureId: string, state: string, frame: number) => void): void;
  triggerAttack(creatureId: string): void;
}

export interface IGameLoop {
  start(): void;
  stop(): void;
  on(event: 'frame', cb: (frame: number, delta: number, elapsed: number) => void): void;
  getFrame(): number;
}

export interface ITelemetryLogger {
  logAbility(result: IAbilityResolverResult): void;
  logVFX(creatureId: string, effect: string, frame: number): void;
  logAudio(creatureId: string, sfxKey: string, frame: number): void;
  logAnimationState(creatureId: string, state: string, frame: number): void;
  export(): unknown;
}

// ─── Scene config ─────────────────────────────────────────────────────────────

export interface BattleSceneConfig {
  playerCreature: ICreature;
  enemyCreature:  ICreature;
  battleManager:  IBattleManager;
  abilityResolver: IAbilityResolver;
  animationPlayer: IAnimationPlayer;
  gameLoop:        IGameLoop;
  telemetry:       ITelemetryLogger;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const W = 390;   // canvas width (mobile-friendly)
const H = 640;   // canvas height

const PLAYER_SPRITE_X = 100;
const PLAYER_SPRITE_Y = 320;
const ENEMY_SPRITE_X  = 290;
const ENEMY_SPRITE_Y  = 320;

// ─── BattleScene ─────────────────────────────────────────────────────────────

export class BattleScene extends Phaser.Scene {
  private cfg!: BattleSceneConfig;

  // Systems
  private vfxManager!:   VFXManager;
  private audioManager!: AudioManager;

  // UI
  private playerPortrait!: CreaturePortrait;
  private enemyPortrait!:  CreaturePortrait;
  private playerHPBar!:    HPBar;
  private enemyHPBar!:     HPBar;
  private combatLog!:      CombatLog;

  // Battle state
  private playerHP!: number;
  private enemyHP!:  number;
  private turnQueue!: ICreature[];
  private currentTurnIdx = 0;
  private round = 1;
  private battleOver = false;

  // Sprites (placeholders until real art loads)
  private playerSprite!: Phaser.GameObjects.Image;
  private enemySprite!:  Phaser.GameObjects.Image;

  constructor() {
    super({ key: 'BattleScene' });
  }

  /** Called from outside to inject battle dependencies before scene starts. */
  init(data: BattleSceneConfig): void {
    this.cfg = data;
  }

  // ─── Phaser lifecycle ─────────────────────────────────────────────────────

  preload(): void {
    this.audioManager = new AudioManager(this, this.cfg.telemetry);
    this.audioManager.preload();

    // Load creature sprites (idle + anticipation + active + recovery per creature)
    this.preloadCreatureSprites(this.cfg.playerCreature);
    this.preloadCreatureSprites(this.cfg.enemyCreature);

    // Background
    this.load.image('battle_bg', 'assets/ui/battle_bg.png');
  }

  create(): void {
    // ── Background ──────────────────────────────────────────────────────────
    const hasBg = this.textures.exists('battle_bg');
    if (hasBg) {
      this.add.image(W / 2, H / 2, 'battle_bg').setDisplaySize(W, H);
    } else {
      this.add.rectangle(W / 2, H / 2, W, H, 0x1a1a2e);
    }

    // ── Creature sprites ────────────────────────────────────────────────────
    this.playerSprite = this.createCreatureSprite(this.cfg.playerCreature, PLAYER_SPRITE_X, PLAYER_SPRITE_Y);
    this.enemySprite  = this.createCreatureSprite(this.cfg.enemyCreature,  ENEMY_SPRITE_X,  ENEMY_SPRITE_Y);

    // ── VFX Manager ──────────────────────────────────────────────────────────
    this.vfxManager = new VFXManager(this, this.cfg.telemetry);
    this.vfxManager.register(this.cfg.playerCreature, PLAYER_SPRITE_X, PLAYER_SPRITE_Y);
    this.vfxManager.register(this.cfg.enemyCreature,  ENEMY_SPRITE_X,  ENEMY_SPRITE_Y);

    // ── Audio Manager ────────────────────────────────────────────────────────
    this.audioManager.registerCreature(this.cfg.playerCreature);
    this.audioManager.registerCreature(this.cfg.enemyCreature);

    // ── UI ───────────────────────────────────────────────────────────────────
    this.buildUI();

    // ── Animation player ─────────────────────────────────────────────────────
    this.cfg.animationPlayer.registerCreature(this.cfg.playerCreature, this.playerSprite);
    this.cfg.animationPlayer.registerCreature(this.cfg.enemyCreature,  this.enemySprite);

    // Wire animation callbacks
    this.cfg.animationPlayer.onFirePoint((creatureId, frame) => {
      this.onFirePoint(creatureId, frame);
    });
    this.cfg.animationPlayer.onStateChange((creatureId, state, frame) => {
      this.onAnimationStateChange(creatureId, state, frame);
      this.cfg.telemetry.logAnimationState(creatureId, state, frame);
    });

    // ── Game loop ─────────────────────────────────────────────────────────────
    this.cfg.gameLoop.on('frame', (frame, _delta, _elapsed) => {
      if (!this.battleOver) {
        this.cfg.animationPlayer.update(frame);
      }
    });

    // ── Battle state ──────────────────────────────────────────────────────────
    this.playerHP  = this.cfg.playerCreature.baseStats.hp;
    this.enemyHP   = this.cfg.enemyCreature.baseStats.hp;
    this.turnQueue = this.cfg.battleManager.speedCheck([
      this.cfg.playerCreature,
      this.cfg.enemyCreature,
    ]);
    this.currentTurnIdx = 0;

    // ── Start game loop ───────────────────────────────────────────────────────
    this.cfg.gameLoop.start();
    this.startAmbients();
    this.combatLog.logRoundStart(this.round, 0);
    this.advanceTurn();
  }

  shutdown(): void {
    this.cfg.gameLoop.stop();
    this.vfxManager.destroyAll();
    this.audioManager.destroyAll();
  }

  // ─── Turn logic ───────────────────────────────────────────────────────────

  private advanceTurn(): void {
    if (this.battleOver) return;

    const attacker = this.turnQueue[this.currentTurnIdx];
    const isPlayerAttacking = attacker.id === this.cfg.playerCreature.id;

    // Stop idle ambient on the attacker — it's about to act
    this.audioManager.stopIdleAmbient(attacker.id);

    // Get the portrait and update it to anticipation
    this.getPortrait(attacker.id).setState('anticipation');

    // Trigger animation; AbilityResolver fires on ACTIVE frame via onFirePoint callback
    this.cfg.animationPlayer.triggerAttack(attacker.id);

    // Advance turn index (round robin for 1v1, extend for multi-creature later)
    this.currentTurnIdx = (this.currentTurnIdx + 1) % this.turnQueue.length;

    // After recovery, advance again (with 400ms buffer to let animations breathe)
    const recoveryDuration = 500 + 400;
    this.time.delayedCall(recoveryDuration, () => {
      if (!this.battleOver) {
        // Round boundary
        if (this.currentTurnIdx === 0) {
          this.round++;
          this.combatLog.logRoundStart(this.round, this.cfg.gameLoop.getFrame());
          if (this.round > 10) {
            this.endBattle('timeout');
            return;
          }
        }
        this.advanceTurn();
      }
    });
  }

  // ─── Fire-point handler ───────────────────────────────────────────────────
  // Called on the exact frame the attacker's ACTIVE animation hits its fire-point.

  private onFirePoint(attackerId: string, frame: number): void {
    const isPlayerAttacking = attackerId === this.cfg.playerCreature.id;
    const attacker = isPlayerAttacking ? this.cfg.playerCreature : this.cfg.enemyCreature;
    const target   = isPlayerAttacking ? this.cfg.enemyCreature  : this.cfg.playerCreature;

    // Resolve damage
    const result = this.cfg.abilityResolver.resolve(attacker, target, frame);

    // Update HP state
    if (isPlayerAttacking) {
      this.enemyHP = result.targetHPAfter;
      this.enemyHPBar.animateTo(this.enemyHP);
      this.enemyPortrait.flashHit();
    } else {
      this.playerHP = result.targetHPAfter;
      this.playerHPBar.animateTo(this.playerHP);
      this.playerPortrait.flashHit();
    }

    // Fire VFX (same frame)
    this.vfxManager.onAbilityFired(attackerId, frame);

    // Fire audio (same frame)
    this.audioManager.onAbilityFired(attackerId, frame);
    this.audioManager.onHitReceived(target.id, frame);

    // Log to telemetry (same frame)
    this.cfg.telemetry.logAbility(result);

    // Log to combat UI
    this.combatLog.logAbility(
      attacker.name,
      result.abilityName,
      result.damageDealt,
      target.name,
      frame
    );

    // Death check
    if (result.targetDied) {
      this.audioManager.onCreatureDied(target.id, frame);
      this.getPortrait(target.id).setState('dead');
      this.combatLog.logDeath(target.name, frame);
      this.time.delayedCall(600, () => {
        this.endBattle(isPlayerAttacking ? 'player' : 'enemy');
      });
    }
  }

  // ─── Animation state callbacks ────────────────────────────────────────────

  private onAnimationStateChange(creatureId: string, state: string, frame: number): void {
    switch (state) {
      case 'recovery':
        this.vfxManager.onRecoveryStart(creatureId, frame);
        this.getPortrait(creatureId).setState('recovery');
        break;
      case 'idle':
        this.getPortrait(creatureId).setState('idle');
        this.audioManager.startIdleAmbient(creatureId);
        break;
      case 'active':
        this.getPortrait(creatureId).setState('active');
        break;
    }
  }

  // ─── End state ────────────────────────────────────────────────────────────

  private endBattle(winner: 'player' | 'enemy' | 'timeout'): void {
    if (this.battleOver) return;
    this.battleOver = true;
    this.cfg.gameLoop.stop();

    const frame = this.cfg.gameLoop.getFrame();

    if (winner === 'player') {
      this.combatLog.logVictory(this.cfg.playerCreature.name, frame);
    } else if (winner === 'enemy') {
      this.combatLog.logVictory(this.cfg.enemyCreature.name, frame);
    } else {
      this.combatLog.append('── Time limit reached ──', '#78909c', frame);
    }

    // Transition to victory/results scene after a short pause
    this.time.delayedCall(1800, () => {
      this.scene.start('ResultsScene', {
        winner,
        telemetry: this.cfg.telemetry.export(),
        playerCreature: this.cfg.playerCreature,
        enemyCreature:  this.cfg.enemyCreature,
        rounds: this.round,
      });
    });
  }

  // ─── UI builders ─────────────────────────────────────────────────────────

  private buildUI(): void {
    const p = this.cfg.playerCreature;
    const e = this.cfg.enemyCreature;

    // Player portrait (bottom-left quadrant)
    this.playerPortrait = new CreaturePortrait({
      scene:         this,
      x:             30,
      y:             H - 160,
      creatureId:    p.id,
      creatureName:  p.name,
      textures:      this.getPortraitTextures(p.id),
      rarity:        p.rarity,
    });

    // Enemy portrait (bottom-right quadrant)
    this.enemyPortrait = new CreaturePortrait({
      scene:         this,
      x:             W - 90,
      y:             H - 160,
      creatureId:    e.id,
      creatureName:  e.name,
      textures:      this.getPortraitTextures(e.id),
      rarity:        e.rarity,
    });

    // Player HP bar
    this.playerHPBar = new HPBar({
      scene:           this,
      x:               12,
      y:               H - 90,
      width:           160,
      height:          12,
      maxHP:           p.baseStats.hp,
      behavioralClass: p.behavioralClass as HpBarClass,
    });

    // Enemy HP bar (right-aligned)
    this.enemyHPBar = new HPBar({
      scene:           this,
      x:               W - 172,
      y:               H - 90,
      width:           160,
      height:          12,
      maxHP:           e.baseStats.hp,
      behavioralClass: e.behavioralClass as HpBarClass,
    });

    // Combat log (spans bottom center)
    this.combatLog = new CombatLog({
      scene:    this,
      x:        10,
      y:        H - 70,
      width:    W - 20,
      height:   62,
      maxLines: 4,
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private preloadCreatureSprites(creature: ICreature): void {
    const base = `src/sprites/creatures/${creature.id}`;
    for (const state of ['idle', 'anticipation', 'active', 'recovery'] as const) {
      const key = `${creature.id}_${state}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, `${base}/${state}.png`);
      }
    }
  }

  private createCreatureSprite(creature: ICreature, x: number, y: number): Phaser.GameObjects.Image {
    const key = `${creature.id}_idle`;
    const sprite = this.textures.exists(key)
      ? this.add.image(x, y, key)
      : this.add.rectangle(x, y, 80, 80, 0x555555) as unknown as Phaser.GameObjects.Image;

    (sprite as Phaser.GameObjects.Image).setDisplaySize?.(80, 80);
    sprite.setDepth(10);
    return sprite as Phaser.GameObjects.Image;
  }

  private getPortraitTextures(creatureId: string) {
    const exists = (state: string) => this.textures.exists(`${creatureId}_${state}`);
    return {
      idle:         exists('idle')         ? `${creatureId}_idle`         : 'fallback',
      anticipation: exists('anticipation') ? `${creatureId}_anticipation` : 'fallback',
      active:       exists('active')       ? `${creatureId}_active`       : 'fallback',
      recovery:     exists('recovery')     ? `${creatureId}_recovery`     : 'fallback',
    };
  }

  private getPortrait(creatureId: string): CreaturePortrait {
    return creatureId === this.cfg.playerCreature.id
      ? this.playerPortrait
      : this.enemyPortrait;
  }

  private startAmbients(): void {
    this.audioManager.startIdleAmbient(this.cfg.playerCreature.id);
    this.audioManager.startIdleAmbient(this.cfg.enemyCreature.id);
  }
}
