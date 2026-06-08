// SpriteLab — a STANDALONE prototype (not part of the game) to answer one question:
// what could a more committed-2D creature look like, and can we keep continuity
// between reactions? Reach it at  <preview-url>/#spritelab .
//
// The point it proves: every reaction below (idle / attack / surprise / hit / low-HP /
// down) is the SAME creature re-posed from one shared rig (POSES). There is no
// re-generation, so continuity is guaranteed by construction — the exact thing
// text-to-image (Midjourney) can't promise. The vector and pixel cats are both drawn
// in code from the same pose data; the painted column shows the current art + code FX.
import { useState, useEffect } from 'react';

const STATES = ['idle', 'attack', 'surprise', 'hurt', 'low', 'ko'];
const LABEL = { idle: 'Idle', attack: 'Attack', surprise: 'Surprise', hurt: 'Hit', low: 'Low HP', ko: 'Down' };

// One rig. Each state is just numbers — the finishes below all read from this.
const POSES = {
  idle:     { dy: 0,  lean: 0,   scale: 1.00, rot: 0,   ear: 'neutral', eye: 'normal',   mouth: 'closed', core: 0.78, sat: 1.0,  flash: false, anim: 'breathe' },
  attack:   { dy: -2, lean: 15,  scale: 1.07, rot: -5,  ear: 'back',    eye: 'fierce',   mouth: 'open',   core: 1.0,  sat: 1.15, flash: false, anim: 'lunge' },
  surprise: { dy: -13,lean: -3,  scale: 1.05, rot: 0,   ear: 'up',      eye: 'wide',     mouth: 'oh',     core: 0.92, sat: 1.0,  flash: false, anim: 'pop' },
  hurt:     { dy: 3,  lean: -11, scale: 0.97, rot: 4,   ear: 'down',    eye: 'squeezed', mouth: 'grit',   core: 0.42, sat: 1.0,  flash: true,  anim: 'shake' },
  low:      { dy: 12, lean: 0,   scale: 0.90, rot: 0,   ear: 'down',    eye: 'strain',   mouth: 'grit',   core: 0.30, sat: 0.4,  flash: false, anim: 'tremble' },
  ko:       { dy: 18, lean: 0,   scale: 0.86, rot: -14, ear: 'down',    eye: 'x',        mouth: 'closed', core: 0.06, sat: 0.0,  flash: false, anim: 'none' },
};

const C = { dark: '#7a2410', mid: '#e85a22', light: '#ff9a44', glow: '#ffd36b', eye: '#fff3d0', pupil: '#3a1208', flame: '#ff7a2a' };

// ── ears: tip positions per state (base stays on the head) ──
function ears(kind) {
  const m = { neutral: [-14, 8], up: [-20, -2], back: [-6, 16], down: [-4, 22] }[kind] || [-14, 8];
  const [dx, dy] = m;
  const L = `M44 58 L${44 + dx} ${58 + dy - 18} L54 56 Z`;
  const R = `M76 58 L${76 - dx} ${58 + dy - 18} L66 56 Z`;
  return <><path d={L} fill={C.mid} stroke={C.dark} strokeWidth="1" /><path d={R} fill={C.mid} stroke={C.dark} strokeWidth="1" /></>;
}

