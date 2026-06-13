// creatureAnim.js — which creatures have real frame animation, and the asset per
// combat state. The Cinderpaw reference rig (Claude Design "Combat Choreography"):
// PixelLab draws a few small ingredients (idle / attack / hurt), the engine
// choreographs them (thrust, projectile travel, impact, recoil) on top.
//
// Files live at <base>/<state>.<ext>. Animated states ship as GIFs (self-playing,
// 256², bottom-anchored, transparent); the .png is the still poster / first frame.
// A creature absent from this map falls back to its static /sprites/<id>.jpg crop.

export const CREATURE_ANIM = {
  cinderpaw: {
    base: '/art/creatures/cinderpaw',
    // combat anim state → file. damaged/defeated reuse the hurt flinch; the engine
    // adds knockback / collapse on top.
    states: { idle: 'idle.gif', attack: 'attack.gif', hurt: 'hurt.gif', damaged: 'hurt.gif', defeated: 'hurt.gif' },
  },
};

export const hasCreatureAnim = (id) => !!CREATURE_ANIM[id];
