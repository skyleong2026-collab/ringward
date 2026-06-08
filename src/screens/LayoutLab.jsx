// LayoutLab — a STANDALONE mockup (not part of the game) to compare battlefield
// ORIENTATIONS for a committed-2D look. Reach it at  <preview-url>/#layoutlab .
//
// Every creature here is its ONE painted front-facing sprite — the same image the
// game already uses. Nothing is re-generated. What changes between layouts is only
// the STAGING: where the (always front-on) creatures stand, how big, on what ground.
// That distinction is the whole point — see the note at the bottom of the page.
import { useState } from 'react';

const LAYOUTS = [
  { id: 'columns',  name: 'Columns',     tag: 'current — card-game' },
  { id: 'rows',     name: 'Face-off',    tag: 'enemies top / you bottom' },
  { id: 'diorama',  name: 'Diorama',     tag: 'depth — stand IN the arena' },
  { id: 'boss',     name: 'Boss framing', tag: 'loom — looking up at a wall' },
];

const NOTE = {
  columns:  'Two side columns with a move lane between. Reads fine, but the units float in FRONT of the art — they never sit IN the place.',
  rows:     'Enemies across the top, your squad across the bottom, the move lane becomes the battle line. Clean on a phone; the painted ground reads as the floor you face across.',
  diorama:  'A faked ground plane: enemies stand farther (higher + smaller), you stand nearer (lower + bigger), each with a floor-shadow. Same front-on sprites — depth comes purely from scale + position. This is the one that pairs with the backgrounds.',
  boss:     'One enemy looming large top-centre, your squad small at the base. The size gap alone tells the story — you are looking UP at a wall. A per-encounter framing, not a global one.',
};

const BGS = [
  { id: 'outer-ring', label: 'Outer Ring' },
  { id: 'frostbound', label: 'Frostbound' },
  { id: 'witherfen',  label: 'Witherfen' },
  { id: 'lightless',  label: 'Lightless' },
];

