import { useEffect, useRef } from 'react';
import { useBattleRunner } from '../hooks/useBattleRunner.js';
import { ARCHETYPES } from '../data/creatures.js';

// ─── HP Bar ───────────────────────────────────────────────────────────────────
function HPBar({ currentHP, maxHP, archetype, shield = 0, isActive }) {
  const pct    = Math.max(0, Math.min(1, currentHP / maxHP));
  const color  = ARCHETYPES[archetype]?.color ?? '#888';
  const shPct  = Math.min(1, shield / maxHP);
  const danger = pct < 0.25;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1 }}>
      <div style={{ position: 'relative', flex: 1, height: 6, background: '#0d0d1a', borderRadius: 3, overflow: 'hidden' }}>
        {/* HP fill */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct * 100}%`,
          background: danger ? '#d0021b' : color,
          borderRadius: 3,
          transition: 'width 0.3s ease, background 0.2s',
          boxShadow: isActive ? `0 0 6px ${color}80` : 'none',
        }} />
        {/* Shield overlay */}
        {shield > 0 && (
          <div style={{
            position: 'absolute', left: `${pct * 100}%`, top: 0, bottom: 0,
            width: `${shPct * 100}%`,
            background: '#4a90d940',
            borderLeft: '1px solid #4a90d9',
          }} />
        )}
      </div>
      <span style={{
        fontSize: 9, color: danger ? '#d0021b' : '#555',
        fontFamily: 'monospace', whiteSpace: 'nowrap', minWidth: 36, textAlign: 'right',
      }}>
        {Math.round(currentHP)}/{maxHP}
      </span>
    </div>
  );
}

// ─── Unit Row ─────────────────────────────────────────────────────────────────
function UnitRow({ unit, isActive, isTarget, isRedirectOption, onRedirect }) {
  const color = ARCHETYPES[unit.archetype]?.color ?? '#888';
  const dead  = !unit.alive;

  return (
    <div
      onClick={isRedirectOption ? () => onRedirect(unit.uid ?? unit.id) : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        borderRadius: 5,
        border: isActive  ? `1px solid ${color}60` :
                isTarget  ? '1px solid #e8604060'   :
                isRedirectOption ? '1px solid #44446660' : '1px solid transparent',
        background: isActive  ? `${color}0a` :
                    isTarget  ? '#e860400a'  :
                    isRedirectOption ? '#1a1a2a' : 'transparent',
        opacity: dead ? 0.35 : 1,
        cursor: isRedirectOption ? 'pointer' : 'default',
        transition: 'all 0.2s',
      }}
    >
      {/* Archetype pip */}
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: dead ? '#333' : color, flexShrink: 0 }} />

      {/* Name + archetype */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: dead ? '#333' : '#ccc', letterSpacing: 0.3 }}>
          {unit.name}
          {unit.stokeStacks > 0 && !dead && (
            <span style={{ fontSize: 8, color: '#f5a623', marginLeft: 4 }}>▲{unit.stokeStacks}</span>
          )}
        </span>
        <span style={{ fontSize: 8, color: dead ? '#222' : color, letterSpacing: 0.5 }}>
          {unit.archetype.toUpperCase()}
          {unit.shield > 0 && <span style={{ color: '#4a90d9', marginLeft: 4 }}>SHIELDED</span>}
        </span>
      </div>

      {/* HP bar or DEAD */}
      {dead ? (
        <span style={{ fontSize: 9, color: '#333', letterSpacing: 1 }}>DEAD</span>
      ) : (
        <HPBar
          currentHP={unit.currentHP}
          maxHP={unit.maxHP}
          archetype={unit.archetype}
          shield={unit.shield}
          isActive={isActive}
        />
      )}

      {/* Redirect affordance */}
      {isRedirectOption && !dead && (
        <span style={{ fontSize: 8, color: '#555', marginLeft: 4, flexShrink: 0 }}>TAP</span>
      )}
    </div>
  );
}

// ─── Squad Panel ──────────────────────────────────────────────────────────────
function SquadPanel({ label, units, activeId, targetId, redirectOptions, onRedirect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 8, color: '#222', letterSpacing: 2, marginBottom: 2 }}>{label}</div>
      {units.map((u, idx) => (
        <UnitRow
          key={u.uid ?? u.instanceId ?? `${u.id}_${idx}`}
          unit={u}
          isActive={u.uid === activeId}
          isTarget={u.uid === targetId}
          isRedirectOption={redirectOptions}
          onRedirect={onRedirect}
        />
      ))}
    </div>
  );
}

// ─── Pending Action Panel ─────────────────────────────────────────────────────
function PendingActionPanel({ step, interventionsLeft, onRedirect, onResume }) {
  const actorColor  = ARCHETYPES[step.actor.archetype]?.color ?? '#888';
  const targetColor = ARCHETYPES[step.proposedTarget.archetype]?.color ?? '#888';
  const canRedirect = interventionsLeft > 0 && step.aliveEnemies.length > 1;

  return (
    <div style={{
      border: '1px solid #1e2e3e',
      borderLeft: '2px solid #4a90d9',
      background: '#060614',
      borderRadius: 6,
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 8, color: '#4a90d9', letterSpacing: 2, fontFamily: 'monospace' }}>
          ◼ PAUSED — PENDING ACTION
        </span>
        <span style={{ fontSize: 8, color: '#333', letterSpacing: 1 }}>
          {interventionsLeft} redirect{interventionsLeft !== 1 ? 's' : ''} left
        </span>
      </div>

      {/* Action preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: actorColor }}>{step.actor.name}</span>
        <span style={{ fontSize: 10, color: '#333' }}>→</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: targetColor }}>{step.proposedTarget.name}</span>
      </div>

      {/* Redirect options */}
      {canRedirect && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 8, color: '#333', letterSpacing: 1 }}>REDIRECT TARGET:</div>
          {step.aliveEnemies.map((enemy) => {
            const ec = ARCHETYPES[enemy.archetype]?.color ?? '#888';
            const isCurrent = enemy.uid === step.proposedTarget.uid;
            return (
              <div
                key={enemy.uid ?? enemy.id}
                onClick={() => !isCurrent && onRedirect(step.actorId, enemy.uid)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 4,
                  border: isCurrent ? `1px solid ${ec}50` : '1px solid #1a1a2a',
                  background: isCurrent ? `${ec}10` : '#0d0d1a',
                  cursor: isCurrent ? 'default' : 'pointer',
                  opacity: isCurrent ? 0.6 : 1,
                }}
              >
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: ec, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: '#bbb', flex: 1 }}>{enemy.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 60, height: 4, background: '#0d0d1a', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(enemy.currentHP / enemy.maxHP) * 100}%`, background: ec, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 8, color: '#444', minWidth: 28, textAlign: 'right' }}>
                    {Math.round(enemy.currentHP)}
                  </span>
                </div>
                {isCurrent && <span style={{ fontSize: 8, color: ec, marginLeft: 4 }}>CURRENT</span>}
                {!isCurrent && <span style={{ fontSize: 8, color: '#4a90d9', marginLeft: 4 }}>→</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Resume */}
      <button
        onClick={onResume}
        style={{
          padding: '10px',
          background: 'none',
          border: '1px solid #252535',
          borderRadius: 5,
          color: '#666',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 2,
          cursor: 'pointer',
          textTransform: 'uppercase',
        }}
      >
        Resume Battle
      </button>
    </div>
  );
}

