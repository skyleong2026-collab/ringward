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

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// Roster + attack-VFX spec drive the batch — plain data, no secrets (safe to read
// here; the WARNING in README is about never importing THIS script FROM src/).
import { COMBAT_ROSTER } from '../../src/engine/combat/roster.js';
import { CREATURE_VFX } from '../../src/data/attackVfx.js';

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

// ── Batch config ────────────────────────────────────────────────────────────
// The per-state frames PixelLab generates from each locked image. These map to the
// in-engine animation states (AnimationPlayer: idle / attack / damaged / defeated;
// SeamLab plays the same shapes). Override per run with --states a,b,c.
const DEFAULT_STATES = ['idle', 'attack', 'hurt', 'defeated'];

// A richer text prompt per state than the bare word — sharper frames. The attack
// state additionally borrows the creature's VFX signature so the motion matches the
// look defined in docs/ATTACK-VFX-SIGNATURES.md.
const STATE_PROMPT = {
  idle: 'idle breathing, gentle bob, front-facing',
  attack: 'attacking lunge forward, mid-strike',
  hurt: 'recoiling, hit and flinching back',
  defeated: 'collapsing, defeated, slumping down',
};

// Where each creature's LOCKED reference art lives. Default: the staged in-game pick
// public/sprites/<spriteId>.jpg (consistently named, exists for all 17). Point an
// entry at a higher-res locked PNG (e.g. docs/creature-art-decisions/<x>.png) to use
// that instead — the single locked image is what kills Midjourney's continuity drift.
const LOCKED_OVERRIDE = {
  // cinderpaw: 'docs/creature-art-decisions/cinderpaw.png',  // example: full-res PNG
};

function lockedImageFor(c) {
  if (LOCKED_OVERRIDE[c.id]) return LOCKED_OVERRIDE[c.id];
  const sprite = `public/sprites/${c.spriteId || c.id}.jpg`;
  return existsSync(join(ROOT, sprite)) ? sprite : null;
}

function hasFrames(creature, state) {
  const dir = join(ROOT, 'public', 'art', 'creatures', creature, state);
  return existsSync(dir) && readdirSync(dir).some((f) => /\.(png|gif|webp)$/i.test(f));
}

// Drive the whole roster (or --only a,b) × states through the same animate path as
// the single --animate command. Resumable (skips states already generated) and
// budget-guarded: counts generations, honours --max N, and only spends with --go.
async function runBatch(key) {
  const onlyArg = arg('only');
  const only = onlyArg ? String(onlyArg).split(',').map((s) => s.trim()) : null;
  const states = arg('states') ? String(arg('states')).split(',').map((s) => s.trim()) : DEFAULT_STATES;
  const size = Number(arg('size')) || 64;
  const max = arg('max') ? Number(arg('max')) : Infinity; // cap generations this run (free tier = 15)
  const force = has('force'); // re-generate states that already have frames

  const roster = COMBAT_ROSTER.filter((c) => !only || only.includes(c.id));
  if (!roster.length) { console.error(`no creatures matched --only ${onlyArg}`); process.exit(1); }

  console.log(`\n— BATCH — ${roster.length} creature(s) × ${states.length} state(s) [${states.join(', ')}] @ ${size}px`);
  console.log(ARMED ? '⚠ ARMED (--go): this WILL spend credits.' : 'DRY RUN: prints what it would do, spends NOTHING. Add --go to generate.');
  if (max !== Infinity) console.log(`Capped at ${max} generation(s) this run.`);

  let planned = 0, generated = 0, skipped = 0, missing = 0;
  for (const c of roster) {
    const sig = CREATURE_VFX[c.id]?.signature;
    const locked = lockedImageFor(c);
    console.log(`\n${c.name} (${c.id} · ${c.type})${sig ? '\n  ↳ ' + sig : ''}`);
    if (!locked) { console.log('  ✗ no locked image — set LOCKED_OVERRIDE or add public/sprites/' + (c.spriteId || c.id) + '.jpg'); missing++; continue; }
    console.log(`  locked: ${locked}`);
    for (const state of states) {
      if (!force && hasFrames(c.id, state)) { console.log(`  · ${state}: already has frames — skip (—force to redo)`); skipped++; continue; }
      if (planned >= max) { console.log(`  · ${state}: at --max cap — stop`); continue; }
      planned++;
      const body = animateBody({ imagePath: locked, action: STATE_PROMPT[state] || state, size });
      if (!ARMED) { console.log(`  · ${state}: would POST /animate-with-text (desc: "${body.description}")`); continue; }
      if (!key) { console.error('armed but no key'); process.exit(1); }
      process.stdout.write(`  · ${state}: generating… `);
      const res = await fetch(`${BASE}/animate-with-text`, { method: 'POST', headers: authHeaders(key), body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`generate failed for ${c.id}/${state}: HTTP ${res.status} ${await res.text()}`);
      const { id, job_id } = await res.json();
      const done = await awaitJob(key, id || job_id);
      const outDir = join(ROOT, 'public', 'art', 'creatures', c.id, state);
      const count = await saveAssets(done, outDir);
      generated++;
      console.log(`✓ ${count} frame(s) → public/art/creatures/${c.id}/${state}/`);
    }
  }
  console.log(`\n— summary — ${ARMED ? `generated ${generated}` : `${planned} would generate`}, skipped ${skipped} existing${missing ? `, ${missing} missing-locked` : ''}.`);
  if (!ARMED && planned) console.log(`Free tier = 15 generations. Pilot first:  node scripts/pixellab/pixellab.mjs --batch --only cinderpaw --go`);
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

  if (has('batch')) {
    if (ARMED && !key) { console.error('armed but no key — add PIXELLAB_API_KEY'); process.exit(1); }
    await runBatch(key);
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
  console.log('  --batch [--only a,b] [--states idle,attack,hurt,defeated] [--size 64] [--max N] [--force] [--go]');
  console.log('                                whole roster × states from the spec; dry-run by default');
  console.log('See scripts/pixellab/README.md.');
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