// ── eyes: one rig, six expressions ──
function eye(kind, cx, cy) {
  const p = (sx, sy) => `${cx + sx} ${cy + sy}`;
  switch (kind) {
    case 'fierce': return <g><path d={`M${cx - 6} ${cy - 1} Q${cx} ${cy + 1} ${cx + 6} ${cy - 4}`} stroke={C.dark} strokeWidth="2.4" fill="none" strokeLinecap="round" /><circle cx={cx + 1} cy={cy + 1} r="2.2" fill={C.pupil} /></g>;
    case 'wide': return <g><circle cx={cx} cy={cy} r="6.4" fill={C.eye} /><circle cx={cx} cy={cy} r="6.4" fill="none" stroke={C.dark} strokeWidth="1" /><circle cx={cx} cy={cy + 0.5} r="2.6" fill={C.pupil} /></g>;
    case 'squeezed': return <path d={`M${cx - 5} ${cy + 2} Q${cx} ${cy - 4} ${cx + 5} ${cy + 2}`} stroke={C.dark} strokeWidth="2.4" fill="none" strokeLinecap="round" />;
    case 'strain': return <g><ellipse cx={cx} cy={cy + 1} rx="5" ry="2.6" fill={C.eye} /><circle cx={cx} cy={cy + 1.5} r="2" fill={C.pupil} /><path d={`M${cx - 5.5} ${cy - 1.5} Q${cx} ${cy - 2.5} ${cx + 5.5} ${cy - 1.5}`} stroke={C.dark} strokeWidth="2" fill="none" strokeLinecap="round" /></g>;
    case 'x': return <g stroke={C.dark} strokeWidth="2.2" strokeLinecap="round"><line x1={p(-4, -4).split(' ')[0]} y1={p(-4, -4).split(' ')[1]} x2={p(4, 4).split(' ')[0]} y2={p(4, 4).split(' ')[1]} /><line x1={p(4, -4).split(' ')[0]} y1={p(4, -4).split(' ')[1]} x2={p(-4, 4).split(' ')[0]} y2={p(-4, 4).split(' ')[1]} /></g>;
    default: return <g><ellipse cx={cx} cy={cy} rx="4.6" ry="5.6" fill={C.eye} /><circle cx={cx} cy={cy + 0.5} r="2.4" fill={C.pupil} /></g>;
  }
}

function mouth(kind) {
  switch (kind) {
    case 'open': return <path d="M54 90 Q60 99 66 90 Q60 93 54 90 Z" fill={C.pupil} />;
    case 'oh': return <ellipse cx="60" cy="91" rx="3.4" ry="4.2" fill={C.pupil} />;
    case 'grit': return <g><rect x="53" y="89" width="14" height="3.4" rx="1" fill={C.pupil} /><line x1="57" y1="89" x2="57" y2="92.4" stroke={C.light} strokeWidth="0.9" /><line x1="60" y1="89" x2="60" y2="92.4" stroke={C.light} strokeWidth="0.9" /><line x1="63" y1="89" x2="63" y2="92.4" stroke={C.light} strokeWidth="0.9" /></g>;
    default: return <path d="M55 90 Q60 93 65 90" stroke={C.dark} strokeWidth="1.8" fill="none" strokeLinecap="round" />;
  }
}

// ── VECTOR finish — smooth shapes, soft modern 2D ──
function VectorCat({ pose, size = 150 }) {
  const t = `translateX(${pose.lean * 0.45}px) translateY(${pose.dy}px) rotate(${pose.rot}deg) scale(${pose.scale})`;
  return (
    <svg viewBox="0 0 120 130" width={size} height={size} style={{ overflow: 'visible', filter: `saturate(${pose.sat})` }}>
      <defs>
        <radialGradient id="vbody" cx="50%" cy="32%" r="72%"><stop offset="0" stopColor={C.light} /><stop offset="0.6" stopColor={C.mid} /><stop offset="1" stopColor={C.dark} /></radialGradient>
        <radialGradient id="vcore" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fff" /><stop offset="0.4" stopColor={C.glow} /><stop offset="1" stopColor="#ff6a1a00" /></radialGradient>
      </defs>
      <g style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: t, transition: 'transform .26s cubic-bezier(.2,.9,.3,1.2)' }}>
        {/* tail */}
        <path d="M84 100 q26 -4 22 -34 q-3 -12 -12 -8 q6 10 1 22 q-4 10 -16 10 Z" fill={C.mid} opacity="0.9" />
        {/* flame tuft */}
        <path d="M60 38 q7 -12 1 -20 q-2 9 -7 10 q3 4 0 9 q3 1 6 1 Z" fill={C.flame} opacity={0.55 + pose.core * 0.45} />
        {ears(pose.ear)}
        {/* body */}
        <path d="M60 54 C92 54 96 112 60 118 C24 112 28 54 60 54 Z" fill="url(#vbody)" stroke={C.dark} strokeWidth="1.5" />
        {/* core glow */}
        <circle cx="60" cy="99" r="16" fill="url(#vcore)" opacity={pose.core} />
        <circle cx="60" cy="99" r="5.5" fill={C.glow} opacity={Math.min(1, pose.core + 0.1)} />
        {eye(pose.eye, 50, 74)}
        {eye(pose.eye, 70, 74)}
        {mouth(pose.mouth)}
        {/* paws */}
        <ellipse cx="49" cy="117" rx="6" ry="4" fill={C.dark} />
        <ellipse cx="71" cy="117" rx="6" ry="4" fill={C.dark} />
      </g>
    </svg>
  );
}

