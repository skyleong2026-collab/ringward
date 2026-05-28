/**
 * ui/CreaturePortrait.ts
 * 60×60px animated creature portrait widget.
 *
 * Shows the creature's idle animation loop synchronized to the main
 * game loop frame counter. When the creature's turn begins, freezes
 * on ANTICIPATION frame. When active, plays the full attack sequence.
 *
 * Designed as a Phaser GameObject container (no React/DOM dependency).
 */

import Phaser from 'phaser';

export type PortraitState = 'idle' | 'anticipation' | 'active' | 'recovery' | 'dead';

export interface PortraitConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  creatureId: string;
  creatureName: string;
  /** Texture key for each animation state */
  textures: {
    idle:         string;
    anticipation: string;
    active:       string;
    recovery:     string;
  };
  /** Rarity: affects border color */
  rarity: 'Common' | 'Rare' | 'Elite' | 'Legendary';
  size?: number;
}

const RARITY_COLORS: Record<string, number> = {
  Common:    0x9e9e9e,
  Rare:      0x2196f3,
  Elite:     0xffc107,
  Legendary: 0xff5722,
};

export class CreaturePortrait extends Phaser.GameObjects.Container {
  private portraitBorder: Phaser.GameObjects.Rectangle;
  private portraitImage: Phaser.GameObjects.Image;
  private nameLabel:     Phaser.GameObjects.Text;
  private deadOverlay:   Phaser.GameObjects.Rectangle;

  private config: PortraitConfig;
  private currentState: PortraitState = 'idle';
  private readonly SIZE: number;

  constructor(config: PortraitConfig) {
    super(config.scene, config.x, config.y);
    config.scene.add.existing(this);

    this.config = config;
    this.SIZE   = config.size ?? 60;

    // ── Border (rarity-colored) ────────────────────────────────────────────
    this.portraitBorder = config.scene.add.rectangle(
      0, 0,
      this.SIZE + 4,
      this.SIZE + 4,
      RARITY_COLORS[config.rarity] ?? 0x9e9e9e
    );

    // ── Creature image ─────────────────────────────────────────────────────
    this.portraitImage = config.scene.add.image(0, 0, config.textures.idle);
    this.portraitImage.setDisplaySize(this.SIZE, this.SIZE);

    // ── Name label ────────────────────────────────────────────────────────
    this.nameLabel = config.scene.add.text(0, this.SIZE / 2 + 8, config.creatureName, {
      fontSize: '9px',
      color: '#ffffff',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5, 0);

    // ── Dead overlay ──────────────────────────────────────────────────────
    this.deadOverlay = config.scene.add.rectangle(0, 0, this.SIZE, this.SIZE, 0x000000, 0.6);
    this.deadOverlay.setVisible(false);

    this.add([this.portraitBorder, this.portraitImage, this.nameLabel, this.deadOverlay]);
    this.setDepth(30);
  }

  /** Updates portrait texture to match the creature's current animation state. */
  setState(state: PortraitState): void {
    if (this.currentState === state) return;
    this.currentState = state;

    if (state === 'dead') {
      this.deadOverlay.setVisible(true);
      return;
    }

    const textureKey = this.config.textures[state] ?? this.config.textures.idle;
    this.portraitImage.setTexture(textureKey);
  }

  /** Flash the border white on hit (brief 150ms flash). */
  flashHit(): void {
    this.portraitBorder.setFillStyle(0xffffff);
    this.config.scene.time.delayedCall(150, () => {
      this.portraitBorder.setFillStyle(RARITY_COLORS[this.config.rarity] ?? 0x9e9e9e);
    });
  }

  getCurrentState(): PortraitState { return this.currentState; }
}


// ─────────────────────────────────────────────────────────────────────────────
/**
 * ui/HPBar.ts
 * Animated HP bar with class-specific motion language.
 *
 * Motion language per behavioral class (from UI Design System — Phase 4):
 *   Pressure  → bar sinks from top (weight drops down)
 *   Collapse  → bar crushes inward from both sides
 *   Crest     → bar drains from right with upward float
 *   Orbit     → bar arcs around with radial wipe
 *   Drift     → bar fades and drifts left
 */

export type HpBarClass = 'Pressure' | 'Collapse' | 'Crest' | 'Orbit' | 'Drift';

export interface HPBarConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width:  number;
  height: number;
  maxHP:  number;
  behavioralClass: HpBarClass;
}

