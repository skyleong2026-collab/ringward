# Ringward — Character & Gear Art Brief (Midjourney)

> **For the art instance (Sonnet):** generate these, then add them to the game files (see **Integration** at the bottom). Goal: replace the old shared sprites with **one unique painted creature per grunling (17)**, plus **gear/relic icons (20)**, all matching the painted **cutscene** style already in the game (`public/art/cutscene/`). Prompts are ready to run; tune freely.

## The look (style bible — append to EVERY prompt)

```
muted folk-mystery storybook illustration, painterly, dusk palette, glowing earthen core, cinematic, soft grain, single subject centered, simple dark atmospheric background, square composition, no text --ar 1:1
```

Matches the 5 opening cutscene frames (warm-but-melancholy, hand-painted, NOT slick sci-fi, NOT cartoon-mascot). Keep the whole set consistent so creatures, gear, and cutscenes read as one world.

## Species canon — what a "grunling" IS

Every creature is a **grunling**: a small being **grown from earth + old salvaged machine** — mossy stone, weathered bronze/iron, root and rock fused into a living body — with a **single glowing core set in its chest like a heart** (core colour = its Type colour). Small, soulful, a little worn. Rarity raises the craft: **Common** = scrappy/simple, **Rare** = refined, **Legendary** = striking/ornate, **Unique** = awe (rarest in the world).

---

# Part 1 — The 17 creatures

Grouped by home ring (outer→inner). Each: Type/role + rarity + what it DOES in combat + signature trait, then a ready prompt (append the style line where it says `[STYLE]`). Core colour per Type: Reactor=ember-orange, Bulwark=cyan, Mender=green, Booster=violet-spark, Striker=gold, Assassin=crimson-pink, Warden=ice-blue, Hexer=blight-purple.

## Ring 1 — Reactors (fire; charge up then blow up)

**fizzpop** · Common · hoards fire then releases it all at once.
```
a small round earthen-machine grunling, cracked stone body leaking orange firelight, an unstable bright ember-core in its chest, sparks fizzing off it, restless and scrappy, [STYLE]
```
**glowtail** · Rare · tail-light pulses brighter the longer a fight drags on.
```
a lizard-like earthen-machine grunling with a long tail tipped in a glowing lantern-core, warm amber firelight pulsing along its stone-and-bronze body, watchful, [STYLE]
```
**cinderpaw** · Legendary · walks on embers; whatever it touches smolders.
```
a four-legged cat-like earthen-machine grunling, paws glowing like hot coals leaving smouldering ember tracks, ash-grey stone hide veined with molten orange, fierce ember-core, ornate, [STYLE]
```

## Ring 2 — Bulwarks (shields; soak hits, guard the team)

**stoneward** · Common · a walking wall; siege engines broke against it.
```
a squat heavy grunling built of stacked stone slabs and old bronze plating, a calm steady cyan core, shield-like shell, immovable and patient, [STYLE]
```
**ironwall** · Rare · older than the blight; guards, never attacks, never falls.
```
a tall ancient sentinel grunling of weathered iron and stone, a great shield grown into one arm, a deep steady cyan core, solemn and unbreakable, [STYLE]
```

## Ring 3 — Menders (healing; outlast, keep the squad alive)

**mossback** · Common · where it sleeps, the wounded wake whole.
```
a gentle tortoise-like grunling, its back a small living garden of moss and tiny ferns, a soft warm green core, calm and kindly, [STYLE]
```
**dewleaf** · Rare · weeps a water that knits flesh; quick to flee.
```
a slender deer-like grunling of leaf, vine and pale wood beaded with glowing dew, a luminous green core, delicate and skittish, [STYLE]
```

## Ring 4 — Boosters (amp; make one ally hit far harder)

**buzzline** · Common · latches onto a stronger creature and doubles its blows.
```
a small wiry grunling wrapped in live copper wire and frayed cable, crackling violet sparks, an electric violet core, eager and twitchy, [STYLE]
```
**tanglewing** · Rare · hums a note that lifts a whole pack; never fights alone.
```
a winged grunling of taut wire and resonant bronze, wings shaped like a tuning fork, a humming violet core, mid-song, [STYLE]
```

## Ring 5 — Strikers (speed; many small fast hits)

