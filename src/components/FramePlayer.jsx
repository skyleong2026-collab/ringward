// FramePlayer — plays a creature's per-state animation (the Cinderpaw rig).
// Renders the GIF for the current combat state, bottom-anchored & pixel-crisp, and
// remounts (restarts the animation from frame 0) whenever the state — or the `beat`
// nonce — changes, so each fresh attack replays cleanly. Creatures without frames
// never reach here (callers gate on hasCreatureAnim); returns null if so.
import { CREATURE_ANIM } from '../data/creatureAnim.js';

export function FramePlayer({ creatureId, anim = 'idle', size = 64, facing = 1, beat = 0 }) {
  const def = CREATURE_ANIM[creatureId];
  if (!def) return null;
  const file = def.states[anim] || def.states.idle;
  return (
    <img
      key={`${anim}-${beat}`}
      src={`${def.base}/${file}`}
      alt=""
      width={size}
      height={size}
      style={{
        width: '100%', height: '100%',
        objectFit: 'contain', objectPosition: 'center bottom',
        imageRendering: 'pixelated',
        transform: `scaleX(${facing})`,
        pointerEvents: 'none',
      }}
    />
  );
}
