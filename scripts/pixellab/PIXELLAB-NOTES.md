# PixelLab Pipeline — Authoritative Notes

Production-tested facts about api.pixellab.ai/v2. Each rule here was paid for in debugging.

## API Facts

- **Auth:** `Authorization: Bearer sk_...`
- **Base URL:** `https://api.pixellab.ai/v2`
- **Balance check:** `GET /balance` — FREE, no generation, use for key verification

## Two Distinct Pipelines

### 1. animate-with-text-v3 (keeps the painterly look)

- `POST /animate-with-text-v3`
- **Async job:** returns `{job_id}`. Poll `GET /background-jobs/{job_id}`.
- **NEVER resubmit on timeout** — you get charged twice. Save the job_id and resume.
- Returns `{images: [{base64: "..."}]}` — array of frames.
- Max size: **256×256**. Hard 422 above that.
- `frame_count` **≥ 4**. Hard 422 below.
- Best for: keeping the Midjourney painterly look while adding motion.
- ~30–60s typical.

### 2. create-image-pixflux (redraws as pixel art)

- `POST /create-image-pixflux`
- **SYNC** — not a background job, just a slow fetch.
- **Use 300s timeout** (AbortController). Takes 73s text-only, **>180s with init_image**.
- Returns `{image: "<raw base64>"}` — single image, not an array.
- Max size: **400×400**. Hard 422 above.
- `init_image_strength` **integer 1–999** (not float). Hard 422 if float or out of range.
- With `init_image`: uses source art as reference, strength controls fidelity.
  - **300–600**: rewrites substantially → crisp pixel art, loses painterly look
  - **120–250**: low fidelity → creative freedom (good for evolution mechanic)
  - **700–900**: very faithful → subtle style transfer
- Optional `palette`: array of hex strings to force color constraints.
- Best for: converting paintings to crisp pixel art OR generating evolved creature forms.

## imageObject() — Raw Base64 Only

```js
// CORRECT: raw base64, no prefix
{ type: 'base64', base64: buf.toString('base64') }

// WRONG — causes 500:
{ type: 'base64', base64: 'data:image/jpeg;base64,' + buf.toString('base64') }
```

## Output Paths

All output is **git-untracked** (see .gitignore):
```
public/art/creatures/<creature>/<action>_<variant>/frame_NN.png
```

Variants:
- `idle_v3`, `attack_v3`, `hurt_v3`, `death_v3` — painterly animated (animate-with-text-v3)
- `idle_pixel`, `attack_pixel`, etc. — crisp pixel art (pixflux, single frame per action state)
- `evolved` — evolved form (pixflux low-strength)

## Source Sprites

Locked Midjourney paintings in `public/sprites/<creature>.jpg`:
```
cinderpaw  hexmoth  frostwarden  buzzline  tanglewing  dartwing
swiftpaw   shadefang  veilclaw   fizzpop   glowtail   rimecaller
blightcap  mossback   stoneward  ironwall  dewleaf
```

## CLI Commands

```sh
# Verify key (free)
unset PIXELLAB_API_KEY
node scripts/pixellab/pixellab.mjs --check

# Always dry-run first, then add --go
node scripts/pixellab/pixellab.mjs --v3 --creature cinderpaw --action idle
node scripts/pixellab/pixellab.mjs --v3 --creature cinderpaw --action idle --go

node scripts/pixellab/pixellab.mjs --pixflux --creature cinderpaw --strength 450
node scripts/pixellab/pixellab.mjs --pixflux --creature cinderpaw --strength 450 --go

node scripts/pixellab/pixellab.mjs --evolve --creature cinderpaw --strength 180
node scripts/pixellab/pixellab.mjs --evolve --creature cinderpaw --strength 180 --go

# If v3 job times out, DON'T resubmit — resume the existing job:
node scripts/pixellab/pixellab.mjs --resume-job <job_id> --creature cinderpaw --action idle --go
```

## Budget

- Account is **Tier 1**: ~2,000 images/month
- `--check` is always free
- v3: ~1 credit per generation call (8 frames = 1 call)
- pixflux: ~1 credit per call (1 frame per call)
- **Always dry-run before `--go`**

## Tuning Guide: Task 1 — Nail the Crisp-Pixel Look

Run pixflux at three strengths on cinderpaw idle, then make a contact sheet:
```sh
node scripts/pixellab/pixellab.mjs --pixflux --creature cinderpaw --strength 300 --variant s300 --go
node scripts/pixellab/pixellab.mjs --pixflux --creature cinderpaw --strength 450 --variant s450 --go
node scripts/pixellab/pixellab.mjs --pixflux --creature cinderpaw --strength 600 --variant s600 --go
node scripts/pixellab/contact-sheet.mjs
```

Then show Sky the contact sheet (open `public/art/creatures/contact-sheet.html` in browser, screenshot for iPad).

## Tuning Guide: Task 2 — Evolution Mechanic

Low strength = creative freedom. Start at 180, compare with 250:
```sh
node scripts/pixellab/pixellab.mjs --evolve --creature cinderpaw --strength 150 --go
node scripts/pixellab/pixellab.mjs --evolve --creature cinderpaw --strength 220 --go
```

PL should produce a recognizably-same-species creature that's bigger/fiercer.

## In-Game Wiring

- `src/components/FramePlayer.jsx` — probes and cycles frame sequences
- `src/screens/PixelAnimLab.jsx` — test screen at `/#pixelanim`
- `src/components/AnimationPlayer.jsx` — existing CSS-animation player (static sprites)

Once a look is picked (Task 1), generate full kits (4 actions × 17 creatures = 68 calls for v3,
or 1 pixflux per action state + 1 animated via v3 from the pixel master).
