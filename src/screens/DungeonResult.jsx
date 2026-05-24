import { ENCOUNTERS } from '../data/encounters.js';
import { ARCHETYPES } from '../data/creatures.js';

function enc(id) {
  return ENCOUNTERS.find((e) => e.id === id);
}

function EncounterBadge({ encounterId, won, isBoss }) {
  const encounter = enc(encounterId);
  if (!encounter) return null;
  return (
    <div style={{
      background: '#0d0d18',
      border: `1px solid ${won ? '#2a4a2a' : '#4a1a1a'}`,
      borderLeft: `3px solid ${won ? '#7ed321' : '#d0021b'}`,
      borderRadius: 6,
      padding: '10px 12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: won ? '#eee' : '#888', letterSpacing: 0.5 }}>
          {encounter.name}
          {isBoss && (
            <span style={{ fontSize: 8, color: '#d0021b', marginLeft: 6, letterSpacing: 1 }}>BOSS</span>
          )}
        </div>
        <div style={{ fontSize: 9, color: '#333', marginTop: 2 }}>{encounter.difficulty}</div>
      </div>
      <span style={{ fontSize: 11, color: won ? '#7ed321' : '#d0021b', fontWeight: 700 }}>
        {won ? '✓' : '✕'}
      </span>
    </div>
  );
}

function computeRunInsight(log, failed, failedAt) {
  if (!log || log.length === 0) return null;

  // Did HP attrition matter? (any unit entered last fight below 50% HP)
  const lastEntry = log[log.length - 1];
  const depleted = lastEntry?.hpSnapshot
    ? Object.values(lastEntry.hpSnapshot).some((s) => s.pct < 50)
    : false;

  if (failed && failedAt) {
    const encounter = enc(failedAt);
    if (depleted) {
      return `Squad entered ${encounter?.name || failedAt} already depleted. Attrition decided the run.`;
    }
    return `${encounter?.name || failedAt} exposed a build weakness. Same squad, fresh HP, might answer it.`;
  }

  if (depleted) {
    return 'Squad cleared the boss with depleted HP. Strong enough to push further.';
  }
  return 'Squad cleared the dungeon with HP to spare. The build held.';
}

export default function DungeonResult({ dungeonRun, runLog, collection, squadIds, onRunAgain, onReturn }) {
  const { dungeon, failed, failedAt } = dungeonRun;
  const color = dungeon.color;
  const insight = computeRunInsight(runLog, failed, failedAt);
  const totalXp = runLog?.reduce((s, e) => s + (e.xpEarned || 0), 0) || 0;

  const cleared = runLog?.filter((e) => e.won).map((e) => ({ encounterId: e.encounterId, isBoss: e.isBoss })) || [];
  const failedEncounter = failed ? { encounterId: failedAt, isBoss: dungeon.nodes[dungeon.nodes.length - 1]?.encounterId === failedAt } : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Banner */}
      <div style={{
        background: failed ? '#1a0d0d' : '#0d1a0d',
        border: `1px solid ${failed ? '#d0021b44' : '#7ed32144'}`,
        borderRadius: 8,
        padding: '16px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: failed ? '#d0021b' : '#7ed321', letterSpacing: 2 }}>
          {failed ? 'RUN FAILED' : 'DUNGEON CLEARED'}
        </div>
        <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>{dungeon.name}</div>
        {totalXp > 0 && (
          <div style={{ fontSize: 12, color: '#7ed321', marginTop: 8 }}>+{totalXp} XP earned</div>
        )}
      </div>

      {/* Encounter log */}
      <div style={{ background: '#0a0a14', border: '1px solid #1a1a2a', borderRadius: 8, padding: '12px 14px' }}>
        <div style={{ fontSize: 9, color: '#444', letterSpacing: 2, marginBottom: 10 }}>RUN LOG</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {cleared.map((e, i) => (
            <EncounterBadge key={i} encounterId={e.encounterId} won={true} isBoss={e.isBoss} />
          ))}
          {failedEncounter && (
            <EncounterBadge encounterId={failedEncounter.encounterId} won={false} isBoss={failedEncounter.isBoss} />
          )}
        </div>
      </div>

      {/* Insight */}
      {insight && (
        <div style={{
          background: '#0d0d18',
          border: '1px solid #2a2a3a',
          borderRadius: 8,
          padding: '12px 14px',
        }}>
          <div style={{ fontSize: 9, color: color, letterSpacing: 2, marginBottom: 6 }}>DEBRIEF</div>
          <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>{insight}</div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button
          onClick={onReturn}
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
          Roster
        </button>
        <button
          onClick={onRunAgain}
          style={{
            padding: '12px',
            background: color,
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
          Run Again
        </button>
      </div>
    </div>
  );
}
