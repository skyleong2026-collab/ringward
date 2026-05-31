import { useEffect, useState } from 'react';
import { useRef } from 'react';
import { useBattleRunner } from '../hooks/useBattleRunner.js';
import { SPARK_DETONATE_THRESHOLD } from '../engine/battleStepEngine.js';
import { BattleStage } from '../components/BattleStage.jsx';
import { ARCHETYPES } from '../data/creatures.js';

// ─── Pending Action Panel ─────────────────────────────────────────────────────
// Verb toggle: REDIRECT (repoint the acting unit's target) | ANCHOR (lock an
// enemy out of its next action). Both draw from the shared 3-intervention budget.
// anchorTargets: always the player's enemies (squad B alive), regardless of who's acting.
function PendingActionPanel({ step, interventionsLeft, onRedirect, onAnchor, onResonate, onResume, anchorTargets }) {
  const [verb, setVerb] = useState('redirect');

  const actorColor  = ARCHETYPES[step.actor.archetype]?.color ?? '#888';
  const targetColor = ARCHETYPES[step.proposedTarget.archetype]?.color ?? '#888';
  const canAct = interventionsLeft > 0;

  // Resonate is a player-side verb: only when YOUR unit is acting and a free
  // (not-yet-acted) ally exists to pull into the strike.
  const isPlayerActor = step.actorSquad === 'A';
  const partners = step.resonancePartners ?? [];
  const canResonate = isPlayerActor && partners.length > 0;

  // If the current verb is no longer valid for this actor, fall back to redirect.
  const verbs = ['redirect', 'anchor', ...(canResonate ? ['resonate'] : [])];
  const activeVerb = verbs.includes(verb) ? verb : 'redirect';

  return (
    <div style={{
      border: '1px solid #1e2e3e', borderLeft: '2px solid #4a90d9',
      background: '#060614', borderRadius: 6, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 8, color: '#4a90d9', letterSpacing: 2, fontFamily: 'monospace' }}>
          ◼ PAUSED
        </span>
        <span style={{ fontSize: 8, color: '#333', letterSpacing: 1 }}>
          {interventionsLeft} intervention{interventionsLeft !== 1 ? 's' : ''} left
        </span>
      </div>

      {/* current action preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: actorColor }}>{step.actor.name}</span>
        <span style={{ fontSize: 10, color: '#333' }}>→</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: targetColor }}>{step.proposedTarget.name}</span>
      </div>

      {/* verb toggle */}
      {canAct && (
        <div style={{ display: 'flex', gap: 6 }}>
          {verbs.map((id) => {
            const accent = id === 'resonate' ? '#b06bff' : '#4a90d9';
            const label = id === 'anchor' ? '⚓ ANCHOR' : id === 'resonate' ? '◇ RESONATE' : 'REDIRECT';
            return (
              <button key={id} onClick={() => setVerb(id)} style={{
                flex: 1, padding: '5px 0', background: 'none', cursor: 'pointer',
                border: activeVerb === id ? `1px solid ${accent}` : '1px solid #252535',
                borderRadius: 4, color: activeVerb === id ? accent : '#444',
                fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
              }}>
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* REDIRECT: repoint this actor's target */}
      {canAct && activeVerb === 'redirect' && step.aliveEnemies.length > 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 8, color: '#333', letterSpacing: 1 }}>REDIRECT {step.actor.name} →</div>
          {step.aliveEnemies.map((enemy) => {
            const ec = ARCHETYPES[enemy.archetype]?.color ?? '#888';
            const isCurrent = enemy.uid === step.proposedTarget.uid;
            const charging = enemy.archetype === 'Spark' && (enemy.stokeStacks ?? 0) > 0;
            const armed = enemy.archetype === 'Spark' && (enemy.stokeStacks ?? 0) >= SPARK_DETONATE_THRESHOLD - 1;
            return (
              <div key={enemy.uid ?? enemy.id} onClick={() => !isCurrent && onRedirect(step.actorId, enemy.uid)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4,
                  border: armed ? '1px solid #ff6b3580' : isCurrent ? `1px solid ${ec}50` : '1px solid #1a1a2a',
                  background: armed ? '#ff6b3514' : isCurrent ? `${ec}10` : '#0d0d1a',
                  cursor: isCurrent ? 'default' : 'pointer', opacity: isCurrent ? 0.6 : 1,
                }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: ec, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: '#bbb', flex: 1 }}>
                  {enemy.name}
                  {charging && <span style={{ fontSize: 8, color: armed ? '#ff6b35' : '#f5a623', marginLeft: 5, fontWeight: 700 }}>
                    {armed ? '⚡ ARMED' : `⚡ ${enemy.stokeStacks}/${SPARK_DETONATE_THRESHOLD}`}
                  </span>}
                </span>
                {isCurrent ? <span style={{ fontSize: 8, color: ec }}>CURRENT</span>
                           : <span style={{ fontSize: 8, color: '#4a90d9' }}>→</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* ANCHOR: lock a player's enemy out of its next turn */}
      {canAct && activeVerb === 'anchor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 8, color: '#aaaacc', letterSpacing: 1 }}>LOCK ENEMY — SKIPS NEXT TURN</div>
          {anchorTargets.map((enemy) => {
            const ec = ARCHETYPES[enemy.archetype]?.color ?? '#888';
            const isAlreadyAnchored = enemy.anchored;
            return (
              <div key={enemy.uid ?? enemy.id}
                onClick={() => !isAlreadyAnchored && onAnchor(enemy.uid)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4,
                  border: isAlreadyAnchored ? '1px solid #aaaacc60' : '1px solid #1a1a2a',
                  background: isAlreadyAnchored ? '#aaaacc0a' : '#0d0d1a',
                  cursor: isAlreadyAnchored ? 'default' : 'pointer',
                  opacity: isAlreadyAnchored ? 0.5 : 1,
                }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: ec, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: '#bbb', flex: 1 }}>{enemy.name}</span>
                <span style={{ fontSize: 8, color: '#444', minWidth: 28, textAlign: 'right', fontFamily: 'monospace' }}>
                  {Math.round(enemy.currentHP)}
                </span>
                {isAlreadyAnchored
                  ? <span style={{ fontSize: 8, color: '#aaaacc', marginLeft: 4 }}>⚓ LOCKED</span>
                  : <span style={{ fontSize: 8, color: '#aaaacc', marginLeft: 4 }}>⚓</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* RESONATE: pull a free ally into this actor's strike (synced burst) */}
      {canAct && activeVerb === 'resonate' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 8, color: '#b06bff', letterSpacing: 1 }}>
            SYNC ALLY → {step.actor.name}'S STRIKE (forfeits own turn)
          </div>
          {partners.map((ally) => {
            const ac = ARCHETYPES[ally.archetype]?.color ?? '#888';
            return (
              <div key={ally.uid ?? ally.id} onClick={() => onResonate(ally.uid)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4,
                  border: '1px solid #2a1f3a', background: '#0d0d1a', cursor: 'pointer',
                }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: ac, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: '#bbb', flex: 1 }}>{ally.name}</span>
                <span style={{ fontSize: 8, color: '#444', minWidth: 28, textAlign: 'right', fontFamily: 'monospace' }}>
                  {Math.round(ally.currentHP)}
                </span>
                <span style={{ fontSize: 8, color: '#b06bff', marginLeft: 4 }}>◇</span>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={onResume} style={{
        padding: '10px', background: 'none', border: '1px solid #252535', borderRadius: 5,
        color: '#666', fontSize: 11, fontWeight: 700, letterSpacing: 2, cursor: 'pointer',
        textTransform: 'uppercase',
      }}>
        Resume Battle
      </button>
    </div>
  );
}

// ─── Combat Log (demoted) ─────────────────────────────────────────────────────
// Kept as a small secondary readout for debugging. §19 holds that the situation
// must read WITHOUT this — the stage above is the primary channel now.
function CombatLog({ entries }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <div ref={ref} style={{ maxHeight: 64, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1, paddingRight: 2 }}>
      {entries.map((line, i) => {
        const isProc     = line.startsWith('  ◆') || line.startsWith('  ◈');
        const isEcho     = line.startsWith('  ↳');
        const isDetonate = line.includes('✸');
        const isDefeat   = line.includes('DEFEATED');
        return (
          <div key={i} style={{
            fontSize: 9,
            color: isDetonate ? '#ff6b35' : isDefeat ? '#e86040' : isProc ? '#9b59b6' : isEcho ? '#7ed321'
                  : i === entries.length - 1 ? '#888' : '#333',
            fontFamily: 'monospace', lineHeight: 1.45,
          }}>
            {line}
          </div>
        );
      })}
    </div>
  );
}

// ─── BattleScreen ─────────────────────────────────────────────────────────────
export default function BattleScreen({
  playerSquad, enemySquad, seed, onComplete,
  maxInterventions = 3, detonationClock = null, clockLabel = 'SIGNAL', bannerLabel = null,
  holdCondition = null, modifiers = undefined,
}) {
  const {
    start, pause, resume, redirect, anchor, resonate,
    phase, currentStep, unitsSnapshot,
    combatLog, interventionsLeft, enemyDetonations, result,
  } = useBattleRunner({ squadA: playerSquad, squadB: enemySquad, seed, maxInterventions, detonationClock, holdCondition, modifiers });

  useEffect(() => { start(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (result) {
      const t = setTimeout(() => onComplete(result), 900);
      return () => clearTimeout(t);
    }
  }, [result, onComplete]);

  const round    = currentStep?.round ?? 1;
  const isPaused = phase === 'paused';
  const isAtPendingAction = isPaused && currentStep?.type === 'pending_action';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* recon banner — marks a low-stakes scouting fight (§20.8.4) */}
      {bannerLabel && (
        <div style={{
          background: '#0a0814', border: '1px solid #2a1f3a', borderRadius: 5,
          padding: '7px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 9, color: '#9b6bd6', letterSpacing: 2, fontWeight: 700 }}>◇ {bannerLabel}</span>
          <span style={{ fontSize: 8, color: '#555', letterSpacing: 1 }}>LOW STAKES — INTEL ONLY</span>
        </div>
      )}
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 8, color: '#252535', letterSpacing: 2 }}>BATTLE</span>
          <span style={{ fontSize: 11, color: '#ccc' }}>
            Round <span style={{ color: '#eee', fontWeight: 700 }}>{round}</span>
            <span style={{ color: '#333' }}> / 10</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Hold clock (§20.8.5) — rounds held + the escortee's status */}
          {holdCondition != null && (() => {
            const esc = unitsSnapshot.A.find((u) => u.instanceId === holdCondition.escorteeInstanceId);
            const held = Math.min(Math.max(0, round - 1), holdCondition.rounds);
            const escPct = esc ? Math.max(0, esc.currentHP) / esc.maxHP : 0;
            const escColor = !esc?.alive ? '#d0021b' : escPct < 0.35 ? '#ff6b35' : '#4a90d9';
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 8, color: '#3a6a8a', letterSpacing: 1.5 }}>HOLD {held}/{holdCondition.rounds}</span>
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: holdCondition.rounds }).map((_, i) => (
                    <div key={i} style={{
                      width: 4, height: 9, borderRadius: 1,
                      background: i < held ? '#4a90d9' : '#13131f',
                      border: `1px solid ${i < held ? '#4a90d9' : '#23233a'}`,
                    }} />
                  ))}
                </div>
                <span title="escortee" style={{
                  fontSize: 8, color: escColor, letterSpacing: 0.5, fontFamily: 'monospace',
                  borderLeft: '1px solid #1a1a2a', paddingLeft: 6,
                }}>
                  ▲ {esc?.alive ? Math.round(esc.currentHP) : 'DOWN'}
                </span>
              </div>
            );
          })()}
          {/* Signal clock (§20.8.5) — each enemy detonation advances the signal */}
          {detonationClock != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 8, color: '#7a5a2a', letterSpacing: 1.5 }}>{clockLabel}</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {Array.from({ length: detonationClock }).map((_, i) => {
                  const lit = i < enemyDetonations;
                  const isFinal = i === detonationClock - 1;
                  return (
                    <div key={i} style={{
                      width: 9, height: 9, borderRadius: 2, transform: 'rotate(45deg)',
                      background: lit ? (isFinal ? '#ff6b35' : '#f5a623') : '#1a1208',
                      border: `1px solid ${lit ? (isFinal ? '#ff6b35' : '#f5a623') : '#3a2a14'}`,
                      boxShadow: lit ? `0 0 6px ${isFinal ? '#ff6b35' : '#f5a623'}88` : 'none',
                      transition: 'all 0.25s',
                    }} />
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: maxInterventions }).map((_, i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: i < interventionsLeft ? '#4a90d9' : '#1a1a2a',
                border: '1px solid #252535',
              }} />
            ))}
          </div>

          {phase !== 'complete' && (
            <button
              onClick={isPaused ? resume : pause}
              style={{
                padding: '6px 12px', background: 'none',
                border: `1px solid ${isPaused ? '#4a90d9' : '#252535'}`, borderRadius: 4,
                color: isPaused ? '#4a90d9' : '#555', fontSize: 10, fontWeight: 700,
                letterSpacing: 1, cursor: 'pointer', textTransform: 'uppercase',
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

      {/* the witnessing stage — primary channel */}
      <BattleStage
        playerUnits={unitsSnapshot.A}
        enemyUnits={unitsSnapshot.B}
        step={currentStep}
      />

      {/* intervention panel — only while paused */}
      {isAtPendingAction && (
        <PendingActionPanel
          step={currentStep}
          interventionsLeft={interventionsLeft}
          onRedirect={redirect}
          onAnchor={anchor}
          onResonate={resonate}
          onResume={resume}
          anchorTargets={unitsSnapshot.B.filter((u) => u.alive)}
        />
      )}

      {/* combat log — demoted secondary readout */}
      {combatLog.length > 0 && (
        <div style={{ borderTop: '1px solid #0d0d1a', paddingTop: 8 }}>
          <div style={{ fontSize: 7, color: '#1a1a2a', letterSpacing: 2, marginBottom: 4 }}>LOG</div>
          <CombatLog entries={combatLog} />
        </div>
      )}
    </div>
  );
}
