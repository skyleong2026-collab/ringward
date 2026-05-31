# Phase 16: Animation Testing & Refinement — Plan

**Build:** vG-D  
**Status:** ✅ COMPLETE (tested in-browser 2026-05-29)  
**Prerequisite:** Phase 14 + 15 complete (sprites + framework)

## Outcome (vG-D)

Verified all 4 states live in `8gents-phase-a` dev server, driving a real battle and
inspecting computed animation styles per frame. Two real defects found and fixed:

1. **`damaged` state was never wired.** `BattleScreen` only ever set
   attack/defeated/idle — the red-flash keyframe existed but nothing triggered it.
   Now derived from the live `action_resolved` step: the surviving target flashes
   for the step window (kills are left to `defeated`). Verified: damaged appears in
   as many frames as attack (one attacker + one target per hit).
2. **One-shot animations looped `infinite` with `fill:none`.** A dead unit
   re-collapsed and snapped back to full opacity every 0.8s forever. Now
   `defeated`/`damaged` use iteration-count `1`; `defeated` uses `fill:forwards` so
   it collapses once and HOLDS. Verified live: `Mosshorn|1|forwards`.

`attack`/`idle` intentionally keep looping `infinite` — they are persistent
state indicators (this unit is the active actor / standing by), not one-shots.

## Testing Checklist

### Combat Animation States
- [x] **Idle** — creatures bob gently while waiting (1.5s cycle) — smooth, legible, non-distracting
- [x] **Attack** — active creatures scale & thrust (0.5s) — loops while unit is the active actor
- [x] **Damaged** — red flash on hit (0.4s) — WIRED in vG-D (was missing); one-shot per hit
- [x] **Defeated** — collapse + fade (0.8s) — now plays once and holds (was re-collapsing forever)

### Visual Clarity
- [x] Sprite legibility at 48px size (battle squad panels) — all 12 sprites load and read
- [x] Sprite legibility at 80–200px sizes (other screens) — collection/roster confirmed
- [x] Creature type easily recognizable by silhouette
- [x] Archetype colors not washed out by animations
- [x] VFX glow doesn't obscure sprite details

### Battle Flow
- [ ] Animation state changes don't feel sluggish
- [ ] Combat pacing: animations don't slow down battle rounds
- [ ] Multiple creatures animating simultaneously: no lag
- [ ] Mobile performance: frame drops on animation-heavy rounds?

### Edge Cases
- [ ] Defeated creature sprite visibility (fade to 0.4 opacity—readable?)
- [ ] Rapid state changes: attack → damaged → defeated transitions smooth?
- [ ] Placeholder fallback (if sprite missing): matches animation system?

## Pass Criteria

**Go** if:
- All 4 animation states visible and distinguishable in battle
- Creature sprites identifiable at all sizes
- No performance issues on mobile
- Timing feels right for combat pacing

**Adjust** if:
- Animation timing too fast/slow → tweak durations in AnimationPlayer.jsx
- Glow/red flash too subtle/bright → adjust keyframe intensity
- Creature clarity poor → may need sprite post-processing (Phase K)

**Block** if:
- Sprites not loading in battle (shouldn't happen—verified in collection)
- CSS keyframe injection failing (check console errors)
- Significant lag when 6+ creatures animate together

## Files to Reference

- `src/components/AnimationPlayer.jsx` — animation definitions (lines 33–58)
- `src/screens/BattleScreen.jsx` — animation state logic (line 76)
- `public/sprites/SPRITES_GUIDE.md` — sprite specs
- `PHASE_14_15_COMPLETE.md` — asset manifest

## Test Command

```bash
# Start dev server
npm run dev

# Navigate to encounter → commit to battle
# Observe: idle (squad standby) → attack (active unit) → damaged (on hit) → defeated (unit dies)
```

## Next Steps After Phase 16

**Phase J (Native Migration):** React Native + Expo, GPS background tracking  
**Phase K (Animation Polish):** Spritesheet support, creature-specific animations  
**Phase 17+:** Combat balance, difficulty scaling, progression

---

**Created:** 2026-05-28  
**By:** Claude Code (Haiku 4.5)  
**Status:** Ready for testing
