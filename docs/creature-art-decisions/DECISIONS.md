# Creature art decisions — current picks (provisional)

The **current chosen look** per creature, captured 2026-06-08 from Midjourney. These are
*decisions for now* — the reference of record, not final, change freely. Each is the full-res
Midjourney PNG (generated from the prompts in `Ringward-Creature-Reference.xlsx`).

**Pipeline:** lock one image per creature here → feed it to PixelLab (`scripts/pixellab/`)
→ pixel state-frames → into the game. The single locked image is what kills Midjourney's
continuity problem (you never re-generate the character).

## Downloaded — real full-res PNGs in this folder (14)

All came from your Liked set; most were generated from the spreadsheet prompts, so the
`--sref` style is consistent (one family) and the glowing **core-heart** motif runs through them.

| File | Type | Note |
|---|---|---|
| `cinderpaw.png` | Reactor | Ash-grey cracked-stone cat, molten seams, heart-shaped fire core. **First PixelLab test.** |
| `fizzpop.png` | Reactor | Jittery spark-imp, over-bright core. |
| `stoneward.png` | Bulwark | Mossy granite wall-golem. Solid, very pixel-friendly. |
| `ironwall.png` | Bulwark | Ancient riveted iron-and-stone sentinel (gate-like, on-lore). |
| `mossback.png` | Mender | Gentle mossy grunling, restorative green glow. |
| `dewleaf.png` | Mender | Delicate leaf-and-dew creature. |
| `frostward.png` (+ `frostward-alt.png`) | Warden | Rime-coated blue golem, ice shards, bright blue core. Two takes. |
| `hexmoth.png` (+ `hexmoth-alt.png`) | Hexer | Violet moth, glowing eye-spots, golden heart-core. Two takes. |
| `blightcap.png` | Hexer | Diseased mushroom-cap, sickly violet spores. |
| `veil-assassin.png` | Assassin | Your **"Veil"** concept — hooded, solid-bodied (good: not a smoke-wraith). |
| `crest-striker.png` | Striker | Your **"Crest"** concept — fast/momentum bird-dragon. |
| `hollow-elder.png` | Booster? | Your **"Hollow"** concept — ancient antlered elder. Tentative Booster/elder; revisit. |

**All 8 types now have at least one pick.** Complete: Bulwark, Mender, Hexer. 

## Still to do

- **Glowtail** (Reactor 3rd) and **Rimecaller** (Warden — the crystal-CROWNED ceremonial ice golem): pick frames not yet grabbed.
- **Booster** identity still soft — `hollow-elder` is a placeholder; run the dedicated Booster prompt.
- **A second Assassin** if wanted (Shadefang) — keep it solid-bodied.
- Confirm `veil`/`crest`/`hollow` (your own named concepts) map to the roles above, or tell me your intended names.

## Watch-outs for the pixel pipeline

- **Solid silhouette > atmosphere.** The wispy / smoky / thin-tendril picks look great big but
  turn to mud at sprite size. Favor solid-bodied variants for Assassin & the dark Hexers.
- **Keep one value/saturation range** across all 17 (same `--sref`) — a couple of picks drift
  brighter (teal dragons) or much darker (shadow ones).
- **Multi-pose / turnaround sheets are gold** for PixelLab — prioritize creatures you have those for.
