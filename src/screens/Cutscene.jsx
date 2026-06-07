/* eslint-disable react-refresh/only-export-components */
// Cutscene.jsx — a tap-through illustrated story player for Ringward (vF-AA).
// (Component + its scene data are co-located on purpose; fast-refresh rule disabled.)
//
// The story finally has a BEGINNING. This renders a sequence of scenes, each one a
// piece of vector art (SVG/CSS — no asset files) + a line of narration, in the
// folk-mystery voice. Tap to advance; skippable; re-watchable from the home screen.
//
// PAINT-READY: each scene carries an optional `image` field. While it's null the
// hand-built vector art shows. Drop a painted frame in (e.g. a Midjourney render at
// `/art/scene-rim.png`) and set `image` to its path — the player swaps to the image
// automatically, no other change. Midjourney prompts for each scene are at the bottom.

import { useState } from 'react';
import * as sfx from '../sfx.js';

const CUT_STYLE = `
@keyframes cut-fade   { 0%{opacity:0;transform:translateY(12px)} 100%{opacity:1;transform:translateY(0)} }
@keyframes cut-pulse  { 0%,100%{opacity:.6} 50%{opacity:1} }
@keyframes cut-drift  { 0%{transform:translateY(0);opacity:0} 20%{opacity:.85} 100%{transform:translateY(-70px);opacity:0} }
@keyframes cut-fall   { 0%{transform:translate(0,-10px);opacity:0} 12%{opacity:1} 100%{transform:translate(-70px,180px);opacity:0} }
@keyframes cut-ringpulse { 0%,100%{opacity:.3} 50%{opacity:.85} }
@keyframes cut-sway   { 0%,100%{transform:translateX(0)} 50%{transform:translateX(3px)} }
`;

// ── Shared frame ──────────────────────────────────────────────────────────────
const frame = { width: '100%', height: '100%', display: 'block' };
const motes = (color, xs) => xs.map(([x, y, d], i) => (
  <circle key={i} cx={x} cy={y} r={1.6} fill={color} style={{ animation: `cut-drift ${3.6 + d}s linear ${d}s infinite` }} />
));

// 1 ── THE RIM — coming up the long road to the edge of the rings.
function SceneRim() {
  return (
    <svg viewBox="0 0 400 260" style={frame}>
      <defs>
        <linearGradient id="rim-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#241f3a" /><stop offset="0.55" stopColor="#5b4660" /><stop offset="1" stopColor="#1a1016" />
        </linearGradient>
        <radialGradient id="rim-glow" cx="0.5" cy="0.45" r="0.55">
          <stop offset="0" stopColor="#e8a04066" /><stop offset="1" stopColor="#e8a04000" />
        </radialGradient>
      </defs>
      <rect width="400" height="260" fill="url(#rim-sky)" />
      <ellipse cx="200" cy="128" rx="150" ry="38" fill="url(#rim-glow)" />
      <circle cx="200" cy="120" r="5" fill="#ffce8a" style={{ animation: 'cut-pulse 3s ease-in-out infinite' }} />
      {/* far ridge line */}
      <path d="M0 138 Q120 122 200 130 T400 134 L400 152 L0 152 Z" fill="#2c2336" opacity="0.8" />
      {/* ground */}
      <path d="M0 150 L400 150 L400 260 L0 260 Z" fill="#140f10" />
      {/* winding road narrowing to the rings */}
      <path d="M150 260 L194 152 L206 152 L250 260 Z" fill="#271d16" />
      <path d="M186 260 L197 154 L203 154 L214 260 Z" fill="#3a2c1f" opacity="0.7" />
      {/* glowing ground-cracks */}
      <path d="M44 206 L86 182 L74 214" stroke="#e8703a" strokeWidth="1.6" fill="none" opacity="0.55" />
      <path d="M324 196 L356 214 L342 226" stroke="#e8703a" strokeWidth="1.6" fill="none" opacity="0.5" />
      {/* lone Handler + two grunlings, near */}
      <ellipse cx="200" cy="246" rx="36" ry="6" fill="#000" opacity="0.45" />
      <circle cx="200" cy="209" r="6.5" fill="#0c0a10" />
      <path d="M195 214 q5 -9 10 0 l2.5 28 h-15 z" fill="#0c0a10" />
      <circle cx="200" cy="226" r="2.6" fill="#7ee0c0" style={{ animation: 'cut-pulse 2.4s ease-in-out infinite' }} />
      <g style={{ animation: 'cut-sway 4s ease-in-out infinite' }}>
        <circle cx="176" cy="239" r="7.5" fill="#19141e" /><circle cx="176" cy="237.5" r="2" fill="#ffce8a" />
      </g>
      <g style={{ animation: 'cut-sway 5s ease-in-out infinite' }}>
        <circle cx="225" cy="241" r="6.5" fill="#19141e" /><circle cx="225" cy="239.5" r="1.8" fill="#7ec8ff" />
      </g>
      {motes('#ffae5a', [[70, 232, 0], [150, 236, 1.1], [255, 230, 0.5], [330, 238, 1.7]])}
    </svg>
  );
}

