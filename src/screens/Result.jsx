import { ARCHETYPES } from '../data/creatures.js';

function UnitRow({ unit, isWinnerSquad }) {
  const color = ARCHETYPES[unit.archetype].color;
  const t = unit.tel;
  const survived = unit.alive;

  function archetypeDetail() {
    switch (unit.archetype) {
      case 'Anchor':
        return t.shieldTriggers > 0
          ? `Shield triggered · Absorbed ${Math.round(t.shieldAbsorbed)} dmg`
          : `No shield trigger`;
      case 'Relay':
        return `${t.echoEvents} echo${t.echoEvents !== 1 ? 's' : ''} · +${Math.round(t.echoDamage)} echo dmg`;
      case 'Predator': {
        const execStr = t.executeHits > 0
          ? `Execute ×${t.executeHits} (${t.executeKills} kill${t.executeKills !== 1 ? 's' : ''})`
          : `No execute`;
        return `${execStr} · ${t.standardKills} standard kill${t.standardKills !== 1 ? 's' : ''} · Largest hit: ${Math.round(t.largestHit)}`;
      }
      case 'Ember':
        return `Peak ${t.peakStacks} stacks (rnd ${t.roundReachedPeak}) · ${t.damagePercent}% of squad dmg`;
      default:
        return '';
    }
  }

  return (
    <div
      style={{
        background: '#0f0f1a',
        border: `1px solid ${survived && isWinnerSquad ? color + '88' : '#1e1e2e'}`,
        borderLeft: `3px solid ${survived ? color : '#333'}`,
        borderRadius: 6,
        padding: '8px 12px',
        opacity: survived ? 1 : 0.6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#eee', letterSpacing: 0.5 }}>
            {unit.name}
          </span>
          <span
            style={{
              fontSize: 10,
              color,
              background: color + '22',
              padding: '1px 6px',
              borderRadius: 3,
            }}
          >
            {unit.archetype.toUpperCase()}
          </span>
        </div>
        <span style={{ fontSize: 11, color: survived ? '#7ed321' : '#d0021b' }}>
          {survived ? '✓ survived' : `fell rnd ${t.fell ?? '?'}`}
        </span>
      </div>
      <div style={{ fontSize: 11, color: '#888', display: 'flex', gap: 12, marginBottom: 3 }}>
        <span>Dealt <strong style={{ color: '#ccc' }}>{Math.round(t.damageDealt)}</strong></span>
        <span>Took <strong style={{ color: '#ccc' }}>{Math.round(t.damageTaken)}</strong></span>
      </div>
      <div style={{ fontSize: 10, color: '#555' }}>{archetypeDetail()}</div>
    </div>
  );
}

export default function Result({ result, onTryAgain, onNewBattle }) {
  const { winner, rounds, telemetry, outcomeText, coachingLine, seed } = result;
  const { squadA, squadB } = telemetry;

  const winnerLabel = winner === 'A' ? 'SQUAD A' : 'SQUAD B';
  const winColor = '#7ed321';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Result banner */}
      <div
        style={{
          background: '#0d1a0d',
          border: `1px solid ${winColor}55`,
          borderRadius: 8,
          padding: '14px 16px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900, color: winColor, letterSpacing: 2 }}>
          {winnerLabel} WON
        </div>
        <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
          Round {rounds} of 10
          <span style={{ color: '#333', margin: '0 8px' }}>·</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>seed:{seed.toString(16).toUpperCase().padStart(8, '0')}</span>
        </div>
      </div>

      {/* Per-unit breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {(['A', 'B']).map((side) => {
          const units = side === 'A' ? squadA : squadB;
          const isWinner = winner === side;
          return (
            <div key={side}>
              <div
                style={{
                  fontSize: 10,
                  color: isWinner ? winColor : '#555',
                  fontWeight: 700,
                  letterSpacing: 2,
                  marginBottom: 6,
                  textTransform: 'uppercase',
                }}
              >
                Squad {side}{isWinner ? ' ✓' : ''}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {units.map((u, i) => (
                  <UnitRow key={`${u.id}-${i}`} unit={u} isWinnerSquad={isWinner} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Outcome */}
      <div
        style={{
          background: '#0d0d18',
          border: '1px solid #2a2a3a',
          borderRadius: 8,
          padding: '12px 14px',
        }}
      >
        <div style={{ fontSize: 10, color: '#444', letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase' }}>
          Outcome
        </div>
        <div style={{ fontSize: 13, color: '#bbb', lineHeight: 1.5 }}>{outcomeText}</div>
      </div>

      {/* Coaching */}
      {coachingLine && (
        <div
          style={{
            background: '#1a1408',
            border: '1px solid #f5a62333',
            borderRadius: 8,
            padding: '12px 14px',
          }}
        >
          <div style={{ fontSize: 10, color: '#f5a623aa', letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase' }}>
            Coaching
          </div>
          <div style={{ fontSize: 13, color: '#cca060', lineHeight: 1.5 }}>{coachingLine}</div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button
          onClick={onTryAgain}
          style={{
            padding: '12px',
            background: '#1a1a2a',
            border: '1px solid #3a3a5a',
            borderRadius: 8,
            color: '#8888ff',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 1,
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          Try Again
        </button>
        <button
          onClick={onNewBattle}
          style={{
            padding: '12px',
            background: '#e86040',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 1,
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          New Battle
        </button>
      </div>
    </div>
  );
}