const CLASS_BAR_COLORS: Record<HpBarClass, number> = {
  Pressure: 0xe57373,   // earthy red
  Collapse: 0xab47bc,   // void purple
  Crest:    0xffd54f,   // ascending gold
  Orbit:    0x4fc3f7,   // celestial blue
  Drift:    0x80cbc4,   // water teal
};

export class HPBar extends Phaser.GameObjects.Container {
  private bg:    Phaser.GameObjects.Rectangle;
  private bar:   Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;

  private config:  HPBarConfig;
  private currentHP: number;
  private displayHP: number;  // for smooth tween
  private tweenRef?: Phaser.Tweens.Tween;

  constructor(config: HPBarConfig) {
    super(config.scene, config.x, config.y);
    config.scene.add.existing(this);

    this.config    = config;
    this.currentHP = config.maxHP;
    this.displayHP = config.maxHP;

    // Background track
    this.bg = config.scene.add.rectangle(
      0, 0,
      config.width, config.height,
      0x333333
    ).setOrigin(0, 0);

    // HP fill bar
    this.bar = config.scene.add.rectangle(
      0, 0,
      config.width, config.height,
      CLASS_BAR_COLORS[config.behavioralClass]
    ).setOrigin(0, 0);

    // HP text label
    this.label = config.scene.add.text(
      config.width / 2, config.height / 2,
      `${config.maxHP}/${config.maxHP}`,
      { fontSize: '8px', color: '#ffffff', fontFamily: 'monospace' }
    ).setOrigin(0.5, 0.5);

    this.add([this.bg, this.bar, this.label]);
    this.setDepth(25);
  }

  /**
   * Animates the HP bar to a new HP value.
   * Each class has a distinct tween that reflects its behavioral motion language.
   */
  animateTo(newHP: number): void {
    this.currentHP = Math.max(0, newHP);

    // Kill any in-progress tween
    if (this.tweenRef?.isPlaying()) {
      this.tweenRef.stop();
    }

    const targetFraction = this.currentHP / this.config.maxHP;
    const targetWidth    = this.config.width * targetFraction;

    this.label.setText(`${this.currentHP}/${this.config.maxHP}`);

    // Class-specific tween behavior
    switch (this.config.behavioralClass) {
      case 'Pressure':
        // Sinks down with slight overshoot (tectonic weight)
        this.tweenRef = this.config.scene.tweens.add({
          targets:  this.bar,
          scaleX:   targetFraction,
          duration: 350,
          ease:     'Back.Out',
        });
        break;

      case 'Collapse':
        // Crushes inward from right, then snaps left edge
        this.tweenRef = this.config.scene.tweens.add({
          targets:  this.bar,
          scaleX:   targetFraction,
          duration: 280,
          ease:     'Power3.In',
        });
        break;

      case 'Crest':
        // Rises with slight delay then settles (ascending energy)
        this.tweenRef = this.config.scene.tweens.add({
          targets:  this.bar,
          scaleX:   targetFraction,
          duration: 420,
          ease:     'Sine.Out',
        });
        break;

      case 'Orbit':
        // Smooth arc (perpetual flow feeling)
        this.tweenRef = this.config.scene.tweens.add({
          targets:  this.bar,
          scaleX:   targetFraction,
          duration: 400,
          ease:     'Cubic.InOut',
        });
        break;

      case 'Drift':
        // Fades then shifts left (motion without force)
        this.config.scene.tweens.add({
          targets:  this.bar,
          alpha:    0.4,
          duration: 120,
          onComplete: () => {
            this.bar.scaleX = targetFraction;
            this.config.scene.tweens.add({
              targets:  this.bar,
              alpha:    1.0,
              duration: 200,
              ease:     'Sine.Out',
            });
          },
        });
        break;
    }
  }