**swiftpaw** · Rare · gone before you see it move; strikes a dozen times in a breath.
```
a lean greyhound-like earthen-machine grunling, streamlined stone-and-bronze body built for speed, faint blurred motion lines, a quick gold core, [STYLE]
```
**dartwing** · Legendary · always acts first; the fastest thing alive.
```
a sleek swallow-like grunling with swept-back bladed wings, taut and arrow-fast, a brilliant gold core, poised to dart, ornate, [STYLE]
```

## Ring 6 — Assassins (execute; hunt and finish the weak)

**shadefang** · Rare · hunts only the wounded; waits for the kill.
```
a low predatory grunling wrapped in shadow, dark slate body, long curved fangs of bone-and-bronze, a cold crimson-pink core, patient menace, [STYLE]
```
**veilclaw** · Legendary · the weaker you are, the harder it bites.
```
a sleek panther-like grunling half-dissolved into darkness, glinting claws, a piercing crimson core, deadly elegance, ornate, [STYLE]
```

## Ring 7 — Hexers (curse; make enemies take more from the whole squad)

**blightcap** · Legendary · armor rots and wounds refuse to close.
```
a fungal grunling crowned by a great rotted mushroom cap dripping luminous blight-spores, sickly green-violet body, a corrupted purple core, ominous, [STYLE]
```
**hexmoth** · Unique · its dust marks you; everything bites deeper after. (rarest — awe)
```
a large eerie moth-grunling, broad wings patterned with glowing curse-sigils shedding violet dust, a baleful purple core, otherworldly and beautiful, intricate, [STYLE]
```

## Ring 8 — Wardens (freeze; lock enemies out of their turns)

**frostwarden** · Legendary · a cold so total it stops a creature mid-step.
```
a tall frost-wreathed sentinel grunling, blue-white ice grown over old iron, breath of frost, a glacial pale-blue core, stern, [STYLE]
```
**rimecaller** · Unique · calls a stillness over a whole battlefield. (rarest, near the Drop — regal/awe)
```
a regal crystalline grunling robed in rime and frost-feathers, an aura of slowly falling snow stilling the air, a deep ice-blue core radiating silent cold, majestic and intricate, [STYLE]
```

---

# Part 2 — Gear / Relics (22 icons)

**Objects, not creatures** — small painted relic icons in the SAME style (painterly, dusk, glowing accents, simple dark background, square). Single clear silhouette (shown small). Rarity → ornateness + glow. Accent colour follows the effect (red=damage, green=heal, cyan=shield, gold=tempo, purple=curse/Drop).

## Common (plain, honest objects)
- **r_ironwood** — Ironwood Charm (+HP): `a charm of blight-hardened knotted heartwood bound in twine, faint warm glow`
- **r_quickcore** — Quick Core (+charge): `a small still-warm glowing core-shard, restless yellow light`
- **r_menderknot** — Mender's Knot (+heal): `a knotted green cord with a tiny living sprig, soft green glow`
- **r_stoneblood** — Stoneblood (+HP): `a smooth heavy bloodstone, dark with deep red veins`

