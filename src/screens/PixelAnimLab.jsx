// PixelAnimLab — prototype screen for previewing PixelLab-generated frame animations.
// Reach at <url>/#pixelanim
//
// Shows the 17 painterly-Midjourney creatures in two columns:
//   LEFT  — v3 variant  (painterly animated, animate-with-text-v3)
//   RIGHT — pixel variant (crisp pixel art, create-image-pixflux)
//
// Falls back gracefully to the static sprite when no frames are generated yet.
// State buttons let Sky preview each action across all creatures at once.
import { useState } from 'react';
import { FramePlayer } from '../components/FramePlayer.jsx';

// The 17 painted creatures from public/sprites/*.jpg
// These are the PixelLab source files — separate from the game engine creatures.js roster.
const PAINTED_CREATURES = [
  { id: 'cinderpaw',   name: 'Cinderpaw'   },
  { id: 'hexmoth',     name: 'Hexmoth'     },
  { id: 'frostwarden', name: 'Frostwarden' },
  { id: 'buzzline',    name: 'Buzzline'    },
  { id: 'tanglewing',  name: 'Tanglewing'  },
  { id: 'dartwing',    name: 'Dartwing'    },
  { id: 'swiftpaw',    name: 'Swiftpaw'    },
  { id: 'shadefang',   name: 'Shadefang'   },
  { id: 'veilclaw',    name: 'Veilclaw'    },
  { id: 'fizzpop',     name: 'Fizzpop'     },
  { id: 'glowtail',    name: 'Glowtail'    },
  { id: 'rimecaller',  name: 'Rimecaller'  },
  { id: 'blightcap',   name: 'Blightcap'   },
  { id: 'mossback',    name: 'Mossback'    },
  { id: 'stoneward',   name: 'Stoneward'   },
  { id: 'ironwall',    name: 'Ironwall'    },
  { id: 'dewleaf',     name: 'Dewleaf'     },
];

const ACTIONS = ['idle', 'attack', 'hurt', 'death'];
const ACTION_COLOR = { idle: '#9be7ff', attack: '#ff9a44', hurt: '#ff5566', death: '#8888aa' };

// For each creature: shows static source + v3 frames + pixel frames side by side.
function CreatureRow({ creature, action, showEvolved }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', borderBottom: '1px solid #1c1a24' }}>
      {/* label */}
      <div style={{ width: 72, fontSize: 10, fontWeight: 700, color: '#9a9ab0', textAlign: 'right', paddingRight: 6, flexShrink: 0 }}>
        {creature.name}
      </div>

      {/* source sprite (locked painting) */}
      <div style={{ textAlign: 'center' }}>
        <img
          src={`/sprites/${creature.id}.jpg`}
          alt={creature.id}
          onError={(e) => { e.target.style.opacity = 0.2; }}
          style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 6, background: '#0e0c14', display: 'block' }}
        />
        <div style={{ fontSize: 8, color: '#555', marginTop: 2 }}>source</div>
      </div>

      {/* v3 animated (painterly) */}
      <div style={{ textAlign: 'center' }}>
        <FramePlayer creature={creature} action={action} variant="v3" size={80} fps={8}
          style={{ borderRadius: 6, background: '#0e0c14', overflow: 'hidden' }} />
        <div style={{ fontSize: 8, color: '#9be7ff', marginTop: 2 }}>v3 · painterly</div>
      </div>

      {/* pixel variant */}
      <div style={{ textAlign: 'center' }}>
        <FramePlayer creature={creature} action={action} variant="pixel" size={80} fps={8}
          style={{ borderRadius: 6, background: '#0e0c14', overflow: 'hidden' }} />
        <div style={{ fontSize: 8, color: '#7ed98a', marginTop: 2 }}>pixel · crisp</div>
      </div>

      {/* evolved form (pixflux low-strength) */}
      {showEvolved && (
        <div style={{ textAlign: 'center' }}>
          <FramePlayer creature={creature} action="evolved" variant="pixel" size={80} fps={4}
            style={{ borderRadius: 6, background: '#1a0e0e', overflow: 'hidden' }} />
          <div style={{ fontSize: 8, color: '#ff9a44', marginTop: 2 }}>evolved</div>
        </div>
      )}
    </div>
  );
}