// ── PIXEL finish — same rig, blocky/crisp, limited palette ──
function rect(x, y, w, h, fill, key) { return <rect key={key} x={x} y={y} width={w} height={h} fill={fill} />; }
function PixelCat({ pose, size = 150 }) {
  const t = `translateX(${Math.round(pose.lean * 0.3)}px) translateY(${pose.dy}px) rotate(${pose.rot}deg) scale(${pose.scale})`;
  const px = [];
  // ears (shift with state)
  const eo = { neutral: 0, up: -1, back: 1, down: 2 }[pose.ear] || 0;
  px.push(rect(4, 2 + eo, 2, 2, C.mid, 'el'), rect(10, 2 + eo, 2, 2, C.mid, 'er'));
  // body blob (stepped rects → rounded pixel silhouette)
  const body = [[5, 4, 6, 1], [4, 5, 8, 1], [3, 6, 10, 6], [4, 12, 8, 1], [5, 13, 6, 1]];
  body.forEach((b, i) => px.push(rect(b[0], b[1], b[2], b[3], i % 2 ? C.mid : C.light, 'b' + i)));
  px.push(rect(3, 6, 1, 6, C.dark, 'os'), rect(12, 6, 1, 6, C.dark, 'oe'), rect(4, 4, 1, 1, C.dark, 'o1'), rect(11, 4, 1, 1, C.dark, 'o2')); // outline hints
  // core
  if (pose.core > 0.12) { px.push(rect(7, 9, 2, 2, C.glow, 'c'), rect(6, 10, 1, 1, C.glow, 'c2'), rect(9, 10, 1, 1, C.glow, 'c3')); }
  // eyes by state (blocky)
  if (pose.eye === 'wide') { px.push(rect(5, 7, 2, 2, C.eye, 'eyl'), rect(9, 7, 2, 2, C.eye, 'eyr'), rect(6, 8, 1, 1, C.pupil, 'pl'), rect(9, 8, 1, 1, C.pupil, 'pr')); }
  else if (pose.eye === 'squeezed' || pose.eye === 'x') { px.push(rect(5, 8, 2, 1, C.dark, 'eyl'), rect(9, 8, 2, 1, C.dark, 'eyr')); }
  else if (pose.eye === 'fierce') { px.push(rect(5, 8, 2, 1, C.pupil, 'eyl'), rect(9, 8, 2, 1, C.pupil, 'eyr')); }
  else if (pose.eye === 'strain') { px.push(rect(5, 8, 2, 1, C.pupil, 'eyl'), rect(9, 8, 2, 1, C.pupil, 'eyr'), rect(5, 7, 2, 1, C.dark, 'll'), rect(9, 7, 2, 1, C.dark, 'lr')); }
  else { px.push(rect(5, 7, 1, 2, C.pupil, 'eyl'), rect(10, 7, 1, 2, C.pupil, 'eyr')); }
  // mouth
  if (pose.mouth === 'open' || pose.mouth === 'oh') px.push(rect(7, 11, 2, 1, C.pupil, 'm'));
  else if (pose.mouth === 'grit') px.push(rect(6, 11, 4, 1, C.pupil, 'm'));
  // paws
  px.push(rect(5, 14, 2, 1, C.dark, 'pw1'), rect(9, 14, 2, 1, C.dark, 'pw2'));
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" style={{ overflow: 'visible', filter: `saturate(${pose.sat})` }}>
      <g style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: t, transition: 'transform .2s steps(3)' }}>{px}</g>
    </svg>
  );
}

