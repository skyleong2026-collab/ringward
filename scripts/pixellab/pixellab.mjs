#!/usr/bin/env node
// PixelLab art pipeline for Ringward — LOCAL ONLY. Never imported by the game.
// (Vite ships everything in src/ to browsers; an API key there spends your credits.)
//
// SAFETY RULES (each paid for in debugging):
//   • imageObject() returns RAW base64 — no data: URI prefix (→ 500 error if prefixed)
//   • v3 is ASYNC: POST returns job_id, poll GET /background-jobs/{id}. NEVER resubmit
//     on timeout — you get charged twice. Save the job_id and wait.
//   • pixflux is SYNC but SLOW: ~73s text-only, >180s with init_image. Uses 300s timeout.
//     Returns {image} (singular raw base64), not an array.
//   • Caps are 422s: v3 max 256px, pixflux max 400px, init_image_strength integer 1–999,
//     frame_count ≥ 4. Probe unknowns by sending out-of-bounds and reading the 422.
//   • All generation is guarded behind --go. Without it, everything dry-runs.
//
// USAGE
//   node scripts/pixellab/pixellab.mjs --check
//       → GET /balance, free, confirms key works.
//
//   node scripts/pixellab/pixellab.mjs --v3 --creature cinderpaw --action idle [--go]
//       → animate-with-text-v3: keeps the painterly Midjourney look, adds motion.
//         Output: public/art/creatures/cinderpaw/idle_v3/frame_NN.png
//
//   node scripts/pixellab/pixellab.mjs --pixflux --creature cinderpaw --strength 450 [--go]
//       → create-image-pixflux + init_image: REDRAWS as crisp pixel art.
//         Tune strength 300–600 for crisp redraw. Output: idle_pixel/frame_00.png
//
//   node scripts/pixellab/pixellab.mjs --evolve --creature cinderpaw --strength 180 [--go]
//       → pixflux at low strength (120–250): same species, evolved fiercer form.
//         Output: public/art/creatures/cinderpaw/evolved/frame_00.png
//
// KEY: scripts/pixellab/.env  →  PIXELLAB_API_KEY=sk_...  (gitignored, never committed)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const BASE = 'https://api.pixellab.ai/v2';

// ── Key: env var wins, else the gitignored .env beside this file. ──────────────
function loadKey() {
  if (process.env.PIXELLAB_API_KEY) return process.env.PIXELLAB_API_KEY.trim();
  const envPath = join(HERE, '.env');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*PIXELLAB_API_KEY\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, '').trim();
    }
  }
  return null;
}

// ── CLI helpers ─────────────────────────────────────────────────────────────────
function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] || true) : null;
}
const has = (name) => process.argv.includes(`--${name}`);
const ARMED = has('go');

function authHeaders(key) {
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

// ── imageObject: RAW base64 — never a data: URI (→ 500 on the API) ─────────────
function imageObject(imgPath) {
  const abs = imgPath.startsWith('/') ? imgPath : join(ROOT, imgPath);
  if (!existsSync(abs)) throw new Error(`image not found: ${abs}`);
  const buf = readFileSync(abs);
  return { type: 'base64', base64: buf.toString('base64') }; // no "data:image/..." prefix
}

// ── Find the locked source sprite for a creature ────────────────────────────────
// Tries <creature>.jpg then <creature>.png in public/sprites/
function sourceSprite(creature) {
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
    const p = join(ROOT, 'public', 'sprites', creature + ext);
    if (existsSync(p)) return p;
  }
  throw new Error(`no source sprite for "${creature}" in public/sprites/ — expected ${creature}.jpg or .png`);
}

// ── Action → generation prompt ──────────────────────────────────────────────────
const ACTION_PROMPTS = {
  idle:   'creature breathing gently, subtle idle sway, relaxed stance, looping',
  attack: 'creature lunging forward in aggressive attack, striking hard, explosive motion',
  hurt:   'creature recoiling from a hit, flinching back and shaking, pain reaction',
  death:  'creature collapsing and falling over, defeated, slow collapse to ground',
};

function actionPrompt(action) {
  return ACTION_PROMPTS[action] ?? action;
}

// ── GET /balance — free, no generation ──────────────────────────────────────────
async function checkBalance(key) {
  const res = await fetch(`${BASE}/balance`, { headers: authHeaders(key) });
  if (!res.ok) throw new Error(`balance check failed: HTTP ${res.status}\n${await res.text()}`);
  return res.json();
}