// front-facing sprite, framed in its type colour (same recipe the game uses)
function Mon({ id, color, size, label, hp = 100, shadow = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: size }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        {shadow && <div style={{ position: 'absolute', bottom: -4, left: '12%', width: '76%', height: 12, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,0.55), transparent 70%)' }} />}
        <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', position: 'relative', animation: 'lab-float 2.4s ease-in-out infinite',
          background: `radial-gradient(circle at 50% 38%, ${color}33 0%, #0b0b14 72%)`, border: `2.5px solid ${color}`, boxShadow: `0 0 12px ${color}66, inset 0 0 14px ${color}22` }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(/sprites/${id}.jpg)`, backgroundSize: 'auto 122%', backgroundPosition: '50% 38%', backgroundRepeat: 'no-repeat' }} />
        </div>
      </div>
      {label && <div style={{ fontSize: Math.max(9, size * 0.14), fontWeight: 800, color: '#eee', textShadow: '0 1px 3px #000', whiteSpace: 'nowrap' }}>{label}</div>}
      <div style={{ width: size * 0.82, height: 4, borderRadius: 3, background: '#1a1a26', overflow: 'hidden', border: '1px solid #2a2a3a' }}>
        <div style={{ width: `${hp}%`, height: '100%', background: hp > 35 ? '#3ec9a0' : '#e07a7a' }} />
      </div>
    </div>
  );
}

const ORANGE = '#ff8a4a', BLUE = '#7fd6ff', GREEN = '#3ec9a0', PURPLE = '#b06bff';
const YOURS = [{ id: 'fizzpop', color: ORANGE, name: 'Fizzpop' }, { id: 'cinderpaw', color: ORANGE, name: 'Cinderpaw' }, { id: 'stoneward', color: BLUE, name: 'Stoneward' }];
const FOES = [{ id: 'glowtail', color: ORANGE, name: 'Glowtail', hp: 70 }, { id: 'mossback', color: GREEN, name: 'Mossback', hp: 100 }, { id: 'hexmoth', color: PURPLE, name: 'Hexmoth', hp: 45 }];

const VS = <div style={{ fontSize: 20, fontWeight: 900, color: '#9aa0b0', textShadow: '0 1px 4px #000', letterSpacing: 1 }}>VS</div>;
const MOVE = (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
    {['Burn', 'Charge', 'Overload'].map((m) => (
      <div key={m} style={{ fontSize: 11, fontWeight: 800, color: ORANGE, background: 'rgba(20,16,10,0.82)', border: `1px solid ${ORANGE}88`, borderRadius: 8, padding: '4px 10px', textShadow: '0 1px 2px #000' }}>{m}</div>
    ))}
  </div>
);

function Stage({ layout }) {
  if (layout === 'columns') {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{YOURS.map((m) => <Mon key={m.id} {...m} label={m.name} size={64} />)}</div>
        {MOVE}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{FOES.map((m) => <Mon key={m.id} {...m} label={m.name} size={64} />)}</div>
      </div>
    );
  }
  if (layout === 'rows') {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '18px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>{FOES.map((m) => <Mon key={m.id} {...m} label={m.name} size={64} />)}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg, transparent, #ffffff33, transparent)' }} />{VS}<div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg, transparent, #ffffff33, transparent)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>{YOURS.map((m) => <Mon key={m.id} {...m} label={m.name} size={72} />)}</div>
      </div>
    );
  }
  if (layout === 'diorama') {
    // faked depth: enemies up the field (smaller, raised), you near (bigger, low)
    return (
      <div style={{ position: 'absolute', inset: 0 }}>
        <div style={{ position: 'absolute', top: '14%', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 22, alignItems: 'flex-end' }}>
          <Mon {...FOES[0]} label={FOES[0].name} size={52} shadow />
          <Mon {...FOES[1]} label={FOES[1].name} size={58} shadow />
          <Mon {...FOES[2]} label={FOES[2].name} size={52} shadow />
        </div>
        <div style={{ position: 'absolute', top: '46%', left: '50%', transform: 'translateX(-50%)' }}>{MOVE}</div>
        <div style={{ position: 'absolute', bottom: '7%', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 14, alignItems: 'flex-end' }}>
          <Mon {...YOURS[0]} label={YOURS[0].name} size={78} shadow />
          <Mon {...YOURS[1]} label={YOURS[1].name} size={92} shadow />
          <Mon {...YOURS[2]} label={YOURS[2].name} size={78} shadow />
        </div>
      </div>
    );
  }
  // boss
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)' }}>
        <Mon id="glowtail" color={ORANGE} label="The Cinder Maw" size={138} hp={88} shadow />
      </div>
      <div style={{ position: 'absolute', bottom: '7%', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 16, alignItems: 'flex-end' }}>
        {YOURS.map((m) => <Mon key={m.id} {...m} label={m.name} size={60} shadow />)}
      </div>
    </div>
  );
}

export default function LayoutLab() {
  const [layout, setLayout] = useState('diorama');
  const [bg, setBg] = useState('outer-ring');
  return (
    <div style={{ minHeight: '100vh', background: '#06060c', color: '#e8e8f0', fontFamily: 'system-ui, sans-serif', padding: '20px 16px 60px' }}>
      <style>{`@keyframes lab-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }`}</style>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 1, color: '#ff8a4a' }}>BATTLEFIELD LAYOUTS</div>
        <div style={{ fontSize: 13, color: '#9aa0b0', marginTop: 4, lineHeight: 1.5 }}>
          Same painted front-on sprites the game already uses — only the STAGING changes. Tap a layout. Tap a ring to see it on different art.
        </div>

        {/* layout toggle */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0 10px' }}>
          {LAYOUTS.map((l) => (
            <button key={l.id} onClick={() => setLayout(l.id)}
              style={{ cursor: 'pointer', borderRadius: 10, padding: '8px 12px', textAlign: 'left',
                background: layout === l.id ? '#1a1410' : '#10101a', border: `2px solid ${layout === l.id ? '#ff8a4a' : '#23232f'}`, color: layout === l.id ? '#ffd0a8' : '#aab' }}>
              <div style={{ fontSize: 13, fontWeight: 900 }}>{l.name}</div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>{l.tag}</div>
            </button>
          ))}
        </div>

        {/* ring bg toggle */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {BGS.map((b) => (
            <button key={b.id} onClick={() => setBg(b.id)}
              style={{ cursor: 'pointer', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700,
                background: bg === b.id ? '#14233a' : '#0e0e16', border: `1px solid ${bg === b.id ? '#5aa9ff' : '#23232f'}`, color: bg === b.id ? '#9be7ff' : '#889' }}>{b.label}</button>
          ))}
        </div>

        {/* the arena */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 420, aspectRatio: '3 / 4', margin: '0 auto', borderRadius: 18, overflow: 'hidden', border: '1px solid #2a2a3a',
          background: `linear-gradient(180deg, rgba(11,11,20,0.25) 0%, rgba(11,11,20,0.68) 100%), url(/art/rings/${bg}.jpg) center/cover no-repeat` }}>
          <Stage layout={layout} />
        </div>

        <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.55, color: '#c8cdda', background: '#10101a', border: '1px solid #23232f', borderRadius: 10, padding: '12px 14px' }}>
          <b style={{ color: '#ff8a4a' }}>{LAYOUTS.find((l) => l.id === layout).name}.</b> {NOTE[layout]}
        </div>

        <div style={{ marginTop: 16, fontSize: 12.5, lineHeight: 1.6, color: '#9aa0b0', borderTop: '1px solid #1c1c28', paddingTop: 14 }}>
          <b style={{ color: '#cfd4e0' }}>On “different angles through the game.”</b> Each creature is one painted image — a fixed
          camera baked into the art. So the camera ANGLE on a creature is locked (a profile or top-down Cinderpaw
          would be a re-generated, drifted Cinderpaw). What we CAN vary freely is the staging above — and that’s
          enough to make the descent feel different: e.g. <i>Face-off</i> on the outer rings, <i>Diorama</i> as you
          go deeper, <i>Boss framing</i> for apex fights. The creatures stay front-on; the arena around them changes.
        </div>
      </div>
    </div>
  );
}
