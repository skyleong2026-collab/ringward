#!/usr/bin/env node
// Generates a static HTML contact-sheet from public/art/creatures/ frame directories.
// Open in a browser and screenshot/print for iPad review.
//
// USAGE
//   node scripts/pixellab/contact-sheet.mjs
//   → writes public/art/creatures/contact-sheet.html
//   → open that file in a browser (file:// is fine), screenshot for iPad
//
// Shows each creature's source sprite alongside its v3 (painterly) and pixel frames.
// Frames are embedded as base64 so the HTML is self-contained (works offline, on iPad).

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const ART  = join(ROOT, 'public', 'art', 'creatures');
const SPRITES = join(ROOT, 'public', 'sprites');

const CREATURES = [
  'cinderpaw', 'hexmoth', 'frostwarden', 'buzzline', 'tanglewing',
  'dartwing', 'swiftpaw', 'shadefang', 'veilclaw', 'fizzpop',
  'glowtail', 'rimecaller', 'blightcap', 'mossback', 'stoneward',
  'ironwall', 'dewleaf',
];

function b64(filePath) {
  if (!existsSync(filePath)) return null;
  const ext = filePath.endsWith('.png') ? 'png' : 'jpeg';
  return `data:image/${ext};base64,${readFileSync(filePath).toString('base64')}`;
}

function frameRow(creature, action, variant) {
  const dir = join(ART, creature, `${action}_${variant}`);
  if (!existsSync(dir)) return { frames: [], dir };
  const files = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
  const frames = files.map((f) => b64(join(dir, f))).filter(Boolean);
  return { frames, dir };
}

function sourceImage(creature) {
  for (const ext of ['jpg', 'jpeg', 'png']) {
    const p = join(SPRITES, `${creature}.${ext}`);
    if (existsSync(p)) return b64(p);
  }
  return null;
}

// Build a CSS sprite-strip animation for a set of frames
function stripAnim(frames, fps = 8, size = 96) {
  if (frames.length === 0) return { css: '', html: '' };
  const dur = frames.length / fps;
  const imgHtml = frames.map((f, i) =>
    `<img src="${f}" width="${size}" height="${size}" style="display:${i === 0 ? 'inline' : 'none'}" class="f${i}" />`
  ).join('');
  // Simple JS cycling via a data-frames count
  return {
    html: `<div class="strip" data-frames="${frames.length}" data-fps="${fps}">${imgHtml}</div>`,
  };
}

function buildHTML() {
  const cells = [];
  for (const creature of CREATURES) {
    const src = sourceImage(creature);
    const v3Idle   = frameRow(creature, 'idle',   'v3');
    const pxIdle   = frameRow(creature, 'idle',   'pixel');
    const evolved  = frameRow(creature, 'evolved', 'pixel');

    const srcTag = src
      ? `<img src="${src}" width="96" height="96" style="object-fit:contain;border-radius:6px" />`
      : `<div style="width:96px;height:96px;background:#1a1a2a;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#555">${creature}</div>`;

    const v3Tag = v3Idle.frames.length > 0
      ? stripAnim(v3Idle.frames).html
      : `<div style="width:96px;height:96px;background:#0e1a22;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#336"><i>v3 not yet</i></div>`;

    const pxTag = pxIdle.frames.length > 0
      ? stripAnim(pxIdle.frames).html
      : `<div style="width:96px;height:96px;background:#0e220e;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#363"><i>pixel not yet</i></div>`;

    const evTag = evolved.frames.length > 0
      ? stripAnim(evolved.frames, 4).html
      : `<div style="width:96px;height:96px;background:#220e0e;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#633"><i>evolved not yet</i></div>`;

    cells.push(`
      <div class="row">
        <div class="label">${creature}</div>
        <div class="cell src">${srcTag}<div class="cap">source</div></div>
        <div class="cell v3">${v3Tag}<div class="cap" style="color:#9be7ff">v3 painterly</div></div>
        <div class="cell px">${pxTag}<div class="cap" style="color:#7ed98a">pixel crisp</div></div>
        <div class="cell ev">${evTag}<div class="cap" style="color:#ff9a44">evolved</div></div>
      </div>`);
  }

  const generated = new Date().toISOString().slice(0, 16).replace('T', ' ');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Ringward — Creature Contact Sheet</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #08060c; color: #eaeaf0; font-family: system-ui, sans-serif; padding: 16px; }
  h1  { font-size: 18px; font-weight: 900; color: #ff9a44; letter-spacing: 1px; margin-bottom: 4px; }
  .meta { font-size: 11px; color: #666; margin-bottom: 16px; }
  .header-row { display: flex; align-items: center; gap: 8px; padding-left: 80px; margin-bottom: 6px; }
  .header-row span { width: 112px; font-size: 10px; font-weight: 800; text-align: center; text-transform: uppercase; }
  .row  { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #1c1a24; }
  .label { width: 72px; font-size: 10px; font-weight: 700; color: #9a9ab0; text-align: right; padding-right: 8px; flex-shrink: 0; }
  .cell { text-align: center; flex-shrink: 0; }
  .cell img { display: block; margin: 0 auto; border-radius: 6px; background: #0e0c14; }
  .cap  { font-size: 8px; font-weight: 700; color: #555; margin-top: 3px; }
  .strip { display: inline-block; }
  .strip img { border-radius: 6px; background: #0e0c14; }
</style>
</head>
<body>
<h1>RINGWARD · CREATURE CONTACT SHEET</h1>
<div class="meta">Generated: ${generated} · source → v3 painterly → pixel crisp → evolved</div>
<div class="header-row">
  <span style="color:#888">source</span>
  <span style="color:#9be7ff">v3 painterly</span>
  <span style="color:#7ed98a">pixel crisp</span>
  <span style="color:#ff9a44">evolved</span>
</div>
${cells.join('\n')}
<script>
// Cycle animated strip frames
document.querySelectorAll('.strip').forEach(function(strip) {
  const fps   = parseInt(strip.dataset.fps) || 8;
  const count = parseInt(strip.dataset.frames) || 1;
  const imgs  = strip.querySelectorAll('img');
  let idx = 0;
  if (count <= 1) return;
  setInterval(function() {
    imgs[idx].style.display = 'none';
    idx = (idx + 1) % count;
    imgs[idx].style.display = 'inline';
  }, 1000 / fps);
});
</script>
</body>
</html>`;
}

mkdirSync(ART, { recursive: true });
const outPath = join(ART, 'contact-sheet.html');
writeFileSync(outPath, buildHTML());
console.log(`✓ contact-sheet.html written → ${outPath}`);
console.log('  Open in a browser (file:// is fine) and screenshot for iPad review.');