// ── Poll an async job (v3) — never resubmit on timeout ──────────────────────────
// If it times out, the job is still running. Print the job_id and exit so the
// user can resume with --resume-job <id> (below).
async function awaitJob(key, jobId, { maxMinutes = 10 } = {}) {
  const tries = maxMinutes * 15; // poll every 4s
  console.log(`  polling job ${jobId} (up to ${maxMinutes} min) …`);
  for (let i = 0; i < tries; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    const res = await fetch(`${BASE}/background-jobs/${jobId}`, { headers: authHeaders(key) });
    const data = await res.json();
    const status = data.status ?? data.state;
    const dot = i % 15 === 0 ? `  ${Math.round((i * 4) / 60)}m elapsed` : '.';
    process.stdout.write(dot);
    if (status === 'completed' || status === 'succeeded' || data.result || data.images) {
      console.log('\n  ✓ job complete');
      return data;
    }
    if (status === 'failed' || status === 'error') {
      throw new Error(`job ${jobId} failed:\n${JSON.stringify(data, null, 2)}`);
    }
  }
  console.log();
  throw new Error(
    `job ${jobId} still running after ${maxMinutes} min — DO NOT resubmit (double charge).\n` +
    `Resume it with:  node scripts/pixellab/pixellab.mjs --resume-job ${jobId}`
  );
}

// ── Save frames from a job result or pixflux response ───────────────────────────
// Handles both {images:[{base64:...}]} (v3) and {image:"<raw base64>"} (pixflux).
async function saveFrames(data, outDir) {
  mkdirSync(outDir, { recursive: true });
  const blobs = [];

  // v3 result shape: data.result.images or data.images (array of {base64} or {url})
  const imgArray = data?.result?.images ?? data?.images;
  if (Array.isArray(imgArray)) {
    for (const item of imgArray) {
      if (item?.base64) blobs.push(item.base64);
      else if (item?.url) {
        const r = await fetch(item.url);
        blobs.push(Buffer.from(await r.arrayBuffer()).toString('base64'));
      }
    }
  }

  // pixflux result shape: data.image (singular raw base64)
  if (data?.image && blobs.length === 0) {
    blobs.push(data.image);
  }

  // Defensive walk for anything unexpected
  if (blobs.length === 0) {
    const walk = (o) => {
      if (!o || typeof o !== 'object') return;
      for (const [k, v] of Object.entries(o)) {
        if (typeof v === 'string' && (k === 'base64' || k === 'image' || k === 'url')) blobs.push(v);
        else if (typeof v === 'object') walk(v);
      }
    };
    walk(data);
  }

  let n = 0;
  for (const b of blobs) {
    const path = join(outDir, `frame_${String(n).padStart(2, '0')}.png`);
    if (b.startsWith('http')) {
      const r = await fetch(b);
      writeFileSync(path, Buffer.from(await r.arrayBuffer()));
    } else {
      const raw = b.includes(',') ? b.split(',')[1] : b; // strip data: URI if present
      writeFileSync(path, Buffer.from(raw, 'base64'));
    }
    n++;
  }
  return n;
}

// ── --v3: animate-with-text-v3 — keeps painterly look, adds motion ──────────────
async function runV3(key, { creature, action, size, frames, variant }) {
  size = Math.min(parseInt(size, 10) || 256, 256); // hard cap 256
  frames = Math.max(parseInt(frames, 10) || 8, 4);  // frame_count ≥ 4
  const spritePath = sourceSprite(creature);
  const outDir = join(ROOT, 'public', 'art', 'creatures', creature, `${action}_${variant}`);
  const body = {
    description: actionPrompt(action),
    image_size: { width: size, height: size },
    reference_image: imageObject(spritePath),
    frame_count: frames,
  };

  if (!ARMED) {
    console.log('\nDRY RUN — no request sent, no credits spent.\nWould POST /animate-with-text-v3:');
    console.log(JSON.stringify({ ...body, reference_image: `<base64 of ${spritePath}>` }, null, 2));
    console.log(`\nOutput dir: ${outDir}`);
    console.log('Add --go to actually generate.');
    return;
  }

  console.log(`ARMED — POSTing /animate-with-text-v3 (${size}px × ${frames} frames, "${action}") …`);
  const res = await fetch(`${BASE}/animate-with-text-v3`, {
    method: 'POST',
    headers: authHeaders(key),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`v3 request failed: HTTP ${res.status}\n${err}`);
  }
  const { id, job_id } = await res.json();
  const done = await awaitJob(key, id ?? job_id);
  const count = await saveFrames(done, outDir);
  console.log(`✓ saved ${count} frame(s) → ${outDir}`);
}