// ── PAINTED finish — the CURRENT art + code-driven state FX ──
function PaintedCat({ pose, size = 150 }) {
  const t = `translateX(${pose.lean * 0.5}px) translateY(${pose.dy}px) rotate(${pose.rot}deg) scale(${pose.scale})`;
  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img src="/sprites/cinderpaw.jpg" alt="Cinderpaw"
        style={{ width: size * 0.8, height: size * 0.8, objectFit: 'cover', borderRadius: 14, transformOrigin: 'center', transform: t, transition: 'transform .26s cubic-bezier(.2,.9,.3,1.2)', filter: `saturate(${pose.sat}) ${pose.sat < 0.1 ? 'grayscale(1)' : ''} ${pose.core < 0.35 ? 'brightness(.82)' : ''}` }} />
      {pose.flash && <div style={{ position: 'absolute', inset: '10%', borderRadius: 14, background: 'rgba(255,40,40,0.4)', mixBlendMode: 'multiply' }} />}
    </div>
  );
}

const FX = `
@keyframes sl-breathe { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
@keyframes sl-lunge { 0%{transform:translateX(0)} 35%{transform:translateX(10px) scale(1.04)} 100%{transform:translateX(0)} }
@keyframes sl-pop { 0%{transform:translateY(0) scale(1)} 40%{transform:translateY(-8px) scale(1.08)} 100%{transform:translateY(0) scale(1)} }
@keyframes sl-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(2px)} }
@keyframes sl-tremble { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-1.5px)} 75%{transform:translateX(1.5px)} }
`;

