import { ENCOUNTERS, ARCHETYPES } from '@8gents/game-data';

function enc(id) {
  return ENCOUNTERS.find((e) => e.id === id);
}

function NodeDots({ dungeon, nodeIndex }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      {dungeon.nodes.map((node, i) => {
        const done = i < nodeIndex;
        const active = i === nodeIndex;
        const color = dungeon.color;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: active ? 10 : 8,
              height: active ? 10 : 8,
              borderRadius: '50%',
              background: done ? color : active ? color : '#1a1a2a',
              border: `1px solid ${done || active ? color : '#2a2a3a'}`,
              opacity: done ? 0.5 : 1,
              flexShrink: 0,
            }} />
            {i < dungeon.nodes.length - 1 && (
              <div style={{ width: 16, height: 1, background: done ? dungeon.color + '55' : '#1a1a2a' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function HpBar({ current, max, color }) {
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
  const barColor = pct > 60 ? '#7ed321' : pct > 30 ? '#f5a623' : '#d0021b';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 3, background: '#1a1a2a', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 9, color: pct < 40 ? '#d0021b' : '#444', minWidth: 50, textAlign: 'right' }}>
        {Math.round(current)}/{max}
      </span>
    </div>
  );
}

function SquadStatus({ collection, squadIds, hpOverrides }) {
  const squad = collection.filter((u) => squadIds.includes(u.instanceId));
  const anyDepleted = squad.some((u) => (hpOverrides[u.instanceId] ?? u.hp) < u.hp);
  if (!anyDepleted) return null;

  return (
    <div style={{ background: '#0d0d18', border: '1px solid #2a2a3a', borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ fontSize: 9, color: '#444', letterSpacing: 2, marginBottom: 10 }}>SQUAD HP — ENTERING NEXT FIGHT</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {squad.map((u) => {
          const current = hpOverrides[u.instanceId] ?? u.hp;
          const arch = ARCHETYPES[u.archetype];
          return (
            <div key={u.instanceId}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: '#888' }}>{u.name}</span>
                <span style={{ fontSize: 9, color: arch.color, letterSpacing: 0.5 }}>{u.archetype.toUpperCase()}</span>
              </div>
              <HpBar current={current} max={u.hp} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EncounterCard({ node, onSelect, color, active }) {
  const encounter = enc(node.encounterId);
  if (!encounter) return null;
  const archetypeCounts = {};
  for (const u of encounter.squad) {
    archetypeCounts[u.archetype] = (archetypeCounts[u.archetype] || 0) + 1;
  }
  return (
    <button
      onClick={onSelect}
      style={{
        background: active ? color + '0d' : '#0d0d18',
        border: `1px solid ${active ? color + '44' : '#2a2a3a'}`,
        borderRadius: 8,
        padding: '14px',
        textAlign: 'left',
        cursor: 'pointer',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#eee', letterSpacing: 0.5 }}>
          {node.label || encounter.name}
        </span>
        <span style={{
          fontSize: 8, color,
          background: color + '18', border: `1px solid ${color}35`,
          borderRadius: 3, padding: '1px 6px', letterSpacing: 1,
        }}>
          {encounter.difficulty?.toUpperCase()}
        </span>
      </div>
      <div style={{ fontSize: 10, color: '#555', lineHeight: 1.5, marginBottom: 8 }}>
        {node.hint || encounter.flavor}
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {Object.entries(archetypeCounts).map(([arch, count]) => (
          <span key={arch} style={{
            fontSize: 8, color: ARCHETYPES[arch]?.color || '#888',
            background: (ARCHETYPES[arch]?.color || '#888') + '15',
            border: `1px solid ${(ARCHETYPES[arch]?.color || '#888')}30`,
            borderRadius: 3, padding: '1px 5px',
          }}>
            {count}× {arch}
          </span>
        ))}
      </div>
    </button>
  );
}

// ── Dungeon select (no active run) ───────────────────────────────────────────
function DungeonSelect({ dungeons, onStart, onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#444', fontSize: 12, cursor: 'pointer', letterSpacing: 1, padding: 0, marginBottom: 12 }}>
          ← Roster
        </button>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#eee', letterSpacing: 1 }}>Dungeon</div>
        <div style={{ fontSize: 11, color: '#333', marginTop: 4, lineHeight: 1.6 }}>
          Three encounters. No healing. What breaks first?
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {dungeons.map((d) => (
          <button
            key={d.id}
            onClick={() => onStart(d)}
            style={{
              background: '#0d0d18',
              border: `1px solid ${d.color}44`,
              borderRadius: 8,
              padding: '16px',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: '#eee', letterSpacing: 0.5 }}>{d.name}</span>
              <span style={{ fontSize: 9, color: d.color, letterSpacing: 1 }}>3 ENCOUNTERS</span>
            </div>
            <div style={{ fontSize: 11, color: '#555', lineHeight: 1.5 }}>{d.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Dungeon map (active run) ─────────────────────────────────────────────────
function DungeonMap({ dungeonRun, collection, squadIds, onSelectEncounter, onAbandon }) {
  const { dungeon, nodeIndex, hpOverrides } = dungeonRun;
  const node = dungeon.nodes[nodeIndex];
  const color = dungeon.color;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 9, color: color, letterSpacing: 2, marginBottom: 4 }}>DUNGEON</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#eee', letterSpacing: 1 }}>{dungeon.name}</div>
          </div>
          <button
            onClick={onAbandon}
            style={{ background: 'none', border: 'none', color: '#333', fontSize: 10, cursor: 'pointer', letterSpacing: 1, paddingTop: 4 }}
          >
            abandon
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          <NodeDots dungeon={dungeon} nodeIndex={nodeIndex} />
          <div style={{ fontSize: 9, color: '#333', letterSpacing: 1 }}>
            ENCOUNTER {nodeIndex + 1} OF {dungeon.nodes.length}
            {node.type === 'boss' && <span style={{ color: '#d0021b', marginLeft: 8 }}>BOSS</span>}
          </div>
        </div>
      </div>

      <SquadStatus collection={collection} squadIds={squadIds} hpOverrides={hpOverrides} />

      {node.type === 'fork' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 9, color: '#333', letterSpacing: 2 }}>CHOOSE YOUR PATH</div>
          {node.options.map((opt) => (
            <EncounterCard
              key={opt.encounterId}
              node={opt}
              color={color}
              active={false}
              onSelect={() => onSelectEncounter(opt.encounterId)}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <EncounterCard
            node={node}
            color={color}
            active={true}
            onSelect={() => onSelectEncounter(node.encounterId)}
          />
          <button
            onClick={() => onSelectEncounter(node.encounterId)}
            style={{
              padding: '14px',
              background: color,
              border: 'none',
              borderRadius: 7,
              color: '#fff',
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: 2,
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {node.type === 'boss' ? 'Enter Boss Fight →' : 'Enter Encounter →'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Export: auto-switches between select / map ───────────────────────────────
export default function DungeonScreen({ dungeons, dungeonRun, collection, squadIds, onStart, onSelectEncounter, onAbandon, onBack }) {
  if (!dungeonRun) {
    return <DungeonSelect dungeons={dungeons} onStart={onStart} onBack={onBack} />;
  }
  return (
    <DungeonMap
      dungeonRun={dungeonRun}
      collection={collection}
      squadIds={squadIds}
      onSelectEncounter={onSelectEncounter}
      onAbandon={onAbandon}
    />
  );
}