// ─── Combat Log ───────────────────────────────────────────────────────────────
function CombatLog({ entries }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <div
      ref={ref}
      style={{
        maxHeight: 100,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        paddingRight: 2,
      }}
    >
      {entries.map((line, i) => {
        const isProc   = line.startsWith('  ◆') || line.startsWith('  ◈');
        const isEcho   = line.startsWith('  ↳');
        const isDefeat = line.includes('DEFEATED');
        return (
          <div key={i} style={{
            fontSize: isProc || isEcho ? 9 : 10,
            color: isDefeat  ? '#e86040' :
                   isProc    ? '#9b59b6' :
                   isEcho    ? '#7ed321' :
                   i === entries.length - 1 ? '#ccc' : '#444',
            fontFamily: 'monospace',
            lineHeight: 1.5,
          }}>
            {line}
          </div>
        );
      })}
    </div>
  );
}

// ─── BattleScreen ─────────────────────────────────────────────────────────────
export default function BattleScreen({ playerSquad, enemySquad, seed, onComplete }) {
  const {
    start, pause, resume, redirect,
    phase, currentStep, unitsSnapshot,
    combatLog, interventionsLeft, result,
  } = useBattleRunner({ squadA: playerSquad, squadB: enemySquad, seed });

  // Start on mount
  useEffect(() => { start(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When complete, hand result to parent after a short delay for final state to render
  useEffect(() => {
    if (result) {
      const t = setTimeout(() => onComplete(result), 900);
      return () => clearTimeout(t);
    }
  }, [result, onComplete]);

  const round    = currentStep?.round ?? 1;
  const isPaused = phase === 'paused';
  const isAtPendingAction = isPaused && currentStep?.type === 'pending_action';

  // Determine which unit IDs are currently active/target
  const activeId = currentStep?.actorId ?? null;
  const targetId = isAtPendingAction ? currentStep.proposedTarget?.id : null;

  // Separate player (A) and enemy (B) snapshots
  const playerUnits = unitsSnapshot.A;
  const enemyUnits  = unitsSnapshot.B;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Battle header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 8, color: '#252535', letterSpacing: 2 }}>BATTLE</span>
          <span style={{ fontSize: 11, color: '#ccc' }}>
            Round <span style={{ color: '#eee', fontWeight: 700 }}>{round}</span>
            <span style={{ color: '#333' }}> / 10</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Intervention budget */}
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: i < interventionsLeft ? '#4a90d9' : '#1a1a2a',
                border: '1px solid #252535',
              }} />
            ))}
          </div>

          {/* Pause / Resume */}
          {phase !== 'complete' && (
            <button
              onClick={isPaused ? resume : pause}
              style={{
                padding: '6px 12px',
                background: 'none',
                border: `1px solid ${isPaused ? '#4a90d9' : '#252535'}`,
                borderRadius: 4,
                color: isPaused ? '#4a90d9' : '#555',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1,
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {isPaused ? 'RESUME' : '⏸ PAUSE'}
            </button>
          )}

          {phase === 'complete' && (
            <span style={{ fontSize: 9, color: '#333', letterSpacing: 1 }}>DONE</span>
          )}
        </div>
      </div>

      {/* Player squad */}
      <SquadPanel
        label="YOUR SQUAD"
        units={playerUnits}
        activeId={activeId}
        targetId={null}
        redirectOptions={false}
        onRedirect={null}
      />

      {/* Divider */}
      <div style={{ borderTop: '1px solid #0d0d1a', position: 'relative' }}>
        <span style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#080810', padding: '0 8px',
          fontSize: 8, color: '#1a1a2a', letterSpacing: 2,
        }}>
          VS
        </span>
      </div>

      {/* Enemy squad */}
      <SquadPanel
        label="ENEMY"
        units={enemyUnits}
        activeId={activeId}
        targetId={targetId}
        redirectOptions={false}
        onRedirect={null}
      />

      {/* Pending action panel — shown when paused at a decision point */}
      {isAtPendingAction && (
        <PendingActionPanel
          step={currentStep}
          interventionsLeft={interventionsLeft}
          onRedirect={redirect}
          onResume={resume}
        />
      )}

      {/* Combat log */}
      {combatLog.length > 0 && (
        <div style={{
          borderTop: '1px solid #0d0d1a',
          paddingTop: 10,
        }}>
          <div style={{ fontSize: 8, color: '#1a1a2a', letterSpacing: 2, marginBottom: 6 }}>
            COMBAT LOG
          </div>
          <CombatLog entries={combatLog} />
        </div>
      )}

    </div>
  );
}