function Card({ title, sub, children, accent }) {
  return (
    <div style={{ flex: '1 1 230px', minWidth: 200, background: '#0e0c14', border: `1px solid ${accent}55`, borderRadius: 16, padding: '14px 12px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 13, fontWeight: 900, color: accent, letterSpacing: 0.5 }}>{title}</div>
      <div style={{ fontSize: 10.5, color: '#8a8a9a', marginBottom: 8, minHeight: 26, lineHeight: 1.35 }}>{sub}</div>
      <div style={{ background: 'radial-gradient(ellipse at 50% 42%, #1a1622, #0a0810)', borderRadius: 12, padding: '14px 0 10px', display: 'flex', justifyContent: 'center' }}>{children}</div>
    </div>
  );
}

export default function SpriteLab() {
  const [st, setSt] = useState('idle');
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return undefined;
    const id = setInterval(() => setSt((s) => STATES[(STATES.indexOf(s) + 1) % STATES.length]), 1200);
    return () => clearInterval(id);
  }, [auto]);
  const pose = POSES[st];
  const animName = { breathe: 'sl-breathe 2.6s ease-in-out infinite', lunge: 'sl-lunge .4s ease-out', pop: 'sl-pop .45s ease-out', shake: 'sl-shake .4s ease-out', tremble: 'sl-tremble .5s ease-in-out infinite', none: 'none' }[pose.anim];
  // key on state so one-shot animations replay each switch
  const animWrap = (node) => <div key={st} style={{ animation: animName }}>{node}</div>;

  const filmstrip = (Cat, accent) => (
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
      {STATES.map((s) => (
        <div key={s} style={{ textAlign: 'center' }}>
          <div style={{ background: '#0a0810', borderRadius: 8, border: `1px solid ${s === st ? accent : '#26222e'}`, padding: 2 }}>
            <Cat pose={POSES[s]} size={56} />
          </div>
          <div style={{ fontSize: 8, color: s === st ? accent : '#666', fontWeight: 700, marginTop: 2 }}>{LABEL[s]}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: '#08060c', color: '#eaeaf0', fontFamily: 'system-ui, sans-serif', padding: '20px 16px 60px' }}>
      <style>{FX}</style>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#e86040', letterSpacing: 1 }}>CHARACTER STYLE LAB <span style={{ fontSize: 11, color: '#777', fontWeight: 700, letterSpacing: 0 }}>· prototype, not in the game</span></div>
        <div style={{ fontSize: 13, color: '#b6b6c4', margin: '6px 0 4px', lineHeight: 1.5 }}>
          One creature — <b style={{ color: '#ff9a44' }}>Cinderpaw</b>, the ember-cat — in three finishes, six reactions. Every reaction is the <b>same code rig re-posed</b> (look at the numbers in <code style={{ color: '#9be7ff' }}>POSES</code>): there is no re-generating an image, so <b style={{ color: '#7ed98a' }}>continuity is guaranteed</b>. That's the thing Midjourney can't promise.
        </div>

        {/* controls */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', margin: '14px 0 6px' }}>
          {STATES.map((s) => (
            <button key={s} onClick={() => { setAuto(false); setSt(s); }}
              style={{ padding: '7px 13px', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 800,
                background: s === st ? '#2c1a10' : '#15131c', color: s === st ? '#ff9a44' : '#9a9aa8', border: `1.5px solid ${s === st ? '#e85a22' : '#2a2632'}` }}>
              {LABEL[s]}
            </button>
          ))}
          <button onClick={() => setAuto((a) => !a)}
            style={{ marginLeft: 'auto', padding: '7px 13px', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 800, background: auto ? '#10202a' : '#15131c', color: auto ? '#9be7ff' : '#9a9aa8', border: `1.5px solid ${auto ? '#3a6a8a' : '#2a2632'}` }}>
            {auto ? '⏸ Auto-cycling' : '▶ Auto-cycle'}
          </button>
        </div>

        {/* the three finishes, big, at the current state */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
          <Card accent="#ff9a44" title="① Painted (your current art) + code FX" sub="The sprite you have now, nudged by the rig — lunge, hit-flash, low-HP slump. No new art.">
            {animWrap(<PaintedCat pose={pose} />)}
          </Card>
          <Card accent="#7ed98a" title="② Code-drawn · Vector" sub="Authored from shapes. Soft, modern-mobile. I control every reaction — and continuity is total.">
            {animWrap(<VectorCat pose={pose} />)}
          </Card>
          <Card accent="#9be7ff" title="③ Code-drawn · Chunky pixel" sub="Same rig, blocky finish. Retro-leaning (NES/SNES-ish, not HD). Same perfect continuity.">
            {animWrap(<PixelCat pose={pose} />)}
          </Card>
        </div>

        {/* filmstrips — all six states at once = continuity at a glance */}
        <div style={{ marginTop: 22, fontSize: 12, fontWeight: 800, color: '#888', letterSpacing: 1 }}>EVERY REACTION, SIDE BY SIDE <span style={{ color: '#666', fontWeight: 600 }}>— same creature, no drift</span></div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10 }}>
          <div style={{ flex: '1 1 240px' }}><div style={{ fontSize: 10, color: '#7ed98a', fontWeight: 800, marginBottom: 2 }}>Vector</div>{filmstrip(VectorCat, '#7ed98a')}</div>
          <div style={{ flex: '1 1 240px' }}><div style={{ fontSize: 10, color: '#9be7ff', fontWeight: 800, marginBottom: 2 }}>Chunky pixel</div>{filmstrip(PixelCat, '#9be7ff')}</div>
        </div>

        <div style={{ marginTop: 24, fontSize: 11.5, color: '#7a7a88', lineHeight: 1.6, borderTop: '1px solid #1c1a24', paddingTop: 14 }}>
          <b style={{ color: '#aaa' }}>What this is and isn't.</b> These are <i>code-drawn</i> creatures — the point is to show <b>state control + guaranteed continuity</b>, not final art quality. Two real paths from here: <b style={{ color: '#7ed98a' }}>(A)</b> lean into a clean code-drawn style like the vector one and I author all 17 creatures + their reactions directly (zero Midjourney, zero drift); or <b style={{ color: '#ff9a44' }}>(B)</b> keep your painted creatures but rig <i>one</i> good image each (cut into parts), so reactions come from posing, never re-generating. Either way the continuity problem disappears. True Octopath-HD pixel needs a pixel artist — but you may not want it once you see clean continuity in motion.
        </div>
      </div>
    </div>
  );
}
