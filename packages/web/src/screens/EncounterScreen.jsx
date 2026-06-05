import { ARCHETYPES } from '@8gents/game-data';

const DIFFICULTY_COLOR = {
  Balanced:   '#8888ff',
  Defensive:  '#4a90d9',
  Aggressive: '#d0021b',
};

function EnemyUnitChip({ unit }) {
  const color = ARCHETYPES[unit.archetype].color;
  return (
    <span style={{
      fontSize: 10,
      color,
      background: color + '18',
      border: `1px solid ${color}44`,
      borderRadius: 4,
      padding: '2px 7px',
      letterSpacing: 0.5,
      whiteSpace: 'nowrap',
    }}>
      {unit.name}
    </span>
  );
}

function EncounterCard({ encounter, playerSquadSize, onRun, history }) {
  const diff = encounter.difficulty;
  const diffColor = DIFFICULTY_COLOR[diff] || '#888';
  const record = history?.[encounter.id];
  const totalFights = (record?.wins || 0) + (record?.losses || 0);

  return (
    <div style={{
      background: '#0d0d18',
      border: '1px solid #1e1e2e',
      borderRadius: 10,
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 900, color: '#eee', letterSpacing: 1 }}>
            {encounter.name}
          </span>
          {totalFights > 0 && (
            <span style={{ fontSize: 9, color: '#666' }}>
              {record.wins}-{record.losses} record
            </span>
          )}
        </div>
        <span style={{
          fontSize: 9,
          color: diffColor,
          background: diffColor + '18',
          border: `1px solid ${diffColor}44`,
          borderRadius: 3,
          padding: '2px 6px',
          letterSpacing: 1,
        }}>
          {diff.toUpperCase()}
        </span>
      </div>

      <div style={{ fontSize: 11, color: '#555', lineHeight: 1.5 }}>
        {encounter.flavor}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {encounter.squad.map((u, i) => (
          <EnemyUnitChip key={i} unit={u} />
        ))}
      </div>

      <button
        onClick={() => onRun(encounter)}
        disabled={playerSquadSize === 0}
        style={{
          padding: '11px',
          background: playerSquadSize > 0 ? '#e86040' : '#111',
          border: 'none',
          borderRadius: 7,
          color: playerSquadSize > 0 ? '#fff' : '#333',
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: 1.5,
          cursor: playerSquadSize > 0 ? 'pointer' : 'default',
          textTransform: 'uppercase',
          marginTop: 4,
        }}
      >
        {playerSquadSize > 0 ? 'Run Battle' : 'Add units to squad first'}
      </button>
    </div>
  );
}

export default function EncounterScreen({ encounters, playerSquadSize, onRun, onBack, encounterHistory }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', color: '#555',
            fontSize: 12, cursor: 'pointer', letterSpacing: 1, padding: 0,
          }}
        >
          ← Roster
        </button>
        <span style={{ fontSize: 11, color: '#333' }}>
          Squad: {playerSquadSize}/8
        </span>
      </div>

      <div style={{ fontSize: 10, color: '#444', letterSpacing: 2 }}>
        CHOOSE ENCOUNTER
      </div>

      {encounters.map((enc) => (
        <EncounterCard
          key={enc.id}
          encounter={enc}
          playerSquadSize={playerSquadSize}
          onRun={onRun}
          history={encounterHistory}
        />
      ))}
    </div>
  );
}
