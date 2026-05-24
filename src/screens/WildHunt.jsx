import { ARCHETYPES } from '../data/creatures.js';

const ARCHETYPE_IMPLICATION = {
  Anchor:   'Draws all incoming fire',
  Predator: 'Hunts wounded targets',
  Ember:    'Scales with each round survived',
  Relay:    'Amplifies every allied action',
};

function SquadChip({ unit }) {
  const color = ARCHETYPES[unit.archetype]?.color || '#888';
  return (
    <div style={{
      background: color + '10',
      border: `1px solid ${color}25`,
      borderRadius: 5,
      padding: '5px 9px',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#bbb', letterSpacing: 0.5 }}>{unit.name}</span>
      <span style={{ fontSize: 8, color, letterSpacing: 0.5 }}>{unit.archetype.toUpperCase()}</span>
    </div>
  );
}

export default function WildHunt({ zone, target, playerSquad, onHunt, onBack }) {
  const targetColor = ARCHETYPES[target.archetype]?.color || '#888';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Header */}
      <div>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', color: '#444',
            fontSize: 12, cursor: 'pointer', letterSpacing: 1, padding: 0, marginBottom: 10,
          }}
        >
          ← {zone.name}
        </button>
        <div style={{ fontSize: 9, color: zone.color + 'aa', letterSpacing: 2, marginBottom: 6 }}>
          {zone.name.toUpperCase()}
        </div>
        <div style={{ fontSize: 11, color: '#333', lineHeight: 1.6 }}>
          {zone.description}
        </div>
      </div>

      {/* Target creature */}
      <div style={{
        background: '#0a0a14',
        border: `1px solid ${targetColor}28`,
        borderLeft: `3px solid ${targetColor}`,
        borderRadius: 6,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        <div style={{ fontSize: 9, color: '#2a2a3a', letterSpacing: 2 }}>TARGET SPOTTED</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#eee', letterSpacing: 1 }}>
            {target.name}
          </span>
          <span style={{
            fontSize: 9,
            color: targetColor,
            background: targetColor + '18',
            border: `1px solid ${targetColor}33`,
            borderRadius: 3,
            padding: '2px 7px',
            letterSpacing: 0.5,
          }}>
            {target.archetype.toUpperCase()}
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#3a3a4a' }}>
          {ARCHETYPE_IMPLICATION[target.archetype]}
        </div>
        <div style={{ fontSize: 10, color: '#222', marginTop: 4, fontStyle: 'italic' }}>
          {target.flavor}
        </div>
      </div>

      {/* Your squad */}
      {playerSquad.length > 0 ? (
        <div>
          <div style={{ fontSize: 8, color: '#252535', letterSpacing: 2, marginBottom: 8 }}>
            YOUR SQUAD — {playerSquad.length} UNIT{playerSquad.length !== 1 ? 'S' : ''}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {playerSquad.map((u, i) => (
              <SquadChip key={i} unit={u} />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: '#333', fontStyle: 'italic' }}>
          No squad assembled. Return to roster to build one.
        </div>
      )}

      {/* Hunt button */}
      <button
        onClick={onHunt}
        disabled={playerSquad.length === 0}
        style={{
          padding: '14px',
          background: playerSquad.length > 0 ? zone.color : '#111',
          border: 'none',
          borderRadius: 7,
          color: playerSquad.length > 0 ? '#fff' : '#333',
          fontSize: 13,
          fontWeight: 900,
          letterSpacing: 2,
          cursor: playerSquad.length > 0 ? 'pointer' : 'default',
          textTransform: 'uppercase',
        }}
      >
        Hunt
      </button>

    </div>
  );
}