## Rare (refined, a clear motif)
- **r_whetfang** — Whetstone Fang (+dmg): `a curved tooth filed to a razor edge mounted on a whetstone`
- **r_emberbrand** — Ember Brand (burn+dmg): `a smouldering branding-iron tip glowing orange, wisps of smoke`
- **r_bulwark** — Bulwark Stone (+HP/shield): `a carved shard of an old gate-stone, faint cyan rune`
- **r_reckless** — Reckless Charm (+dmg/−HP): `a cracked crimson talisman, red glow leaking from the crack`
- **r_ambush** — Ambusher's Edge (first-hit): `a coiled hooked blade in shadow, one gold glint on the edge`
- **r_frostbite** — Frostbite Charm (vs frozen): `a frost-rimed blue-crystal pendant, cold mist curling off`
- **r_wrathcore** — Wrathcore (+dmg/−heal): `a furious red-hot core clenched in iron, angry orange-red light`
- **r_surgeon** — Surgeon's Kit (+heal/−dmg): `a worn healer's kit of bound herbs and clean tools, gentle green glow`
- **r_bramble** — Bramble Hide (thorns): `a wrap of thorned green bramble, sharp barbs, faint defensive glow`
- **r_reservoir** — Reservoir Core (kill→charge): `a glass vial holding a swirling captured spark, coiled yellow lightning inside`

## Legendary (ornate, strong glow, run-defining)
- **r_phoenix** — Phoenix Feather (survive-lethal): `a single bright feather warm with ember-light, faint ash curling at its edges that never quite catches`
- **r_bloodpact** — Bloodpact (dmg+heal/−HP): `an ornate locket dripping one bead of glowing red, dark gold filigree`
- **r_glassedge** — Glass Edge (+dmg/−HP): `a translucent glass blade, impossibly sharp, hairline cracks, pale glow`
- **r_dropshard** — Drop-Shard (all-round): `a violet splinter of whatever fell at the Drop, humming with otherworldly light`
- **r_vampiric** — Vampiric Edge (lifesteal): `a dark fanged blade drinking a thread of glowing red light into itself`
- **r_totem** — Hunter's Totem (kill-ramp): `a carved bone-and-feather hunting totem, crimson eye-glow`
- **r_frenzy** — Frenzy Totem (dmg+charge): `a spinning ritual totem wreathed in gold sparks`
- **r_reaper** — Reaper's Mark (execute): `a pale sickle-mark sigil etched on dark stone, cold silver-white glow`

(For relics you can swap the style line's `single subject centered, simple dark atmospheric background` → `single object centered on a dark velvet background, item icon` if it helps.)

---

# Part 3 — Stretch (only after creatures + relics land)

- **8 ring/biome tiles** (the threshold cards): painted landscapes of each ring — rim embers → fallen gate → green seam → storm-wire → fast trails → lightless deep → witherfen → frostbound, warm→cold inward. `--ar 20:13` like the cutscenes.
- **8 boss portraits**: The Cinder Maw, The Gatebreaker, The Old Grove, The Live Wire, The Blur, The Throat-Cutter, The Blight-Heart, The Stillness — bigger, scarier grunlings.
- **Holdfast** home illustration (the lit-window home that reclaims as you climb).

---

# Integration (how to add them to the game)

**Creatures (the main job):**
1. Save each as **`public/sprites/<creatureId>.<ext>`** — e.g. `public/sprites/fizzpop.jpg`, `glowtail.jpg`, … (the 17 ids in Part 1).
2. In **`src/engine/combat/roster.js`**, change each creature's `spriteId` to its **own id** (they currently SHARE old sprite ids like `spark`/`flicker`/`vault`). E.g. `fizzpop: { …, spriteId: 'fizzpop' }`. Do this in the same change that adds the files so nothing 404s.
3. The `Sprite` component (`src/screens/SeamLab.jsx`) loads `/sprites/${spriteId}.png` into a square tile with a coloured glow border (it crops `backgroundSize: auto 122%`, focal `FOCAL_X[spriteId]`, default 0.04). So: **center the creature, square framing, fills ~80% of frame, simple background** so it reads at ~64px. Tune `FOCAL_X` per sprite if a creature sits off-center. NOTE the component currently hard-codes `.png` — if you deliver JPEGs, update that line to `.jpg` (or keep PNG).
4. Old shared sprites in `public/sprites/` (spark, flicker, cinder, vault, bastion, link, nexus, conduit, striker, fang, claw) can be removed once every creature points at its own new file.

**Relics (gear):**
- Save as **`public/art/relics/<relicId>.<ext>`** (the ids in Part 2, e.g. `r_whetfang`).
- In `src/screens/SeamLab.jsx`, each relic in the `RELICS` array has an `icon` (emoji). Add an optional `img: '/art/relics/<id>.png'` field and render `<img>` when present (fallback to the emoji) in the three spots relics show: the home RELICS panel, the won-screen choice/reveal, and the Vault overlay. (main-Claude can do this wiring if you prefer to just deliver files.)

**Technical / file size (IMPORTANT):**
- Square, ~**512×512**. **Optimize before committing** — the cutscene frames were downscaled to ~760px JPEG q82 (~100KB each); do the same here: `sips -Z 512 -s format jpeg -s formatOptions 82 in.png --out out.jpg`. 17 creatures + 20 relics at full PNG res would bloat the repo + first-load; keep each well under ~150KB.
- Coordinate on a branch (`claude/art-creatures-XXXX`) and let main-Claude verify (build + that each sprite loads) before merging to main → Vercel.

**Source data to pull from (all in the repo):** `src/engine/combat/roster.js` (the 17 creatures + stats), `src/screens/SeamLab.jsx` → `TYPE_INFO` (Type roles), `CREATURE_LORE` (the rumours used above), `RARITY_OF` (rarities), `RELICS` (the 20 relics + effects).
