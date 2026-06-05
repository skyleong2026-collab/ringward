import { useMemo } from 'react';
import { ARCHETYPES } from '@8gents/game-data';

// AnimationPlayer displays a creature sprite with optional VFX color overlay
// Props:
//   - creature: { id, name, archetype, ...}
//   - size: 'small' (80px) | 'medium' (140px) | 'large' (200px)
//   - vfxColor: override archetype color, or null to use archetype default
//   - scale: multiply size by this factor (default 1)
//   - animate: 'idle' | 'attack' | 'damaged' | 'defeated' (default 'idle')
export function AnimationPlayer({
  creature,
  size = 'medium',
  vfxColor = null,
  scale = 1,
  animate = 'idle',
}) {
  const sizeMap = { small: 80, medium: 140, large: 200 };
  const baseSizePx = sizeMap[size] || 140;
  const sizePx = baseSizePx * scale;

  // Determine sprite path: public/sprites/{id}.png
  // If file doesn't exist, fallback renders placeholder
  const spritePath = `/sprites/${creature.id}.png`;

  // Get archetype color for VFX overlay
  const archetypeColor = ARCHETYPES[creature.archetype]?.color ?? '#888';
  const overlayColor = vfxColor ?? archetypeColor;

  // Animation keyframes per state
  const animationKeyframes = useMemo(() => {
    const styles = document.createElement('style');
    const idleAnim = `
      @keyframes anim-idle-${creature.id} {
        0%, 100% { transform: translateY(0); opacity: 1; }
        50% { transform: translateY(-3px); opacity: 0.95; }
      }
    `;
    const attackAnim = `
      @keyframes anim-attack-${creature.id} {
        0% { transform: scale(1) translateX(0); }
        40% { transform: scale(1.1) translateX(8px); }
        70% { transform: scale(0.95) translateX(-2px); }
        100% { transform: scale(1) translateX(0); }
      }
    `;
    const damagedAnim = `
      @keyframes anim-damaged-${creature.id} {
        0%, 100% { filter: drop-shadow(0 0 0px rgba(255, 0, 0, 0)); }
        50% { filter: drop-shadow(0 0 10px rgba(255, 0, 0, 0.6)); }
      }
    `;
    const defeatedAnim = `
      @keyframes anim-defeated-${creature.id} {
        0% { transform: scaleY(1) rotateZ(0deg); opacity: 1; }
        100% { transform: scaleY(0.3) rotateZ(5deg); opacity: 0.4; }
      }
    `;
    const allKeyframes = idleAnim + attackAnim + damagedAnim + defeatedAnim;
    styles.textContent = allKeyframes;
    if (document.head && !document.head.querySelector(`style[data-anim-id="${creature.id}"]`)) {
      styles.setAttribute('data-anim-id', creature.id);
      document.head.appendChild(styles);
    }
    return creature.id;
  }, [creature.id]);

  const animationName = {
    idle: `anim-idle-${animationKeyframes}`,
    attack: `anim-attack-${animationKeyframes}`,
    damaged: `anim-damaged-${animationKeyframes}`,
    defeated: `anim-defeated-${animationKeyframes}`,
  }[animate] || `anim-idle-${animationKeyframes}`;

  const animationDuration = {
    idle: '1.5s',
    attack: '0.5s',
    damaged: '0.4s',
    defeated: '0.8s',
  }[animate] || '1.5s';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: sizePx,
        height: sizePx,
        margin: 'auto',
      }}
    >
      {/* Sprite container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #1a1a2a 0%, #0d0d1a 100%)',
          border: `1px solid ${overlayColor}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Sprite image — loads from public/sprites/{id}.png */}
        <img
          src={spritePath}
          alt={creature.name}
          onError={(e) => {
            // If sprite doesn't exist, show placeholder
            e.target.style.display = 'none';
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            padding: '8px',
            animation: `${animationName} ${animationDuration} ease-in-out infinite`,
          }}
        />

        {/* Placeholder when sprite image is missing */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: sizePx * 0.6,
              height: sizePx * 0.6,
              borderRadius: '50%',
              background: `${overlayColor}20`,
              border: `2px solid ${overlayColor}60`,
              margin: '0 auto 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: sizePx * 0.2, color: overlayColor }}>✦</span>
          </div>
          <span style={{ fontSize: sizePx * 0.12, color: `${overlayColor}80`, fontFamily: 'monospace' }}>
            {creature.id.toUpperCase()}
          </span>
        </div>

        {/* VFX overlay — color glow effect */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at center, ${overlayColor}15 0%, transparent 70%)`,
            pointerEvents: 'none',
            borderRadius: '8px',
          }}
        />
      </div>

      {/* Creature name below */}
      <div
        style={{
          position: 'absolute',
          bottom: '-28px',
          textAlign: 'center',
          width: '100%',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: overlayColor, letterSpacing: 0.5 }}>
          {creature.name.toUpperCase()}
        </div>
        <div style={{ fontSize: 8, color: `${overlayColor}80`, marginTop: 2, letterSpacing: 0.3 }}>
          {creature.archetype}
        </div>
      </div>
    </div>
  );
}