  getHP(): number { return this.currentHP; }
  getMaxHP(): number { return this.config.maxHP; }
}


// ─────────────────────────────────────────────────────────────────────────────
/**
 * ui/CombatLog.ts
 * Turn-by-turn battle log display.
 *
 * Appends lines as events resolve. Shows last N lines.
 * Matches telemetry format: "[Creature]: [Ability] — [damage] to [target]"
 *
 * Design: monospace, dark bg, subtle line highlight on new entries.
 */

export interface CombatLogConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width:    number;
  height:   number;
  maxLines: number;
}

export interface LogEntry {
  text:  string;
  color: string;
  frame: number;
}

export class CombatLog extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private lines: Phaser.GameObjects.Text[];
  private entries: LogEntry[] = [];
  private config: CombatLogConfig;

  private readonly LINE_HEIGHT = 13;
  private readonly FONT_SIZE   = '9px';
  private readonly PADDING     = 6;

  constructor(config: CombatLogConfig) {
    super(config.scene, config.x, config.y);
    config.scene.add.existing(this);
    this.config = config;

    // Background panel
    this.bg = config.scene.add.rectangle(
      0, 0,
      config.width, config.height,
      0x111111, 0.85
    ).setOrigin(0, 0);

    this.lines = [];
    const visibleLines = Math.floor((config.height - this.PADDING * 2) / this.LINE_HEIGHT);
    for (let i = 0; i < visibleLines; i++) {
      const t = config.scene.add.text(
        this.PADDING,
        this.PADDING + i * this.LINE_HEIGHT,
        '',
        {
          fontSize:   this.FONT_SIZE,
          color:      '#cccccc',
          fontFamily: 'monospace',
          wordWrap:   { width: config.width - this.PADDING * 2 },
        }
      ).setOrigin(0, 0);
      this.lines.push(t);
    }

    this.add([this.bg, ...this.lines]);
    this.setDepth(35);
  }

  /**
   * Appends a new log entry and scrolls display.
   * @param text   Human-readable event text
   * @param color  Hex color string ('#ffffff', '#ff5722', etc.)
   * @param frame  Game frame number (shown in debug mode only)
   */
  append(text: string, color = '#cccccc', frame = 0): void {
    this.entries.push({ text, color, frame });
    this.refresh();

    // Flash the newest line
    const newest = this.lines[this.lines.length - 1];
    this.config.scene.tweens.add({
      targets:  newest,
      alpha:    { from: 0.3, to: 1.0 },
      duration: 220,
      ease:     'Sine.Out',
    });
  }

  /** Shorthand for common event types */
  logAbility(attackerName: string, abilityName: string, damage: number, targetName: string, frame: number): void {
    this.append(
      `${attackerName}: ${abilityName} — ${damage} to ${targetName}`,
      '#e0e0e0',
      frame
    );
  }

  logDeath(creatureName: string, frame: number): void {
    this.append(`✕ ${creatureName} fell`, '#ef9a9a', frame);
  }

  logRoundStart(round: number, frame: number): void {
    this.append(`── Round ${round} ──`, '#78909c', frame);
  }

  logVictory(winnerName: string, frame: number): void {
    this.append(`★ ${winnerName} wins`, '#ffd54f', frame);
  }

  clear(): void {
    this.entries = [];
    this.refresh();
  }

  private refresh(): void {
    const visibleCount = this.lines.length;
    const start        = Math.max(0, this.entries.length - visibleCount);
    const visible      = this.entries.slice(start);

    for (let i = 0; i < this.lines.length; i++) {
      if (i < visible.length) {
        this.lines[i].setText(visible[i].text);
        this.lines[i].setColor(visible[i].color);
        this.lines[i].setAlpha(1);
      } else {
        this.lines[i].setText('');
      }
    }
  }

  getAllEntries(): LogEntry[] { return [...this.entries]; }
}
