# Creature art decisions — current picks (provisional)

The **current chosen look** per creature, captured 2026-06-08 from Midjourney. These are
*decisions for now* — the reference of record, not final, change freely. Each is the full-res
Midjourney PNG (generated from the prompts in `Ringward-Creature-Reference.xlsx`).

**Pipeline:** lock one image per creature here → feed it to PixelLab (`scripts/pixellab/`)
→ pixel state-frames → into the game. The single locked image is what kills Midjourney's
continuity problem (you never re-generate the character).

## Locked so far (downloaded, real PNG in this folder)

| Creature | Type | File | MJ job id | Note |
|---|---|---|---|---|
| **Cinderpaw** | Reactor | `cinderpaw.png` | `19b15d23` | Ash-grey cracked-stone cat, molten seams, heart-shaped fire core. Textbook. **First PixelLab test.** |
| **Stoneward** | Bulwark | `stoneward.png` | `d800245d` | Mossy granite wall-golem, glowing eyes. Solid, very pixel-friendly. |
| **Frostward** | Warden | `frostward.png` | `6d0d18b2` | Rime-coated blue golem, ice shards, bright blue core. Clear silhouette. |
| **Hexmoth** | Hexer | `hexmoth.png` | `8765cd31` | Violet moth, glowing eye-spots, golden heart-core. Elegant + readable. |

All four came straight from the spreadsheet prompts — the `--sref` style is already consistent
across them (one family). The glowing **core-heart** motif is showing up in all of them, which
is exactly the grunling identity.

## Direction decided, not yet downloaded (from the Liked review)

Strong picks exist in the Liked set; grab the chosen frame the same way (open → download):

| Creature | Type | Direction |
|---|---|---|
| Fizzpop | Reactor | the twiggy spark-imp (sparks leaking, over-bright core) |
| Glowtail | Reactor | the smouldering ember-lantern-tail variant |
| Ironwall | Bulwark | the gate/arch-shaped golem (matches lore exactly) |
| Mossback | Mender | the glowing green seed-blob (super readable) |
| Dewleaf | Mender | the little green fuzzball with a leaf |
| Rimecaller | Warden | the crystal-CROWNED ice golem (ceremonial) |
| Blightcap | Hexer | the mushroom-cap imp |
| Swiftpaw / Dartwing | Striker | the clean teal lizard-dragon / crested "CREST" bird turnarounds |
| Veilclaw | Assassin | the hooded "VEIL" figure — **use a SOLID-bodied version, not the smoke-wraith** |
| Shadefang | Assassin | re-roll for a solid silhouette (see prompt) |
| Buzzline / Tanglewing | Booster | **needs a dedicated pass** — the support/amplifier identity isn't nailed yet (see prompt) |

## Watch-outs for the pixel pipeline

- **Solid silhouette > atmosphere.** The wispy / smoky / thin-tendril picks look great big but
  turn to mud at sprite size. Favor solid-bodied variants for Assassin & the dark Hexers.
- **Keep one value/saturation range** across all 17 (same `--sref`) — a couple of picks drift
  brighter (teal dragons) or much darker (shadow ones).
- **Multi-pose / turnaround sheets are gold** for PixelLab — prioritize creatures you have those for.
