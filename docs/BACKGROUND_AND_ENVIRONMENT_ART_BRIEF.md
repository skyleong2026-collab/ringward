# Background & Environment Art Brief (Ringward)

> **⏱ WHEN TO START (Sky's call, 2026-06-07): _finish the creature regen FIRST._** Backgrounds are the **next** art job after the eye-fixed creature sprites are done. When you pick this up, do **SET A (per-ring battle backgrounds) first** — it's the biggest visual upgrade. No need to wait on me; generate and drop files in, I'll wire the swaps.

> **For the art instance (Midjourney).** Generate these and drop them into `public/art/` at the paths noted; the game is wired (or will be) to swap the flat backgrounds for the paintings, paint-ready, like the cutscenes already work. Tune freely.

## The assessment (why this brief exists)

Ringward currently has **strong subjects, no places.** The creatures, relics, and the 5 opening cutscene frames are painted and good — but **everything else floats on flat near-black.** Two gaps stand out:

1. **Combat is a void.** The most-played screen (`BattleStage`) is a dark radial gradient with stylized blobs fighting in it. You climb through 8 distinct, named rings — and they all look identical. **Per-ring battle backdrops are the single highest-impact art we can add.**
2. **The menus have no world behind them.** The home, Summon, Forge, Holdfast, and Relics screens are dark panels on black. The lore is rich (the rim, the rings, the blight, the Drop) but you never *see* it. Painted ambient backdrops behind the UI would transform the mood instantly — this is what Summoners War / good mobile games do.

So this brief is **environments only** — no characters, no creatures (those are handled in the creature brief).

## The look — append to EVERY prompt (style bible, backgrounds variant)

```
muted folk-mystery storybook illustration, painterly, hand-painted, soft grain, cinematic atmospheric depth, environment only — NO characters, NO creatures, NO text, NO UI. Empty foreground (a clear stage where figures will stand). Composition falls into shadow toward the bottom third so menus and combatants read on top. Low-to-medium contrast, nothing busy in the dead center. Warm-but-melancholy mood, glowing earthen light. --ar 3:2
```

This matches the painted cutscene frames in `public/art/cutscene/` (warm, melancholy, hand-painted — NOT slick sci-fi, NOT cartoon). **Keep the whole world consistent.** Each ring keeps the painterly look but gets its own **signature color** (listed per image). For battle backdrops, **keep the interesting detail in the upper two-thirds; let the lower third fall dark** — the combatants and the HUD sit there.

---

## SET A — Battle backgrounds (HIGHEST IMPACT) → `public/art/rings/<id>.jpg`

The 8 rings, outer (home) to inner (the Drop). Deeper = older, colder, deadlier, closer to the truth. Each is a wide stage the squad fights on; the boss waits at the far side.

1. **`outer-ring.jpg` — The Crackling Outer Ring** *(signature: ember-orange)*
   `a windswept rim of cracked black earth at dusk, glowing orange embers and fault-lines threading the ground, distant warm horizon glow, scattered burnt standing-stones, the first ring of a vast blighted land, [STYLE]`

2. **`fallen-gate.jpg` — The Fallen Gate** *(signature: dusty cyan-grey)*
   `the rubble of an immense broken stone gate that once held back a blight, toppled pillars and shattered wall, cold pale-cyan light through the breach, grey dust, ruined and ancient, [STYLE]`

3. **`green-seam.jpg` — The Green Seam** *(signature: sickly green)*
   `a narrow overgrown ravine between two rings, pale gnarled trees and luminous green moss creeping over old machinery, sickly bioluminescent glow, humid and still, beautiful and wrong, [STYLE]`

4. **`storm-wire.jpg` — Storm-Wire Thickets** *(signature: electric violet-white)*
   `a thicket of taut humming live-wires and broken pylons under a bruised sky, arcs of violet-white static crackling between them, charged and dangerous, low rolling thunder mood, [STYLE]`

5. **`fast-trails.jpg` — The Fast Trails** *(signature: cold silver-blue)*
   `narrow winding cliff-trails threading high and fast through pale stone, motion-blurred wind, thin cold silver-blue light, vertiginous, the point past which most climbers never return, [STYLE]`

6. **`lightless.jpg` — The Lightless Deep** *(signature: deep indigo, faint embers)*
   `a near-lightless cavern deep inward, vast and silent, only faint indigo glints and a few distant drifting embers in the dark, oppressive, something watching from the black, [STYLE]`

7. **`witherfen.jpg` — The Witherfen** *(signature: blight-purple)*
   `a drowned fen where the blight pools thickest, black water and purple rot-light, twisted dead reeds, drifting spores glowing faint violet, diseased and heavy air, [STYLE]`

8. **`frostbound.jpg` — The Frostbound Deep** *(signature: pale ice-blue)*
   `a frozen silent expanse far inward near the Drop, pale blue ice and frost-rimed ruins, utter stillness, a faint impossible light glowing from somewhere ahead beyond the cold, awe and dread, [STYLE]`

---

## SET B — Ambient / home backdrop → `public/art/bg/home.jpg`

Sits behind the home screen (squad-pick / menus). Quiet, establishing, very dark-bottom so the UI reads.

- **`home.jpg` — The Rim, Looking Inward** *(signature: warm amber → cold violet)*
  `a lone vantage at the rim of the rings at dusk, looking inward across eight faint concentric glowing rings that close on a distant pale point of light on the horizon (the Drop), a half-reclaimed stone holdfast silhouette to one side, warm amber foreground fading to cold violet distance, vast and quiet and a little lonely, [STYLE]`

---

## SET C — The Summon altar → `public/art/bg/summon.jpg`

Behind the Summon ("The Wild Call") screen — this is the gacha moment, it should feel special.

- **`summon.jpg` — The Wakening Altar** *(signature: violet-white core-light)*
  `an ancient stone altar in a dim hollow, a single dormant earthen core resting on it haloed in soft violet-white light, motes rising, faint carved rings on the floor, reverent and expectant, the place where a wild grunling is called awake, empty center for the reveal, [STYLE] --ar 2:3`

---

## SET D — Section backdrops (subtle, behind tab panels) → `public/art/bg/<name>.jpg`

Lower priority, but they tie each tab to a place. Keep these **very muted** — they sit behind dense UI.

- **`forge.jpg` — The Cracked Forge** *(signature: ember + iron)*
  `an old cold field-forge with an anvil split clean down the middle, banked coals barely glowing ember-orange, hung tools and scrap, the quiet between-runs workshop, [STYLE]`
- **`holdfast.jpg` — The Holdfast** *(signature: violet hearthlight)*
  `a half-ruined stone holdfast at the rim being slowly reclaimed, one warm violet hearth-light glowing in a window, blight pulled back from its walls, home and refuge, [STYLE]`
- **`vault.jpg` — The Relic Vault** *(signature: gold on dark)*
  `a dim stone alcove of shelves holding strange relics and charms, faint gold glints on old gear, a collector's quiet hoard, [STYLE]`

---

## SET E — Title / key art → `public/art/bg/title.jpg`

For the title screen, share/preview cards, and the eventual store listing. The hero image — this one can be richer/higher-contrast (no UI sits on it).

- **`title.jpg` — RINGWARD key art** *(signature: the full palette)*
  `cinematic key art: a lone hooded handler with two small glowing earthen grunlings at their side, seen from behind, standing at the cracked rim and gazing inward across vast concentric glowing rings that spiral down to a distant pale doorway of light at the center, embers and motes adrift, awe and resolve, painterly folk-mystery masterpiece, leave clear sky space at the top for a title, no text --ar 16:9`

---

## Integration (how these plug in)

All paint-ready, exactly like the cutscene frames:
- **Battle backdrops** (`public/art/rings/<id>.jpg`) → I'll add a background `<img>` layer behind `BattleStage`, keyed by the ring you're raiding (`ground.id`), darkened so the fight reads. Until a file exists, combat keeps the current dark gradient.
- **Ambient/section backdrops** (`public/art/bg/<name>.jpg`) → a dimmed fixed background layer behind the home shell, swapped per active tab. Null = current flat black.
- **Title** (`public/art/bg/title.jpg`) → title/share card.

**Priority order:** SET A (battle backgrounds) first — it's the biggest transformation. Then B (home), C (summon), then D/E. Ping me when any land and I'll wire the swap + a gentle darken/scrim so the UI stays legible.
