import { CREATURES, ARCHETYPES } from '@8gents/game-data';

const ARCHETYPE_ORDER = ['Anchor', 'Relay', 'Predator', 'Ember'];

function StatBar({ label, value, max, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
      <span style={{ color: '#888', width: 30, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: '#222', borderRadius: 2 }}>
        <div
          style={{
            width: `${(value / max) * 100}%`,
            height: '100%',
            background: color,
            borderRadius: 2,
          }}
        />
      </div>
      <span style={{ color: '#ccc', width: 24, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function CreatureCard({ creature, onClick, inSquad, disabled }) {
  const color = ARCHETYPES[creature.archetype].color;
  return (
    <div
      data-creature={creature.id}
      onClick={!disabled ? onClick : undefined}
      style={{
        background: inSquad ? '#1a2a1a' : '#151520',
        border: `1px solid ${inSquad ? color : '#2a2a3a'}`,
        borderRadius: 8,
        padding: '10px 12px',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'border-color 0.15s, background 0.15s',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, gap: 4 }}>
        <span style={{ fontWeight: 700, fontSize: 12, color: '#eee', letterSpacing: 0.5, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {creature.name}
        </span>
        <span
          style={{
            fontSize: 9,
            color,
            background: color + '22',
            padding: '1px 4px',
            borderRadius: 3,
            letterSpacing: 0.5,
            flexShrink: 0,
          }}
        >
          {creature.archetype.slice(0, 3).toUpperCase()}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <StatBar label="HP"  value={creature.hp}     max={500} color="#4a90d9" />
        <StatBar label="ATK" value={creature.attack}  max={50}  color="#d0021b" />
        <StatBar label="ARM" value={creature.armor}   max={25}  color="#7ed321" />
        <StatBar label="SPD" value={creature.speed}   max={10}  color="#f5a623" />
      </div>
    </div>
  );
}

function SquadSlot({ unit, onRemove }) {
  const color = ARCHETYPES[unit.archetype].color;
  return (
    <div
      style={{
        background: '#12121e',
        border: `1px solid ${color}55`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 6,
        padding: '6px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#eee', letterSpacing: 0.5 }}>
          {unit.name}
        </div>
        <div style={{ fontSize: 10, color: '#666', marginTop: 1 }}>
          HP {unit.hp} · ATK {unit.attack} · ARM {unit.armor} · SPD {unit.speed}
        </div>
      </div>
      <button
        onClick={onRemove}
        style={{
          background: 'none',
          border: 'none',
          color: '#555',
          fontSize: 16,
          cursor: 'pointer',
          padding: '0 2px',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

export default function Builder({ squadA, squadB, onSquadAChange, onSquadBChange, onBattle }) {
  const [editing, setEditing] = React.useState('A');

  const activeSquad = editing === 'A' ? squadA : squadB;
  const setSquad = editing === 'A' ? onSquadAChange : onSquadBChange;

  function addUnit(creature) {
    if (activeSquad.length >= 8) return;
    setSquad([...activeSquad, { ...creature }]);
  }

  function removeUnit(squad, idx) {
    const setter = squad === 'A' ? onSquadAChange : onSquadBChange;
    const current = squad === 'A' ? squadA : squadB;
    setter(current.filter((_, i) => i !== idx));
  }

  const canBattle = squadA.length > 0 && squadB.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Squad panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {['A', 'B'].map((side) => {
          const sq = side === 'A' ? squadA : squadB;
          const isEditing = editing === side;
          return (
            <div key={side}>
              <button
                data-edit-squad={side}
                onClick={() => setEditing(side)}
                style={{
                  width: '100%',
                  background: isEditing ? '#1e1e30' : '#0f0f1a',
                  border: `1px solid ${isEditing ? '#5a5aff' : '#2a2a3a'}`,
                  borderRadius: '6px 6px 0 0',
                  padding: '8px 10px',
                  color: isEditing ? '#8888ff' : '#555',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>SQUAD {side}</span>
                <span style={{ fontWeight: 400, color: isEditing ? '#6666cc' : '#444' }}>
                  {sq.length}/8
                </span>
              </button>
              <div
                style={{
                  background: '#0d0d18',
                  border: `1px solid ${isEditing ? '#5a5aff' : '#2a2a3a'}`,
                  borderTop: 'none',
                  borderRadius: '0 0 6px 6px',
                  padding: 8,
                  minHeight: 120,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                }}
              >
                {sq.length === 0 ? (
                  <div style={{ color: '#333', fontSize: 11, textAlign: 'center', marginTop: 24 }}>
                    {isEditing ? 'Pick from roster below' : 'Empty'}
                  </div>
                ) : (
                  sq.map((u, i) => (
                    <SquadSlot key={`${u.id}-${i}`} unit={u} onRemove={() => removeUnit(side, i)} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Editing indicator */}
      <div style={{ textAlign: 'center', fontSize: 11, color: '#555' }}>
        Adding to{' '}
        <span style={{ color: '#8888ff', fontWeight: 700 }}>Squad {editing}</span>
        {activeSquad.length >= 8 && (
          <span style={{ color: '#d0021b', marginLeft: 8 }}>FULL</span>
        )}
      </div>

      {/* Roster */}
      <div>
        <div style={{ fontSize: 10, color: '#444', letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase' }}>
          Roster — click to add to Squad {editing}
        </div>
        {ARCHETYPE_ORDER.map((arch) => (
          <div key={arch} style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 10,
                color: ARCHETYPES[arch].color,
                letterSpacing: 2,
                marginBottom: 6,
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>── {arch}s</span>
              <div style={{ flex: 1, height: 1, background: ARCHETYPES[arch].color + '33' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {CREATURES.filter((c) => c.archetype === arch).map((creature) => {
                const alreadyIn = activeSquad.some((u) => u.id === creature.id);
                return (
                  <CreatureCard
                    key={creature.id}
                    creature={creature}
                    onClick={() => addUnit(creature)}
                    inSquad={alreadyIn}
                    disabled={activeSquad.length >= 8}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Battle button */}
      <button
        onClick={onBattle}
        disabled={!canBattle}
        style={{
          width: '100%',
          padding: '14px',
          background: canBattle ? '#e86040' : '#1a1a2a',
          border: 'none',
          borderRadius: 8,
          color: canBattle ? '#fff' : '#444',
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: 2,
          cursor: canBattle ? 'pointer' : 'default',
          textTransform: 'uppercase',
        }}
      >
        {canBattle ? 'Run Battle' : 'Add units to both squads'}
      </button>
    </div>
  );
}

// Need React in scope for JSX
import React from 'react';
