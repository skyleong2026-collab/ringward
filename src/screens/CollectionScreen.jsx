import { ARCHETYPES } from '../data/creatures.js';
import { xpProgress, getAuraStyle } from '../engine/progression.js';
import { useState, useEffect } from 'react';

const ARCHETYPE_ABBR = { Anchor: 'ANC', Relay: 'REL', Predator: 'PRE', Ember: 'EMB' };

function XpBar({ xp }) {
  const prog = xpProgress(xp);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#444', marginBottom: 2 }}>
        <span>Lv.{prog.level}</span>
        {prog.needed
          ? <span>{prog.current}/{prog.needed}</span>
          : <span style={{ color: '#7ed321' }}>MAX</span>
        }
      </div>
      <div style={{ height: 3, background: '#1a1a2a', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${prog.pct}%`,
          background: prog.needed ? '#5a5aff' : '#7ed321',
          borderRadius: 2,
        }} />
      </div>
    </div>
  );
}

function UnitCard({ unit, inSquad, squadFull, onToggleSquad, onFeed, canFeed, justFed }) {
  const arch = ARCHETYPES[unit.archetype];
  const aura = getAuraStyle(unit.feedHistory);
  const canAdd = !inSquad && !squadFull;
  const [bouncing, setBouncing] = useState(false);

  useEffect(() => {
    if (justFed) {
      setBouncing(true);
      const timer = setTimeout(() => setBouncing(false), 400);
      return () => clearTimeout(timer);
    }
  }, [justFed]);

  return (
    <div style={{
      background: '#0d0d18',
      border: `1px solid ${inSquad ? arch.color + '55' : '#1e1e2e'}`,
      borderRadius: 8,
      padding: '10px 10px 8px',
      display: 'flex',
      flexDirection: 'column',
      gap: 7,
      position: 'relative',
      ...aura,
      animation: bouncing ? 'card-bounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55), level-flash 0.5s ease-out' : 'none',
    }}>
      {inSquad && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          width: 8, height: 8, borderRadius: '50%',
          background: arch.color,
        }} />
      )}

      <div>
        <div style={{
          fontSize: 12, fontWeight: 900, color: unit.survivalCount >= 5 ? '#d4af37' : '#eee',
          letterSpacing: 0.5,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textShadow: unit.survivalCount >= 10 ? '0 0 8px rgba(212,175,55,0.4)' : 'none',
        }}>
          {unit.name}
          {unit.survivalCount >= 10 && ' ⚔'}
          {unit.survivalCount >= 5 && unit.survivalCount < 10 && ' •'}
        </div>
        <div style={{ fontSize: 9, color: arch.color, letterSpacing: 1, marginTop: 1 }}>
          {ARCHETYPE_ABBR[unit.archetype]}
          {unit.feedHistory.length > 0 && (
            <span style={{ color: '#555', marginLeft: 5 }}>
              ·{unit.feedHistory.length} fed
            </span>
          )}
          {unit.survivalCount > 0 && (
            <span style={{ color: '#d4af37', marginLeft: 5 }}>
              ·{unit.survivalCount} survived
            </span>
          )}
        </div>
        {unit.foundAt && (
          <div style={{ fontSize: 8, color: '#3a6a4a', letterSpacing: 0.5, marginTop: 1 }}>
            ∘ {unit.foundAt}
          </div>
        )}
        {unit.battleCount > 0 && (
          <div style={{ fontSize: 8, color: '#888', marginTop: 2, lineHeight: 1.2 }}>
            <div>{unit.winCount}-{unit.battleCount - unit.winCount} record · {unit.survivalStreak} streak</div>
            {unit.enemyMemory && unit.enemyMemory.length > 0 && (
              <div style={{ color: '#666', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                vs {unit.enemyMemory.slice(0, 2).join(', ')}{unit.enemyMemory.length > 2 ? '...' : ''}
              </div>
            )}
          </div>
        )}
      </div>

      <XpBar xp={unit.xp} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        <button
          onClick={() => onToggleSquad(unit.instanceId)}
          disabled={!inSquad && squadFull}
          style={{
            padding: '6px 4px',
            background: inSquad ? '#1a1a2a' : canAdd ? arch.color + '22' : '#0d0d18',
            border: `1px solid ${inSquad ? '#3a3a5a' : canAdd ? arch.color + '55' : '#1e1e2e'}`,
            borderRadius: 5,
            color: inSquad ? '#888' : canAdd ? arch.color : '#333',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 0.5,
            cursor: inSquad || canAdd ? 'pointer' : 'default',
          }}
        >
          {inSquad ? 'Remove' : squadFull ? 'Full' : 'Squad →'}
        </button>
        <button
          onClick={() => canFeed && onFeed(unit)}
          disabled={!canFeed}
          style={{
            padding: '6px 4px',
            background: canFeed ? '#1a2a1a' : '#0d0d18',
            border: `1px solid ${canFeed ? '#2a4a2a' : '#1e1e2e'}`,
            borderRadius: 5,
            color: canFeed ? '#7ed321' : '#333',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 0.5,
            cursor: canFeed ? 'pointer' : 'default',
          }}
        >
          Level up
        </button>
      </div>
    </div>
  );
}

function hasSameSpeciesToFeed(unit, collection, squadIds) {
  // A unit can level up if at least one OTHER unit of the same creature id exists in reserve
  return collection.some(
    (u) => u.id === unit.id && u.instanceId !== unit.instanceId && !squadIds.includes(u.instanceId)
  );
}

export default function CollectionScreen({ collection, squadIds, onToggleSquad, onFeed, onEncounters, onWalk, justFedInstanceId }) {
  const activeSquad = collection.filter((u) => squadIds.includes(u.instanceId));
  const reserve = collection.filter((u) => !squadIds.includes(u.instanceId));
  const squadFull = squadIds.length >= 8;
  const reserveFull = reserve.length >= 24;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 10, color: '#444', letterSpacing: 2 }}>
          SQUAD — {squadIds.length}/8
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onWalk}
            style={{
              padding: '9px 14px',
              background: 'none',
              border: '1px solid #2a4a3a',
              borderRadius: 7,
              color: '#3a6a4a',
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 1.5,
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            Walk
          </button>
          <button
            onClick={onEncounters}
            disabled={squadIds.length === 0}
            style={{
              padding: '9px 14px',
              background: squadIds.length > 0 ? '#e86040' : '#111',
              border: 'none',
              borderRadius: 7,
              color: squadIds.length > 0 ? '#fff' : '#333',
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 1.5,
              cursor: squadIds.length > 0 ? 'pointer' : 'default',
              textTransform: 'uppercase',
            }}
          >
            Battle →
          </button>
        </div>
      </div>

      {/* Active squad */}
      {activeSquad.length === 0 ? (
        <div style={{
          border: '1px dashed #1e1e2e', borderRadius: 8,
          padding: '20px', textAlign: 'center',
          fontSize: 11, color: '#333',
        }}>
          Add units from reserve to form your squad
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {activeSquad.map((u) => (
            <UnitCard
              key={u.instanceId}
              unit={u}
              inSquad={true}
              squadFull={squadFull}
              onToggleSquad={onToggleSquad}
              onFeed={onFeed}
              canFeed={hasSameSpeciesToFeed(u, collection, squadIds)}
              justFed={justFedInstanceId === u.instanceId}
            />
          ))}
        </div>
      )}

      {/* Reserve */}
      <div>
        <div style={{ fontSize: 10, color: '#444', letterSpacing: 2, marginBottom: 10 }}>
          RESERVE — {reserve.length}/24
          {reserveFull && <span style={{ color: '#d0021b', marginLeft: 8 }}>FULL</span>}
        </div>
        {reserve.length === 0 ? (
          <div style={{ fontSize: 11, color: '#333', textAlign: 'center', padding: '12px 0' }}>
            No reserve units
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {reserve.map((u) => (
              <UnitCard
                key={u.instanceId}
                unit={u}
                inSquad={false}
                squadFull={squadFull}
                onToggleSquad={onToggleSquad}
                onFeed={onFeed}
                canFeed={hasSameSpeciesToFeed(u, collection, squadIds)}
                justFed={justFedInstanceId === u.instanceId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
