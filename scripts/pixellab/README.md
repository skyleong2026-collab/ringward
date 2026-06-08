# PixelLab generation — local art pipeline (set up, not yet used)

Turns a **single locked Midjourney image** per creature into **consistent pixel frames
per state** (idle / attack / hurt / …), which drop into the game and the in-engine state
machine plays. This is the bridge between your Midjourney → PixelLab → game pipeline.

## Safety (read once)

- **The API key is a money-spending secret.** It must never go in the game's code — this
  is a Vite app, so anything in it ships to every player's browser. This script is
  **local-only** and reads the key from a **gitignored** file. Never `import` it from `src/`.
- This script **spends nothing by default.** It only generates when you pass `--go`.

## Setup

1. Get a token: https://api.pixellab.ai/mcp
2. `cp scripts/pixellab/.env.example scripts/pixellab/.env` and paste your token:
   `PIXELLAB_API_KEY=sk_...`
3. Verify it works (free — `GET /balance`, no generation):
   ```
   node scripts/pixellab/pixellab.mjs --check
   ```

## Generate (when you have a locked image)

Dry run first — prints the exact request, **spends nothing**:
```
node scripts/pixellab/pixellab.mjs --animate --creature cinderpaw \
  --image art/cinderpaw-locked.png --action attack
```
Add `--go` to actually generate (this spends credits):
```
node scripts/pixellab/pixellab.mjs --animate --creature cinderpaw \
  --image art/cinderpaw-locked.png --action attack --go
```
Frames land in `public/art/creatures/cinderpaw/attack/`.

Repeat per state (idle, attack, hurt, low, …) per creature. Then I wire the playback so
each in-game state plays its frames (the `#spritelab` state machine is already the shape).

## Notes / to confirm on first real run

- Endpoints used: `GET /balance`, `POST /animate-with-text`, poll `GET /background-jobs/{id}`.
  (PixelLab also has `create-character-v3`, `generate-8-rotations-v3`, `animate-with-skeleton`,
  `estimate-skeleton` — easy to add.)
- The exact field names in the job *response* (url vs base64) vary per endpoint; `saveAssets()`
  walks the response defensively. Confirm against the first `--go` result and tighten if needed.
- Alternatives if the raw script is fussy: the official **pixellab-js** npm SDK or the
  **PixelLab MCP server** (`pixellab-code/pixellab-mcp`) both handle polling/response shape.

## Cost

Free tier = 15 generations. Paid $8 / $24 / $50 a month, or pay-per-credit. `--check` shows
your balance. Budget one creature first, judge it, then scale to the roster.
