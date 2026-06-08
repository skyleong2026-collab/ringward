#!/usr/bin/env node
// PixelLab generation scaffold for Ringward — LOCAL ONLY. Never imported by the game
// (a Vite app ships everything to the browser; an API key there would be public and
// could spend your credits). This script runs on your machine, reads the key from a
// GITIGNORED file, and is GUARDED so it cannot generate / spend a credit until you
// explicitly arm it with --go.
//
// Pipeline it serves: you lock ONE image per creature in Midjourney → this turns that
// single image into consistent pixel frames per state (idle/attack/hurt/…) → the frames
// drop into public/art/creatures/<id>/ and the in-game state machine plays them.
//
// API facts (api.pixellab.ai/v2): Bearer auth; async jobs (POST returns a job_id, poll
// GET /background-jobs/{id}); GET /balance is FREE (no generation) — used by --check.
//
// USAGE
//   node scripts/pixellab/pixellab.mjs --check
//       → verifies the key + prints remaining credits. Spends NOTHING.
//   node scripts/pixellab/pixellab.mjs --animate --image art/cinderpaw.png --action attack
//       → DRY RUN: prints the exact request it WOULD send. Spends NOTHING.
//   node scripts/pixellab/pixellab.mjs --animate --image art/cinderpaw.png --action attack --go
//       → ARMED: actually generates (spends credits). Only runs with --go.
//
// Get a token at https://api.pixellab.ai/mcp and put it in scripts/pixellab/.env
// (PIXELLAB_API_KEY=...). That file is gitignored — never commit it.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const BASE = 'https://api.pixellab.ai/v2';

// ── key: env var wins, else the gitignored .env beside this file. Never hardcoded. ──
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

function arg(name) { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? (process.argv[i + 1] || true) : null; }
const has = (name) => process.argv.includes(`--${name}`);
const ARMED = has('go'); // the ONLY thing that lets a generation request fire

function authHeaders(key) { return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }; }

// GET /balance — free, no generation. Confirms the key works.
async function checkBalance(key) {
  const res = await fetch(`${BASE}/balance`, { headers: authHeaders(key) });
  if (!res.ok) throw new Error(`balance check failed: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

// Poll an async job until the assets are ready.
async function awaitJob(key, jobId, { tries = 60, delayMs = 4000 } = {}) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(`${BASE}/background-jobs/${jobId}`, { headers: authHeaders(key) });
    const data = await res.json();
    const status = data.status || data.state;
    if (status === 'completed' || status === 'succeeded' || data.result || data.images) return data;
    if (status === 'failed' || status === 'error') throw new Error(`job ${jobId} failed: ${JSON.stringify(data)}`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`job ${jobId} did not finish in time`);
}

// Pull any image payloads (base64 or url) out of a job result, defensively — exact field
// names vary by endpoint; confirm against the first real --go response and tighten here.
async function saveAssets(jobData, outDir) {
  mkdirSync(outDir, { recursive: true });
  const blobs = [];
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string' && /^data:image|^https?:\/\/.+\.(png|gif|webp)/i.test(v)) blobs.push(v);
      else if (typeof v === 'string' && (k === 'base64' || k === 'image' || k === 'url')) blobs.push(v);
      else if (typeof v === 'object') walk(v);
    }
  };
  walk(jobData);
  let n = 0;
  for (const b of blobs) {
    const path = join(outDir, `frame_${String(n).padStart(2, '0')}.png`);
    if (b.startsWith('data:')) writeFileSync(path, Buffer.from(b.split(',')[1], 'base64'));
    else if (b.startsWith('http')) writeFileSync(path, Buffer.from(await (await fetch(b)).arrayBuffer()));
    else writeFileSync(path, Buffer.from(b, 'base64'));
    n++;
  }
  return n;
}

// Build the request for a state-animation from a locked character image.
function animateBody({ imagePath, action, size = 64 }) {
  const img = readFileSync(join(ROOT, imagePath));
  return {
    description: action, // e.g. "attack", "hurt", "idle breathing", "crouch struggling"
    image_size: { width: size, height: size },
    reference_image: { type: 'base64', base64: img.toString('base64') }, // the locked Midjourney art
  };
}

async function main() {
  const key = loadKey();
  console.log('— PixelLab scaffold —');
  console.log(key ? '✓ key found (env or scripts/pixellab/.env)' : '✗ no key — add PIXELLAB_API_KEY to scripts/pixellab/.env (or env). See README.');

  if (has('check')) {
    if (!key) process.exit(1);
    const bal = await checkBalance(key);
    console.log('✓ key works. Balance:', JSON.stringify(bal));
    return;
  }

  if (has('animate')) {
    const imagePath = arg('image'); const action = arg('action') || 'idle';
    const creature = arg('creature') || 'creature';
    if (!imagePath) { console.error('need --image <path-to-locked-art>'); process.exit(1); }
    const body = animateBody({ imagePath, action });
    if (!ARMED) {
      console.log('\nDRY RUN — no request sent, NO credits spent. Would POST /animate-with-text:');
      console.log(JSON.stringify({ ...body, reference_image: '<base64 of ' + imagePath + '>' }, null, 2));
      console.log('\nRe-run with --go to actually generate.');
      return;
    }
    if (!key) { console.error('armed but no key'); process.exit(1); }
    console.log(`ARMED — generating "${action}" for ${creature}… (this spends credits)`);
    const res = await fetch(`${BASE}/animate-with-text`, { method: 'POST', headers: authHeaders(key), body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`generate failed: HTTP ${res.status} ${await res.text()}`);
    const { id, job_id } = await res.json();
    const done = await awaitJob(key, id || job_id);
    const outDir = join(ROOT, 'public', 'art', 'creatures', creature, action);
    const count = await saveAssets(done, outDir);
    console.log(`✓ saved ${count} frame(s) → ${outDir}`);
    return;
  }

  console.log('\nNothing run. This scaffold spends nothing by default.');
  console.log('  --check                       verify the key (free)');
  console.log('  --animate --image <p> --action <a> [--creature <id>] [--go]');
  console.log('See scripts/pixellab/README.md.');
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