// ── --resume-job: resume polling a v3 job by id ─────────────────────────────────
async function runResumeJob(key, { jobId, creature, action, variant }) {
  if (!ARMED) {
    console.log(`DRY RUN: would poll job ${jobId} and save to ${creature}/${action}_${variant}/`);
    return;
  }
  console.log(`Resuming poll for job ${jobId} …`);
  const done = await awaitJob(key, jobId, { maxMinutes: 15 });
  const outDir = join(ROOT, 'public', 'art', 'creatures', creature, `${action}_${variant}`);
  const count = await saveFrames(done, outDir);
  console.log(`✓ saved ${count} frame(s) → ${outDir}`);
}

// ── --pixflux: create-image-pixflux — REDRAWS as crisp pixel art ─────────────────
// Strength 300–600: rewrites substantially while keeping creature identity.
// Lower strength = more faithful, higher = more creative redraw.
async function runPixflux(key, { creature, action, size, strength, variant, palette }) {
  size = Math.min(parseInt(size, 10) || 128, 400); // hard cap 400
  strength = Math.min(Math.max(parseInt(strength, 10) || 450, 1), 999); // integer 1–999
  const spritePath = sourceSprite(creature);
  const outDir = join(ROOT, 'public', 'art', 'creatures', creature, `${action}_${variant}`);

  const body = {
    description: `pixel art game sprite, crisp pixel art style, limited color palette, retro game creature, ${actionPrompt(action)}`,
    init_image: imageObject(spritePath),
    init_image_strength: strength,
    image_size: { width: size, height: size },
  };
  if (palette) {
    // palette is a comma-separated list of hex colors e.g. "#ff2244,#441122,#000000"
    body.palette = palette.split(',').map((c) => c.trim());
  }

  if (!ARMED) {
    console.log('\nDRY RUN — no request sent, no credits spent.\nWould POST /create-image-pixflux:');
    console.log(JSON.stringify({ ...body, init_image: `<base64 of ${spritePath}>` }, null, 2));
    console.log(`\nOutput dir: ${outDir}`);
    console.log('NOTE: pixflux with init_image takes >180s — use --go and be patient (300s timeout).');
    console.log('Add --go to actually generate.');
    return;
  }

  console.log(`ARMED — POSTing /create-image-pixflux (${size}px, strength=${strength}) …`);
  console.log('  This takes 2–5 minutes. Do not interrupt or resubmit.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 330_000); // 330s = 5.5 min
  let res;
  try {
    res = await fetch(`${BASE}/create-image-pixflux`, {
      method: 'POST',
      headers: authHeaders(key),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    throw new Error(`pixflux fetch failed: ${e.message}`);
  }
  clearTimeout(timer);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`pixflux request failed: HTTP ${res.status}\n${err}`);
  }
  const data = await res.json();
  const count = await saveFrames(data, outDir);
  console.log(`✓ saved ${count} image(s) → ${outDir}`);
}

// ── --evolve: pixflux at low strength — related-but-evolved creature form ────────
// Strength 120–250: gives PL enough freedom to evolve the creature while keeping
// the species identity (like Charmander→Charizard: recognizably related, fiercer).
async function runEvolve(key, { creature, size, strength }) {
  size = Math.min(parseInt(size, 10) || 256, 400);
  strength = Math.min(Math.max(parseInt(strength, 10) || 180, 1), 999);
  const spritePath = sourceSprite(creature);
  const outDir = join(ROOT, 'public', 'art', 'creatures', creature, 'evolved');

  const body = {
    description: `evolved form of this creature, bigger, fiercer, more powerful and imposing, same species identity but grown and dangerous, dramatic evolved design`,
    init_image: imageObject(spritePath),
    init_image_strength: strength,
    image_size: { width: size, height: size },
  };

  if (!ARMED) {
    console.log('\nDRY RUN — no request sent, no credits spent.\nWould POST /create-image-pixflux (evolve):');
    console.log(JSON.stringify({ ...body, init_image: `<base64 of ${spritePath}>` }, null, 2));
    console.log(`\nOutput dir: ${outDir}`);
    console.log(`strength=${strength}: ${strength < 200 ? 'low → more creative freedom (good for evolution)' : 'medium → closer to original'}`);
    console.log('Add --go to actually generate. ~3 min wait with init_image.');
    return;
  }

  console.log(`ARMED — evolving ${creature} (strength=${strength}, ${size}px) …`);
  console.log('  This takes 2–5 minutes.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 330_000);
  let res;
  try {
    res = await fetch(`${BASE}/create-image-pixflux`, {
      method: 'POST',
      headers: authHeaders(key),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    throw new Error(`evolve fetch failed: ${e.message}`);
  }
  clearTimeout(timer);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`evolve request failed: HTTP ${res.status}\n${err}`);
  }
  const data = await res.json();
  const count = await saveFrames(data, outDir);
  console.log(`✓ saved ${count} evolved image(s) → ${outDir}`);
}

// ── main ─────────────────────────────────────────────────────────────────────────
async function main() {
  const key = loadKey();
  console.log('— PixelLab pipeline —');
  console.log(key
    ? '✓ key found'
    : '✗ no key — add PIXELLAB_API_KEY=sk_... to scripts/pixellab/.env and re-run.\n  (gitignored; never commit it)');

  // --check: GET /balance, free
  if (has('check')) {
    if (!key) process.exit(1);
    const bal = await checkBalance(key);
    console.log('✓ key works. Balance:', JSON.stringify(bal, null, 2));
    return;
  }

  const creature = arg('creature') || 'cinderpaw';
  const action   = arg('action')   || 'idle';
  const size     = arg('size')     || null;
  const frames   = arg('frames')   || '8';
  const strength = arg('strength') || null;
  const variant  = arg('variant')  || (has('pixflux') || has('evolve') ? 'pixel' : 'v3');
  const palette  = arg('palette')  || null;

  // --v3: animate-with-text-v3 (painterly look, multiple frames, async)
  if (has('v3')) {
    if (ARMED && !key) { console.error('armed but no key'); process.exit(1); }
    await runV3(key, { creature, action, size, frames, variant: 'v3' });
    return;
  }

  // --pixflux: create-image-pixflux (crisp pixel art redraw, slow)
  if (has('pixflux')) {
    if (ARMED && !key) { console.error('armed but no key'); process.exit(1); }
    await runPixflux(key, { creature, action, size, strength: strength || '450', variant: 'pixel', palette });
    return;
  }

  // --evolve: pixflux at low strength (evolution mechanic)
  if (has('evolve')) {
    if (ARMED && !key) { console.error('armed but no key'); process.exit(1); }
    await runEvolve(key, { creature, size, strength: strength || '180' });
    return;
  }

  // --resume-job <id>: resume polling a v3 job without resubmitting
  if (has('resume-job')) {
    const jobId = arg('resume-job');
    if (!jobId || jobId === true) { console.error('need --resume-job <job_id>'); process.exit(1); }
    if (ARMED && !key) { console.error('armed but no key'); process.exit(1); }
    await runResumeJob(key, { jobId, creature, action, variant });
    return;
  }

  // Legacy --animate (backward compat)
  if (has('animate')) {
    console.log('Use --v3 instead of --animate (this scaffold upgraded to v3 endpoint).');
    await runV3(key, { creature, action, size: size || '256', frames: '8', variant: 'v3' });
    return;
  }

  console.log('\nNothing run. Commands:');
  console.log('  --check                                   verify key (free)');
  console.log('  --v3 --creature <id> --action <action>    painterly animation frames (async)');
  console.log('  --pixflux --creature <id> [--strength N]  crisp pixel art redraw (slow, ~3 min)');
  console.log('  --evolve --creature <id> [--strength N]   evolved fiercer form');
  console.log('  --resume-job <id>                         resume polling a timed-out v3 job');
  console.log('\nOptions: --size N  --frames N  --variant <name>  --palette "#hex1,#hex2,..."');
  console.log('Add --go to actually spend credits. Dry-run by default.\n');
  console.log('Actions: idle | attack | hurt | death');
  console.log('Creatures: any filename in public/sprites/ without extension');
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
