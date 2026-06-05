# Sprite Asset Integration Guide

## Overview

The AnimationPlayer component (at `src/components/AnimationPlayer.jsx`) is ready to load and display creature sprites with VFX color overlays. This guide explains how to add sprite assets to the system.

## Sprite Naming Convention

Sprites are loaded from `public/sprites/{creature.id}.png` where `creature.id` is the creature's identifier from `src/data/creatures.js`.

**Examples:**
- Stoneback (id: `vault`) → `public/sprites/vault.png`
- Ironscale (id: `bastion`) → `public/sprites/bastion.png`
- Zipsnap (id: `fang`) → `public/sprites/fang.png`

## Current Creatures (ID → Name)

**Guardians:**
- `vault` → Stoneback
- `bastion` → Ironscale
- `bulwark` → Mosshorn

**Echos:**
- `conduit` → Buzzline
- `nexus` → Tanglewing
- `link` → Threadbit

**Swifts:**
- `fang` → Zipsnap
- `striker` → Quicktalon
- `claw` → Skitter

**Sparks:**
- `ember` → Glowtail
- `nova` → Sparkpounce
- `bolt` → Zingtail

## Sprite Asset Requirements

### Dimensions
- **Recommended:** 256×256 px (will scale to component size)
- **Minimum:** 128×128 px
- **Maximum:** 512×512 px

### Format
- **PNG with transparency** (RGBA)
- **WebP** supported (falls back to PNG)

### Visual Guidelines
- **Centered composition** — creature centered in canvas
- **White or transparent background** — background layer is ignored
- **Padding:** ~10-15% margin around creature
- **Color vibrancy:** Archetype colors are applied via VFX overlay, keep sprite base neutral-to-saturated

### Animation Frames
- **Single static frame OK** — will be animated via CSS (idle, attack, damaged, defeated)
- **Spritesheet support** — future; currently not implemented

## Adding Sprites

### Quick Start
1. Generate/acquire a sprite for a creature (e.g., Stoneback from Midjourney)
2. Save as PNG: `public/sprites/{creature_id}.png`
3. Restart dev server or clear browser cache (HMR may cache missing images)
4. Sprite will auto-load on next page refresh

### Example: Adding Stoneback sprite
```bash
# Copy generated sprite to correct location
cp ~/Downloads/stoneback.png public/sprites/vault.png

# Dev server will hot-reload
# View in CollectionScreen → see Stoneback card with sprite
```

## Component Integration

### CollectionScreen
Already integrated in `UnitCard` component:
```jsx
<AnimationPlayer creature={unit} size="small" scale={1.2} animate="idle" />
```

### BattleScreen (Future Integration)
To display creatures during battles:
```jsx
<AnimationPlayer 
  creature={unit} 
  size="large" 
  vfxColor={customColor}
  animate={isAttacking ? 'attack' : 'idle'}
/>
```

### Custom Sizes
AnimationPlayer supports three preset sizes:
- `small` → 80px (collection cards)
- `medium` → 140px (default)
- `large` → 200px (battle preview)

Scale via `scale` prop: `scale={1.5}` increases by 50%.

## VFX Color System

### Archetype Colors (Default)
- **Guardian** (#4a90d9 — blue)
- **Echo** (#7ed321 — green)
- **Swift** (#d0021b — red)
- **Spark** (#f5a623 — orange)

### Custom Color Override
Pass `vfxColor` prop to override:
```jsx
<AnimationPlayer creature={unit} vfxColor="#ff00ff" />
```

Effects applied:
- Circular glow background (radial gradient)
- Border color
- Name/archetype text color
- Pip indicator color

## Animation States

AnimationPlayer supports four animation states via the `animate` prop:

| State | Effect | Duration | Use Case |
|-------|--------|----------|----------|
| `idle` | Gentle bob up/down | 1.5s | Collection, standby |
| `attack` | Scale + forward thrust | 0.5s | Battle actions |
| `damaged` | Red glow flash | 0.4s | Damage taken |
| `defeated` | Collapse/fade | 0.8s | Unit defeated |

## Fallback Behavior

If a sprite file is missing:
- AnimationPlayer renders a placeholder circle with archetype color
- Shows creature ID in monospace font below
- No error in console — graceful degradation
- When sprite is added, it auto-loads on next refresh

## Testing

### Verify Sprite Loading
1. Open CollectionScreen
2. Should see colored placeholder circles with creature IDs
3. When sprites are added to `public/sprites/`, they auto-display
4. Inspect in browser DevTools → Network tab → verify `vault.png` etc. load with 200 status

### Test Animation States
Open browser console:
```javascript
// Find a AnimationPlayer component instance and trigger animations
// (Future: add animation picker to UI)
```

## Generating Sprites

### Midjourney Recommended Prompt Structure
Based on creature design phase (see `CREATURE_DESIGN.md`):

```
"[Creature Name]" animated companion creature design,
[body description],
[pose/motion description],
stylized game creature concept sheet, white background,
three poses left to right: [pose1] / [pose2] / [pose3]
--ar 3:2
```

Example (from Drift design):
```
"Drift" animated companion creature design,
horizontal body axis low to ground not upright,
long neck extends laterally, short rounded beak,
soft backward-swept blue crest, small warm integrated eyes,
stylized game creature concept sheet, white background,
three poses: extended lateral / full glide / instant redirect
--ar 3:2
```

### Batch Generation Workflow
1. **Phase 14:** Generate all 12 creature prompts in Notion
2. **Midjourney:** Run prompt batch → collect best variants
3. **Phase 15:** Copy to `public/sprites/{id}.png`
4. **Verification:** CollectionScreen renders all sprites
5. **Phase 16 (Future):** Integration into BattleScreen, WildHunt animations

## File Organization

```
8gents/
├── public/
│   └── sprites/
│       ├── vault.png        (Stoneback)
│       ├── bastion.png      (Ironscale)
│       ├── bulwark.png      (Mosshorn)
│       ├── conduit.png      (Buzzline)
│       ├── nexus.png        (Tanglewing)
│       ├── link.png         (Threadbit)
│       ├── fang.png         (Zipsnap)
│       ├── striker.png      (Quicktalon)
│       ├── claw.png         (Skitter)
│       ├── ember.png        (Glowtail)
│       ├── nova.png         (Sparkpounce)
│       ├── bolt.png         (Zingtail)
│       └── SPRITES_GUIDE.md (this file)
├── src/
│   ├── components/
│   │   └── AnimationPlayer.jsx
│   └── screens/
│       ├── CollectionScreen.jsx (integrated)
│       └── BattleScreen.jsx (future integration)
```

## Known Limitations

- **Single-frame sprites only** — animated spritesheet support planned for Phase K
- **No creature-specific animations** — all creatures use same idle/attack/damaged/defeated animations
- **Archetype-wide VFX** — individual creature VFX customization not yet implemented
- **Mobile performance** — sprite scaling and filter effects may impact performance on low-end devices

## Next Steps

1. **Phase 14 (Sprite Generation):** Generate 12 creature Midjourney sprites per locked design prompts
2. **Phase 15 (Current):** Integrate sprites into CollectionScreen ✓ AnimationPlayer framework ✓
3. **Phase 16:** Load sprites into BattleScreen, wire creature-specific animations
4. **Phase K (Animation Polish):** Sprite animation refinement, VFX polish

---

**Updated:** 2026-05-28  
**Status:** AnimationPlayer framework complete, awaiting sprite assets