export default function PixelAnimLab() {
  const [action, setAction]           = useState('idle');
  const [showEvolved, setShowEvolved] = useState(false);

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: '#08060c', color: '#eaeaf0', fontFamily: 'system-ui, sans-serif', padding: '16px 12px 60px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        {/* header */}
        <div style={{ fontSize: 20, fontWeight: 900, color: '#ff9a44', letterSpacing: 1 }}>
          PIXEL ANIM LAB
          <span style={{ fontSize: 11, color: '#666', fontWeight: 700, marginLeft: 10 }}>prototype · not in the game</span>
        </div>
        <div style={{ fontSize: 12, color: '#8a8a9a', margin: '4px 0 12px', lineHeight: 1.5 }}>
          Left: locked painting (source). Middle: <span style={{ color: '#9be7ff' }}>v3 animated</span> (painterly look, adds motion).
          Right: <span style={{ color: '#7ed98a' }}>pixflux pixel</span> (redraws as crisp pixel art).
          Falls back to the static source until frames are generated.
        </div>

        {/* action picker */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          {ACTIONS.map((a) => (
            <button key={a} onClick={() => setAction(a)}
              style={{ padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 800,
                background: a === action ? '#1a1228' : '#15131c',
                color: a === action ? ACTION_COLOR[a] : '#6a6a7a',
                border: `1.5px solid ${a === action ? ACTION_COLOR[a] : '#2a2632'}` }}>
              {a.toUpperCase()}
            </button>
          ))}
          <button onClick={() => setShowEvolved((v) => !v)}
            style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 800,
              background: showEvolved ? '#1a0e0e' : '#15131c',
              color: showEvolved ? '#ff9a44' : '#6a6a7a',
              border: `1.5px solid ${showEvolved ? '#ff9a44' : '#2a2632'}` }}>
            {showEvolved ? '✦ evolved ON' : 'evolved OFF'}
          </button>
        </div>

        {/* column headers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: 78 }}>
          <div style={{ width: 80, fontSize: 9, color: '#555', textAlign: 'center', flexShrink: 0 }}>SOURCE</div>
          <div style={{ width: 80, fontSize: 9, color: '#9be7ff', textAlign: 'center', flexShrink: 0 }}>V3 PAINTERLY</div>
          <div style={{ width: 80, fontSize: 9, color: '#7ed98a', textAlign: 'center', flexShrink: 0 }}>PIXEL CRISP</div>
          {showEvolved && <div style={{ width: 80, fontSize: 9, color: '#ff9a44', textAlign: 'center', flexShrink: 0 }}>EVOLVED</div>}
        </div>

        {/* creature rows */}
        {PAINTED_CREATURES.map((c) => (
          <CreatureRow key={c.id} creature={c} action={action} showEvolved={showEvolved} />
        ))}

        {/* generation guide */}
        <div style={{ marginTop: 24, fontSize: 11, color: '#5a5a6a', lineHeight: 1.7, borderTop: '1px solid #1c1a24', paddingTop: 14 }}>
          <b style={{ color: '#8a8a9a' }}>To generate frames:</b><br />
          Add key: <code style={{ color: '#9be7ff' }}>echo "PIXELLAB_API_KEY=sk_..." &gt; scripts/pixellab/.env</code><br />
          Dry-run: <code style={{ color: '#9be7ff' }}>node scripts/pixellab/pixellab.mjs --v3 --creature cinderpaw --action idle</code><br />
          Arm: add <code style={{ color: '#ff9a44' }}>--go</code> · Pixel version: swap <code style={{ color: '#9be7ff' }}>--v3</code> for <code style={{ color: '#9be7ff' }}>--pixflux</code><br />
          Evolution: <code style={{ color: '#9be7ff' }}>--evolve --creature cinderpaw --strength 180 --go</code>
        </div>
      </div>
    </div>
  );
}