// 2 ── THREE CORES — the inheritance, humming on the mantel.
function SceneCores() {
  return (
    <svg viewBox="0 0 400 260" style={frame}>
      <defs>
        <radialGradient id="core-room" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#1e1826" /><stop offset="1" stopColor="#0a080e" />
        </radialGradient>
        {['#7ee0c0', '#ffce6a', '#7ec8ff'].map((c, i) => (
          <radialGradient key={i} id={`core-g${i}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffffff" /><stop offset="0.35" stopColor={c} /><stop offset="1" stopColor={`${c}00`} />
          </radialGradient>
        ))}
      </defs>
      <rect width="400" height="260" fill="url(#core-room)" />
      {/* mantel */}
      <rect x="70" y="168" width="260" height="10" rx="3" fill="#231a14" />
      <rect x="70" y="178" width="260" height="42" fill="#160f0b" opacity="0.8" />
      {/* three cores with glow + slow pulse */}
      {[[150, '#7ee0c0', 0], [200, '#ffce6a', 1], [250, '#7ec8ff', 2]].map(([x, c, i]) => (
        <g key={i} style={{ animation: `cut-pulse ${2.4 + i * 0.6}s ease-in-out ${i * 0.4}s infinite` }}>
          <circle cx={x} cy={150} r={34} fill={`url(#core-g${i})`} opacity="0.55" />
          <circle cx={x} cy={150} r={9} fill="#fff" />
          <circle cx={x} cy={150} r={13} fill="none" stroke={c} strokeWidth="2" opacity="0.8" />
        </g>
      ))}
      {/* faint reflections on the mantel */}
      {[150, 200, 250].map((x, i) => <ellipse key={i} cx={x} cy={174} rx={11} ry={3} fill="#fff" opacity="0.12" />)}
      {motes('#cfe', [[150, 150, 0.6], [200, 150, 1.4], [250, 150, 0.2]])}
    </svg>
  );
}

// 3 ── WHAT FELL — something fell from a clear sky; the land went wrong.
function SceneBlight() {
  return (
    <svg viewBox="0 0 400 260" style={frame}>
      <defs>
        <linearGradient id="bl-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a0e1a" /><stop offset="0.7" stopColor="#161226" /><stop offset="1" stopColor="#0c0a12" />
        </linearGradient>
        <radialGradient id="bl-strike" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#cdeaff" /><stop offset="0.4" stopColor="#7ec8ff88" /><stop offset="1" stopColor="#7ec8ff00" />
        </radialGradient>
        <radialGradient id="bl-rot" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#3a5a48" /><stop offset="1" stopColor="#3a5a4800" />
        </radialGradient>
      </defs>
      <rect width="400" height="260" fill="url(#bl-sky)" />
      {/* stars */}
      {[[40, 40], [90, 26], [150, 50], [300, 34], [350, 60], [250, 28]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.1" fill="#cdd6ff" opacity="0.7" />)}
      {/* the falling streak */}
      <line x1="300" y1="20" x2="210" y2="150" stroke="#cdeaff" strokeWidth="2.5" opacity="0.85" style={{ animation: 'cut-fall 4s ease-in 0.3s infinite' }} />
      {/* impact point — the Drop */}
      <circle cx="200" cy="170" r="40" fill="url(#bl-strike)" style={{ animation: 'cut-pulse 3s ease-in-out infinite' }} />
      <circle cx="200" cy="170" r="5" fill="#fff" />
      {/* spreading rot rings */}
      {[26, 50, 80].map((r, i) => <circle key={i} cx={200} cy={172} r={r} fill="none" stroke="#4a6a52" strokeWidth="2" opacity="0.5" style={{ animation: `cut-ringpulse ${3 + i}s ease-in-out ${i * 0.5}s infinite` }} />)}
      <ellipse cx="200" cy="210" rx="170" ry="36" fill="url(#bl-rot)" opacity="0.6" />
      {/* dead ground */}
      <path d="M0 196 Q100 184 200 192 T400 190 L400 260 L0 260 Z" fill="#0d120f" />
    </svg>
  );
}

// 4 ── THE RINGS — concentric, closing on the Drop; you start at the rim.
function SceneRings() {
  const rings = [92, 78, 64, 50, 37, 25, 14];
  return (
    <svg viewBox="0 0 400 260" style={frame}>
      <defs>
        <radialGradient id="rg-bg" cx="0.5" cy="0.5" r="0.7">
          <stop offset="0" stopColor="#1a1226" /><stop offset="1" stopColor="#08060c" />
        </radialGradient>
        <radialGradient id="rg-core" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" /><stop offset="0.4" stopColor="#b06bff" /><stop offset="1" stopColor="#b06bff00" />
        </radialGradient>
      </defs>
      <rect width="400" height="260" fill="url(#rg-bg)" />
      {/* the Drop at center */}
      <circle cx="200" cy="130" r="44" fill="url(#rg-core)" style={{ animation: 'cut-pulse 3s ease-in-out infinite' }} />
      {/* concentric rings, brighter inward */}
      {rings.map((r, i) => {
        const t = i / (rings.length - 1); // 0 outer → 1 inner
        return <circle key={i} cx={200} cy={130} r={r} fill="none" stroke="#b06bff" strokeWidth={1.2 + t * 1.3} opacity={0.18 + t * 0.5} />;
      })}
      <circle cx="200" cy="130" r={6} fill="#fff" />
      {/* "you are here" marker at the rim (outer ring, top) */}
      <g style={{ animation: 'cut-pulse 1.6s ease-in-out infinite' }}>
        <circle cx="200" cy="38" r="4.5" fill="#ffce8a" />
        <circle cx="200" cy="38" r="9" fill="none" stroke="#ffce8a" strokeWidth="1.5" opacity="0.7" />
      </g>
      <text x="200" y="22" textAnchor="middle" fontSize="10" fontWeight="900" fill="#ffce8a" letterSpacing="1">YOU</text>
      <text x="200" y="134" textAnchor="middle" fontSize="9" fontWeight="900" fill="#f0e6ff" letterSpacing="1">THE DROP</text>
    </svg>
  );
}

// 5 ── THE CLIMB — the door at the heart, and the choice to go.
function SceneDoor() {
  return (
    <svg viewBox="0 0 400 260" style={frame}>
      <defs>
        <radialGradient id="dr-bg" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stopColor="#1c1430" /><stop offset="1" stopColor="#070510" />
        </radialGradient>
        <linearGradient id="dr-door" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3ecff" /><stop offset="0.55" stopColor="#b06bff" /><stop offset="1" stopColor="#4a2a7a" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill="url(#dr-bg)" />
      {/* expanding aura rings */}
      {[60, 90, 120].map((r, i) => <circle key={i} cx={200} cy={120} r={r} fill="none" stroke="#b06bff" strokeWidth="2" opacity="0.4" style={{ animation: `cut-ringpulse ${3 + i}s ease-in-out ${i * 0.6}s infinite` }} />)}
      {/* the door */}
      <path d="M168 196 L168 96 Q200 60 232 96 L232 196 Z" fill="url(#dr-door)" />
      <path d="M182 196 L182 108 Q200 86 218 108 L218 196 Z" fill="#fff" opacity="0.18" />
      {/* light spill on the ground */}
      <ellipse cx="200" cy="200" rx="90" ry="18" fill="#b06bff" opacity="0.25" />
      {/* the Handler, before it, small */}
      <ellipse cx="200" cy="226" rx="20" ry="4" fill="#000" opacity="0.5" />
      <circle cx="200" cy="200" r="5" fill="#0a0810" />
      <path d="M196 204 q4 -7 8 0 l2 20 h-12 z" fill="#0a0810" />
      <circle cx="200" cy="214" r="2.2" fill="#7ee0c0" style={{ animation: 'cut-pulse 2.2s ease-in-out infinite' }} />
      {/* rising motes from the threshold */}
      {[[170, 196, 0], [190, 196, 1.2], [210, 196, 0.5], [230, 196, 1.7], [200, 196, 0.9]].map(([x, y, d], i) => (
        <circle key={i} cx={x} cy={y} r="2" fill="#e8dcff" style={{ animation: `cut-drift ${3.4 + d}s linear ${d}s infinite` }} />
      ))}
    </svg>
  );
}

// ── In-run vignettes (vF-AA) — small illustrated thumbnails that turn the threshold
// and Holdfast text-beats into illustrated moments. Static (no keyframe dependency) so
// they render correctly anywhere, not just inside the Cutscene's injected styles. ──
const RING_TINT = ['#e8a040', '#b59a6a', '#7ec88a', '#7ec8ff', '#8ae0d0', '#8a78c8', '#9a7fc0', '#cfe8ff'];
export function RingVignette({ depth = 1, size = 84 }) {
  const i = Math.max(0, Math.min(7, depth - 1));
  const tint = RING_TINT[i];
  const t = i / 7; // deeper → darker, colder
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block', borderRadius: 10, flexShrink: 0 }}>
      <defs>
        <linearGradient id={`rv-sky-${i}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t > 0.6 ? '#0e0c1a' : '#221a2e'} /><stop offset="1" stopColor="#08060c" />
        </linearGradient>
        <radialGradient id={`rv-glow-${i}`} cx="0.5" cy="0.55" r="0.5">
          <stop offset="0" stopColor={tint} stopOpacity={0.5 - t * 0.18} /><stop offset="1" stopColor={tint} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#rv-sky-${i})`} />
      <ellipse cx="50" cy="56" rx="46" ry="17" fill={`url(#rv-glow-${i})`} />
      <circle cx="50" cy="50" r="2.6" fill={tint} />
      <path d="M0 58 Q30 50 50 55 T100 54 L100 72 L0 72 Z" fill="#000" opacity="0.4" />
      <path d="M0 72 L100 72 L100 100 L0 100 Z" fill="#08060c" />
      <path d="M38 100 L48 72 L52 72 L62 100 Z" fill={tint} opacity="0.13" />
      {[[24, 84], [72, 88], [50, 80]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r="1.2" fill={tint} opacity={0.7 - t * 0.3} />)}
    </svg>
  );
}
export function HoldfastVignette({ size = 84 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block', borderRadius: 10, flexShrink: 0 }}>
      <defs>
        <radialGradient id="hv-glow" cx="0.5" cy="0.42" r="0.6">
          <stop offset="0" stopColor="#b06bff" stopOpacity="0.4" /><stop offset="1" stopColor="#b06bff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="#0e0a14" />
      <ellipse cx="50" cy="44" rx="42" ry="30" fill="url(#hv-glow)" />
      <path d="M0 74 Q50 64 100 74 L100 100 L0 100 Z" fill="#160f1d" />
      <path d="M32 72 L32 50 L50 36 L68 50 L68 72 Z" fill="#241a30" />
      <path d="M28 51 L50 33 L72 51" stroke="#3a2a52" strokeWidth="2.4" fill="none" strokeLinejoin="round" />
      <rect x="44" y="56" width="12" height="14" rx="1" fill="#b06bff" />
      <rect x="44" y="56" width="12" height="14" rx="1" fill="none" stroke="#e8dcff" strokeWidth="0.8" opacity="0.6" />
      <circle cx="50" cy="20" r="1.4" fill="#cba6ff" opacity="0.7" />
      <circle cx="62" cy="28" r="1" fill="#cba6ff" opacity="0.5" />
    </svg>
  );
}

// A wayside-event medallion: a tinted glyph in a glowing ring (vF-AB).
export function EventVignette({ tint = '#b06bff', glyph = '✦', size = 84 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block', borderRadius: 10, flexShrink: 0 }}>
      <defs>
        <radialGradient id={`ev-${glyph.codePointAt(0)}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={tint} stopOpacity="0.5" /><stop offset="1" stopColor={tint} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="#0e0a14" />
      <circle cx="50" cy="50" r="42" fill={`url(#ev-${glyph.codePointAt(0)})`} />
      <circle cx="50" cy="50" r="24" fill="none" stroke={tint} strokeWidth="1.5" opacity="0.55" />
      <circle cx="50" cy="50" r="30" fill="none" stroke={tint} strokeWidth="0.8" opacity="0.25" />
      <text x="50" y="52" textAnchor="middle" dominantBaseline="central" fontSize="30">{glyph}</text>
    </svg>
  );
}

// ── The opening — five beats from the rim to the choice to climb. ──────────────
export const OPENING_SCENES = [
  { art: <SceneRim />,    image: '/art/cutscene/scene-rim.jpg', title: 'The Rim',
    text: "You come up the long road to the rim, where your people have lived at the edge of the rings for seventy-five years. You were born here. Today you climb in." },
  { art: <SceneCores />,  image: '/art/cutscene/scene-cores.jpg', title: 'Three Cores',
    text: "Your mentor left you three cores, humming on the mantel. From them your grunlings wake — earth and old machine, grown into something with a heart. They're yours now. So is what he was doing." },
  { art: <SceneBlight />, image: '/art/cutscene/scene-blight.jpg', title: 'What Fell',
    text: "Seventy-five years ago, something fell out of a clear sky. Where it struck, the land went wrong — and it's crept outward ever since, ring by ring. They call the place it landed the Drop." },
  { art: <SceneRings />,  image: '/art/cutscene/scene-rings.jpg', title: 'The Rings',
    text: "The blight pools in circles around the Drop. Each ring inward is older, deeper, deadlier — and closer to the truth of what's down there. Your mentor climbed them. He didn't come back." },
  { art: <SceneDoor />,   image: '/art/cutscene/scene-door.jpg', title: 'The Climb',
    text: "Everyone else holds the rim and waits it out. You won't. You'll take the rings one at a time, grow your grunlings strong enough for the next, and go where he went — all the way to the Drop." },
];

// ── The player ────────────────────────────────────────────────────────────────
export function Cutscene({ scenes = OPENING_SCENES, onDone, finalLabel = 'TAKE THE ROAD →' }) {
  const [i, setI] = useState(0);
  const scene = scenes[i];
  const last = i === scenes.length - 1;
  const advance = (e) => {
    if (e) e.stopPropagation();
    sfx.resume(); sfx.sceneTurn();
    if (last) onDone(); else setI(i + 1);
  };
  return (
    <div onClick={advance} style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#08070c', display: 'flex', flexDirection: 'column', justifyContent: 'center', cursor: 'pointer', userSelect: 'none', padding: '18px 16px' }}>
      <style>{CUT_STYLE}</style>
      <button onClick={(e) => { e.stopPropagation(); onDone(); }}
        style={{ position: 'absolute', top: 14, right: 14, fontSize: 12, fontWeight: 800, color: '#8a849a', background: 'transparent', border: '1px solid #2a2435', borderRadius: 8, padding: '5px 11px', cursor: 'pointer', letterSpacing: 0.5 }}>
        Skip ▸
      </button>
      {/* art frame */}
      <div key={`a${i}`} style={{ width: '100%', maxWidth: 520, margin: '0 auto', animation: 'cut-fade .8s ease-out' }}>
        <div style={{ width: '100%', aspectRatio: '400 / 260', borderRadius: 16, overflow: 'hidden', border: '1px solid #2a2435', boxShadow: '0 18px 60px #000a, 0 0 40px #b06bff22' }}>
          {scene.image
            ? <img src={scene.image} alt={scene.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : scene.art}
        </div>
      </div>
      {/* narration */}
      <div key={`t${i}`} style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', animation: 'cut-fade .8s ease-out .15s both' }}>
        <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 2.5, color: '#cba6ff', marginTop: 22 }}>{scene.title.toUpperCase()}</div>
        <div style={{ fontSize: 16, lineHeight: 1.62, color: '#d8cfe6', marginTop: 10, fontStyle: 'italic' }}>{scene.text}</div>
      </div>
      {/* progress + advance */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 26 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {scenes.map((_, k) => <span key={k} style={{ width: 7, height: 7, borderRadius: '50%', background: k <= i ? '#b06bff' : '#2a2435', transition: 'background .3s' }} />)}
        </div>
        <button onClick={advance}
          style={{ fontSize: 13, fontWeight: 900, letterSpacing: 1, color: last ? '#160f1d' : '#cba6ff', background: last ? '#b06bff' : 'transparent', border: `1px solid ${last ? '#b06bff' : '#4a3a66'}`, borderRadius: 9, padding: '8px 16px', cursor: 'pointer' }}>
          {last ? finalLabel : 'NEXT ▸'}
        </button>
      </div>
    </div>
  );
}

/* ── PAINT-READY (Sky → Midjourney, set scene.image to swap in) ──────────────────
   Style suffix for all: "muted folk-mystery storybook illustration, painterly, dusk
   palette, glowing earthen cores, cinematic, soft grain, no text --ar 20:13"

   scene-rim:    "a lone hooded figure with two small glowing earthen creatures climbing
                  a winding road up to the cracked rim of vast concentric rings, embers
                  drifting, distant warm glow on the horizon, …"
   scene-cores:  "three glowing orbs — green, amber, blue — resting on a dark wooden mantel
                  in a dim home interior, soft halos, intimate, …"
   scene-blight: "a bright shard falling from a clear night sky into dark land, sickly
                  green rot spreading outward in rings from the impact, ominous, …"
   scene-rings:  "an overhead map of eight concentric glowing purple rings closing on a
                  bright center marked 'the Drop', a small marker at the outer rim, …"
   scene-door:   "a tall glowing doorway of violet light at the heart of the rings, a small
                  figure standing before it, light spilling out, motes rising, awe, …"
*/
