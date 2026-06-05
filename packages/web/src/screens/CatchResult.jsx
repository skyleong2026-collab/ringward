import { ARCHETYPES } from '@8gents/game-data';

export default function CatchResult({ caught, creature, zone, onWalkAgain, onRoster }) {
  const color = ARCHETYPES[creature.archetype]?.color || '#888';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {caught ? (
        <>
          {/* Catch banner */}
          <div style={{
            background: zone.color + '0a',
            border: `1px solid ${zone.color}33`,
            borderRadius: 8,
            padding: '20px 16px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            <div style={{ fontSize: 10, color: zone.color, letterSpacing: 2 }}>
              CAUGHT AT {zone.name.toUpperCase()}
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#eee', letterSpacing: 2 }}>
              {creature.name}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{
                fontSize: 9,
                color,
                background: color + '18',
                border: `1px solid ${color}33`,
                borderRadius: 3,
                padding: '2px 8px',
                letterSpacing: 1,
              }}>
                {creature.archetype.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#444', marginTop: 4, fontStyle: 'italic' }}>
              {creature.flavor}
            </div>
          </div>

          <div style={{ fontSize: 11, color: '#333', textAlign: 'center' }}>
            Added to your collection.
          </div>
        </>
      ) : (
        /* Fled banner */
        <div style={{
          background: '#0d0d18',
          border: '1px solid #1e1e2e',
          borderRadius: 8,
          padding: '20px 16px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{ fontSize: 10, color: '#444', letterSpacing: 2 }}>
            FLED — {zone.name.toUpperCase()}
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#555', letterSpacing: 2 }}>
            {creature.name}
          </div>
          <div style={{ fontSize: 11, color: '#333', marginTop: 4 }}>
            It got away. You know where it lives.
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button
          onClick={onWalkAgain}
          style={{
            padding: '12px',
            background: '#0d0d18',
            border: `1px solid ${zone.color}44`,
            borderRadius: 7,
            color: zone.color,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          Walk Again
        </button>
        <button
          onClick={onRoster}
          style={{
            padding: '12px',
            background: '#1a1a2a',
            border: '1px solid #3a3a5a',
            borderRadius: 7,
            color: '#888',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          Roster
        </button>
      </div>

    </div>
  );
}
