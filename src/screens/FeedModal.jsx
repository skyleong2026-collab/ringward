import { ARCHETYPES } from '../data/creatures.js';
import { xpProgress, getAuraStyle, XP_PER_FEED } from '../engine/progression.js';
import { useState, useRef, useEffect } from 'react';

function FodderCard({ unit, selected, onToggle, isLastCopy }) {
  const color = ARCHETYPES[unit.archetype].color;
  return (
    <div
      onClick={onToggle}
      style={{
        background: selected ? '#1a2a1a' : '#0f0f1a',
        border: `2px solid ${selected ? color : isLastCopy ? '#8b4513' : '#2a2a3a'}`,
        borderRadius: 6,
        padding: '8px 10px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {selected && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          width: 14, height: 14, borderRadius: '50%',
          background: color, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 9, color: '#000', fontWeight: 900,
        }}>✓</div>
      )}
      <div style={{ fontSize: 11, fontWeight: 700, color: '#eee', letterSpacing: 0.5, marginBottom: 2 }}>
        {unit.name}
      </div>
      <div style={{ fontSize: 9, color, letterSpacing: 1 }}>
        {unit.archetype.slice(0, 3).toUpperCase()}
      </div>
      {isLastCopy && (
        <div style={{ fontSize: 9, color: '#c8691a', marginTop: 4 }}>⚠ last copy</div>
      )}
    </div>
  );
}

export default function FeedModal({ target, availableFodder, allCollection, squadIds, onConfirm, onClose }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const containerRef = useRef(null);
  const levelUpRef = useRef(null);

  const countInCollection = (creatureId) =>
    allCollection.filter((u) => u.id === creatureId).length;

  const alreadySelectedOfType = (creatureId) =>
    selectedIds.filter((id) => availableFodder.find((u) => u.instanceId === id)?.id === creatureId).length;

  function isLastCopy(unit) {
    const total = countInCollection(unit.id);
    const alreadyPicked = alreadySelectedOfType(unit.id);
    // target itself counts as a copy that won't be consumed
    const targetIsSame = target.id === unit.id ? 1 : 0;
    return (total - alreadyPicked - targetIsSame) <= 1;
  }

  function toggle(instanceId) {
    setSelectedIds((prev) =>
      prev.includes(instanceId) ? prev.filter((id) => id !== instanceId) : [...prev, instanceId]
    );
  }

  const prog = xpProgress(target.xp);
  const gainXp = selectedIds.length * XP_PER_FEED;
  const newXp = target.xp + gainXp;
  const newProg = xpProgress(newXp);
  // Same-species only, from reserve (not squad), excluding the target itself
  const dominated = availableFodder.filter(
    (u) => u.instanceId !== target.instanceId && u.id === target.id && !squadIds.includes(u.instanceId)
  );
  const hasLastCopySelected = selectedIds.some((id) => {
    const u = availableFodder.find((f) => f.instanceId === id);
    return u && isLastCopy(u);
  });
  const hasLevelUp = newProg.level > prog.level;

  useEffect(() => {
    if (hasLevelUp && levelUpRef.current) {
      levelUpRef.current.offsetHeight;
      levelUpRef.current.classList.add('level-up-text');
    }
  }, [hasLevelUp]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      zIndex: 100, display: 'flex', alignItems: 'flex-end',
    }}>
      <div style={{
        background: '#0d0d1a',
        border: '1px solid #2a2a3a',
        borderRadius: '12px 12px 0 0',
        padding: '20px 16px 32px',
        width: '100%',
        maxHeight: '85dvh',
        overflowY: 'auto',
        ...getAuraStyle(target.feedHistory),
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#eee', letterSpacing: 1 }}>
              Level up {target.name}
            </div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
              Lv.{prog.level}
              {prog.needed
                ? ` · ${prog.current}/${prog.needed} XP`
                : ' · MAX'
              }
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer', padding: 0 }}
          >×</button>
        </div>

        {/* XP preview bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: '#444', marginBottom: 4, letterSpacing: 1 }}>
            XP PROGRESS {gainXp > 0 && <span style={{ color: '#7ed321' }}>+{gainXp}</span>}
          </div>
          <div style={{ height: 6, background: '#1a1a2a', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${newProg.pct}%`,
              background: newProg.level > prog.level ? '#7ed321' : '#5a5aff',
              borderRadius: 3,
              transition: 'width 0.3s',
            }} />
          </div>
          {newProg.level > prog.level && (
            <div ref={levelUpRef} style={{ fontSize: 10, color: '#7ed321', marginTop: 4 }}>
              ↑ Level up: Lv.{prog.level} → Lv.{newProg.level}
            </div>
          )}
        </div>

        {/* Fodder grid */}
        <div style={{ fontSize: 10, color: '#444', letterSpacing: 2, marginBottom: 8 }}>
          SACRIFICE — SAME SPECIES FROM RESERVE
        </div>
        {dominated.length === 0 ? (
          <div style={{ color: '#333', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
            No duplicate {target.name}s in reserve to sacrifice.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
            {dominated.map((unit) => (
              <FodderCard
                key={unit.instanceId}
                unit={unit}
                selected={selectedIds.includes(unit.instanceId)}
                onToggle={() => toggle(unit.instanceId)}
                isLastCopy={isLastCopy(unit)}
              />
            ))}
          </div>
        )}

        {/* Last copy warning */}
        {hasLastCopySelected && (
          <div style={{
            background: '#2a1a08',
            border: '1px solid #8b451355',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 11,
            color: '#c8691a',
            marginBottom: 12,
          }}>
            ⚠ You've selected a last copy. Feeding it releases it permanently.
          </div>
        )}

        {/* Confirm */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px', background: '#1a1a2a', border: '1px solid #3a3a5a',
              borderRadius: 8, color: '#666', fontSize: 13, fontWeight: 700,
              letterSpacing: 1, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => selectedIds.length > 0 && onConfirm(target.instanceId, selectedIds)}
            disabled={selectedIds.length === 0}
            style={{
              padding: '12px',
              background: selectedIds.length > 0 ? '#7ed321' : '#1a2a1a',
              border: 'none',
              borderRadius: 8,
              color: selectedIds.length > 0 ? '#000' : '#333',
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: 1,
              cursor: selectedIds.length > 0 ? 'pointer' : 'default',
            }}
          >
            Feed {selectedIds.length > 0 ? `×${selectedIds.length}` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
