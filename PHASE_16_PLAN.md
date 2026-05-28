# Phase 16: Animation Testing & Refinement — Plan

**Build:** vI-A  
**Status:** Ready for testing  
**Prerequisite:** Phase 14 + 15 complete (sprites + framework)

## Testing Checklist

### Combat Animation States
- [ ] **Idle** — creatures bob gently while waiting (1.5s cycle)
  - Verify: No distraction, smooth loop, visible
  - Adjustment if needed: Can reduce to 1.2s if too slow
  
- [ ] **Attack** — active creatures scale & thrust (0.5s)
  - Verify: Clear forward motion, quick recoil feels right
  - Adjustment if needed: Can adjust scale (1.1→1.15?) or thrust distance (8px→10px?)
  
- [ ] **Damaged** — red flash on hit (0.4s)
  - Verify: Bright enough to see? Too bright?
  - Adjustment if needed: Glow intensity (10px→15px?) or color saturation
  
- [ ] **Defeated** — collapse + fade (0.8s)
  - Verify: Clear that unit is dead, not confused with damage
  - Adjustment if needed: Could add more rotation (5°→15°?) or faster fade

### Visual Clarity
- [ ] Sprite legibility at 48px size (battle squad panels)
- [ ] Sprite legibility at 80–200px sizes (other screens)
- [ ] Creature type easily recognizable by silhouette
- [ ] Archetype colors not washed out by animations
- [ ] VFX glow doesn't obscure sprite details

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
