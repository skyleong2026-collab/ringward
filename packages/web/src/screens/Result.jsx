import { useState } from 'react';
import { ARCHETYPES, CORES, MODULES_BY_ID } from '@8gents/game-data';

const CORE_COLORS = {
  quickstrike: '#d0021b',
  ironhide:    '#4a90d9',
  lastwall:    '#ff6b35',
  resonator:   '#7ed321',
  chainlink:   '#a0d060',
  kindling:    '#f5a623',
};

function findDeathCause(unitName, battleLog) {
  if (!battleLog) return null;
  for (let r = battleLog.length - 1; r >= 0; r--) {
    const { events } = battleLog[r];
    const killIdx = events.findIndex((e) => e.killed && e.targetName === unitName);
    if (killIdx < 0) continue;
    const killEvent = events[killIdx];
    const preceding = events
      .slice(Math.max(0, killIdx - 2), killIdx)
      .filter((e) => e.targetName === unitName);
    return { killEvent, preceding };
  }
  return null;
}

function computeStats(squad, battleLog) {
  const stats = {};
  for (const unit of squad) {
    let kills = 0;
    let timesAttacked = 0;
    if (battleLog) {
      for (const { events } of battleLog) {
        for (const e of events) {
          if (e.actorName === unit.name && e.killed) kills += 1;
          if (e.targetName === unit.name && e.damage > 0) timesAttacked += 1;
        }
      }
    }
    stats[unit.name] = { kills, timesAttacked };
  }
  return stats;
}

function findFirstElimination(battleLog) {
  if (!battleLog) return null;
  for (const { round, events } of battleLog) {
    for (const e of events) {
      if (e.killed) return { unitName: e.targetName, round };
    }
  }
  return null;
}

function computeMVP(squad, battleLog) {
  const stats = computeStats(squad, battleLog);
  let mvp = null;
  let maxScore = -1;
  for (const unit of squad) {
    const s = stats[unit.name];
    const score = (unit.tel?.damageDealt || 0) + (s.kills * 80);
    if (score > maxScore) {
      maxScore = score;
      mvp = { name: unit.name, damage: unit.tel?.damageDealt || 0, kills: s.kills };
    }
  }
  return mvp;
}

function MatchStats({ squadA, squadB, battleLog, winner }) {
  const mvp = computeMVP(squadA, battleLog);
  const firstKill = findFirstElimination(battleLog);
  const statsA = computeStats(squadA, battleLog);
  const statsB = computeStats(squadB, battleLog);
  const totalKillsA = Object.values(statsA).reduce((sum, s) => sum + s.kills, 0);
  const totalKillsB = Object.values(statsB).reduce((sum, s) => sum + s.kills, 0);

  return (
    <div style={{ background: '#0a0a14', border: '1px solid #1a1a2a', borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ fontSize: 10, color: '#444', letterSpacing: 2, marginBottom: 10 }}>MATCH STATS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mvp && (
          <div>
            <div style={{ fontSize: 8, color: '#666' }}>MVP</div>
            <div style={{ fontSize: 12, color: '#eee', marginTop: 3, fontWeight: 600 }}>
              {mvp.name}
            </div>
            <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
              {Math.round(mvp.damage)} damage · {mvp.kills} kill{mvp.kills !== 1 ? 's' : ''}
            </div>
          </div>
        )}
        {firstKill && (
          <div>
            <div style={{ fontSize: 8, color: '#666' }}>FIRST ELIMINATION</div>
            <div style={{ fontSize: 12, color: '#d0021b', marginTop: 3 }}>
              {firstKill.unitName}
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, borderTop: '1px solid #1a1a2a', paddingTop: 10 }}>
          <div>
            <div style={{ fontSize: 8, color: '#666' }}>SQUAD A</div>
            <div style={{ fontSize: 11, color: '#7ed321', marginTop: 4, fontWeight: 600 }}>
              {totalKillsA} kill{totalKillsA !== 1 ? 's' : ''}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 8, color: '#666' }}>SQUAD B</div>
            <div style={{ fontSize: 11, color: '#d0021b', marginTop: 4, fontWeight: 600 }}>
              {totalKillsB} kill{totalKillsB !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CombatLog({ battleLog }) {
  const [showAll, setShowAll] = useState(false);

  function isSignificant(e) {
    return e.killed || e.type === 'core_proc' || e.type === 'module_proc' || e.isExecute;
  }

  return (
    <div style={{ background: '#0a0a14', border: '1px solid #1a1a2a', borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: '#444', letterSpacing: 2 }}>COMBAT LOG</div>
        <button
          onClick={() => setShowAll((s) => !s)}
          style={{ background: 'none', border: 'none', color: '#333', fontSize: 9, cursor: 'pointer', letterSpacing: 1, padding: 0 }}
        >
          {showAll ? 'KEY EVENTS' : 'ALL EVENTS'}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {battleLog.map(({ round, events }) => {
          const display = showAll ? events : events.filter(isSignificant);
          if (display.length === 0) return null;
          return (
            <div key={round}>
              <div style={{ fontSize: 8, color: '#1a1a3a', letterSpacing: 1.5, marginBottom: 3 }}>RND {round}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {display.map((e, i) => {
                  const isProc = e.type === 'core_proc';
                  const isModuleProc = e.type === 'module_proc';
                  const isEcho = e.type === 'echo';
                  const procColor = isProc ? (CORE_COLORS[e.coreId] || '#888') : null;
                  const modColor = isModuleProc ? (MODULES_BY_ID[e.moduleId]?.color || '#888') : null;
                  const actorColor = e.actorSquad === 'A' ? '#5a5aee' : '#ee4444';
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10 }}>
                      {isProc && (
                        <span style={{
                          fontSize: 8, color: procColor,
                          background: procColor + '18', border: `1px solid ${procColor}35`,
                          borderRadius: 3, padding: '0 4px', letterSpacing: 0.5, flexShrink: 0,
                        }}>
                          {e.callout}
                        </span>
                      )}
                      {isModuleProc && (
                        <span style={{
                          fontSize: 8, color: modColor,
                          background: modColor + '18', border: `1px solid ${modColor}35`,
                          borderRadius: 3, padding: '0 4px', letterSpacing: 0.5, flexShrink: 0,
                        }}>
                          {e.callout}
                        </span>
                      )}
                      {isEcho && !isProc && (
                        <span style={{ fontSize: 8, color: '#7ed32166', letterSpacing: 0.5, flexShrink: 0 }}>ECHO</span>
                      )}
                      {!isProc && !isModuleProc && !isEcho && e.isExecute && (
                        <span style={{ fontSize: 8, color: '#d0021b', letterSpacing: 0.5, flexShrink: 0 }}>EXEC</span>
                      )}
                      <span style={{ color: actorColor, fontWeight: 600 }}>{e.actorName}</span>
                      <span style={{ color: '#222' }}>→</span>
                      <span style={{ color: '#555' }}>{e.targetName}</span>
                      {e.damage > 0 && <span style={{ color: '#2a2a3a' }}>{Math.round(e.damage)}</span>}
                      {e.killed && <span style={{ color: '#d0021b', fontWeight: 700, marginLeft: 2 }}>KILL</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function computeCarryHighlight(squadA) {
  for (const u of squadA) {
    if (u.archetype === 'Spark' && u.stokeStacks >= 6 && u.tel.damagePercent >= 30) {
      return {
        name: u.name,
        label: 'CARRIED',
        line: `${u.stokeStacks} stacks reached. ${u.tel.damagePercent}% of squad damage.`,
        color: '#f5a623',
      };
    }
    if (u.archetype === 'Swift' && u.tel.executeKills >= 2) {
      return {
        name: u.name,
        label: 'DELIVERED',
        line: `${u.tel.executeKills} execute kills. Largest hit: ${Math.round(u.tel.largestHit)}.`,
        color: '#d0021b',
      };
    }
    if (u.archetype === 'Echo' && u.tel.echoEvents >= 10) {
      return {
        name: u.name,
        label: 'CASCADED',
        line: `${u.tel.echoEvents} echoes fired. +${Math.round(u.tel.echoDamage)} bonus damage.`,
        color: '#7ed321',
      };
    }
    if (u.archetype === 'Guardian' && u.tel.shieldAbsorbed >= 60 && u.alive) {
      return {
        name: u.name,
        label: 'HELD',
        line: `Absorbed ${Math.round(u.tel.shieldAbsorbed)} damage. Held to the end.`,
        color: '#4a90d9',
      };
    }
  }
  return null;
}

function UnitRow({ unit, isWinnerSquad, xpGain, battleLog }) {
  const color = ARCHETYPES[unit.archetype].color;
  const t = unit.tel;
  const survived = unit.alive;
  const deathCause = !survived ? findDeathCause(unit.name, battleLog) : null;
  const stats = computeStats([unit], battleLog)[unit.name] || { kills: 0, timesAttacked: 0 };

  function archetypeDetail() {
    switch (unit.archetype) {
      case 'Guardian':
        return t.shieldTriggers > 0
          ? `Shield triggered · Absorbed ${Math.round(t.shieldAbsorbed)} dmg`
          : `No shield trigger`;
      case 'Echo':
        return `${t.echoEvents} echo${t.echoEvents !== 1 ? 's' : ''} · +${Math.round(t.echoDamage)} echo dmg`;
      case 'Swift': {
        const execStr = t.executeHits > 0
          ? `Execute ×${t.executeHits} (${t.executeKills} kill${t.executeKills !== 1 ? 's' : ''})`
          : `No execute`;
        return `${execStr} · ${t.standardKills} standard kill${t.standardKills !== 1 ? 's' : ''} · Largest hit: ${Math.round(t.largestHit)}`;
      }
      case 'Spark':
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
      <div style={{ fontSize: 11, color: '#888', display: 'flex', gap: 12, marginBottom: 3, flexWrap: 'wrap' }}>
        <span>Dealt <strong style={{ color: '#ccc' }}>{Math.round(t.damageDealt)}</strong></span>
        <span>Took <strong style={{ color: '#ccc' }}>{Math.round(t.damageTaken)}</strong></span>
        <span>Kills <strong style={{ color: '#7ed321' }}>{stats.kills}</strong></span>
        <span>Attacked <strong style={{ color: '#888' }}>{stats.timesAttacked}×</strong></span>
        {xpGain !== undefined && (
          <span style={{ marginLeft: 'auto', color: '#7ed321' }}>
            +{xpGain} XP
          </span>
        )}
      </div>
      <div style={{ fontSize: 10, color: '#555' }}>{archetypeDetail()}</div>
      {deathCause && (
        <div style={{ fontSize: 9, color: '#554040', marginTop: 4, lineHeight: 1.5 }}>
          {[...deathCause.preceding, deathCause.killEvent].map((e, i) => (
            <span key={i}>
              {i > 0 && <span style={{ color: '#3a2a2a', margin: '0 3px' }}>→</span>}
              <span style={{ color: '#886060' }}>
                {e.actorName}
                {e.callout && (
                  <span style={{
                    marginLeft: 4, fontSize: 8,
                    color: CORE_COLORS[e.coreId] || '#aa6060',
                    background: (CORE_COLORS[e.coreId] || '#aa6060') + '18',
                    border: `1px solid ${(CORE_COLORS[e.coreId] || '#aa6060')}35`,
                    borderRadius: 3, padding: '0 3px',
                  }}>
                    {e.callout}
                  </span>
                )}
                {e.killed && <span style={{ color: '#d0021b', marginLeft: 4 }}>✕</span>}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Result({ result, onTryAgain, onNewBattle, onDungeonContinue, onDungeonFail }) {
  const { winner, rounds, telemetry, outcomeText, coachingLine, seed, xpRewards, coreProcs, battleLog } = result;
  const { squadA, squadB } = telemetry;

  const groupedProcs = (() => {
    if (!coreProcs || coreProcs.length === 0) return [];
    const map = {};
    for (const p of coreProcs) {
      const key = `${p.unitName}|${p.callout}`;
      if (!map[key]) map[key] = { unitName: p.unitName, callout: p.callout, coreId: p.coreId, count: 0 };
      map[key].count += 1;
    }
    return Object.values(map);
  })();

  const winnerLabel = winner === 'A' ? 'SQUAD A' : 'SQUAD B';
  const winColor = '#7ed321';
  const carryHighlight = computeCarryHighlight(squadA);

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

      {/* Match stats */}
      <MatchStats squadA={squadA} squadB={squadB} battleLog={battleLog} winner={winner} />

      {/* Carry highlight */}
      {carryHighlight && (
        <div style={{
          background: carryHighlight.color + '0a',
          border: `1px solid ${carryHighlight.color}28`,
          borderRadius: 7,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: carryHighlight.color, letterSpacing: 1 }}>
                {carryHighlight.name}
              </span>
              <span style={{
                fontSize: 8,
                color: carryHighlight.color,
                background: carryHighlight.color + '15',
                border: `1px solid ${carryHighlight.color}35`,
                borderRadius: 3,
                padding: '1px 5px',
                letterSpacing: 1,
              }}>
                {carryHighlight.label}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#666' }}>{carryHighlight.line}</div>
          </div>
        </div>
      )}

      {/* Core activations */}
      {groupedProcs.length > 0 && (
        <div style={{ background: '#0a0a14', border: '1px solid #2a2a3a', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: '#444', letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>Core Activations</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {groupedProcs.map((e, i) => {
              const coreColor = CORES[e.coreId]?.color || '#888';
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: '#666' }}>{e.unitName}</span>
                    <span style={{
                      fontSize: 8, color: coreColor, background: coreColor + '18',
                      border: `1px solid ${coreColor}35`, borderRadius: 3, padding: '1px 5px', letterSpacing: 1,
                    }}>{e.callout}</span>
                  </div>
                  {e.count > 1 && <span style={{ fontSize: 10, color: '#444' }}>×{e.count}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Combat log */}
      {battleLog && battleLog.length > 0 && <CombatLog battleLog={battleLog} />}

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
                  <UnitRow
                    key={`${u.id}-${i}`}
                    unit={u}
                    isWinnerSquad={isWinner}
                    xpGain={side === 'A' ? xpRewards?.[u.instanceId] : undefined}
                    battleLog={battleLog}
                  />
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
        {onDungeonContinue ? (
          // ── Dungeon mode ──
          winner === 'A' ? (
            <>
              <button
                onClick={onDungeonFail}
                style={{
                  padding: '12px', background: 'none', border: '1px solid #2a2a3a',
                  borderRadius: 8, color: '#444', fontSize: 11, fontWeight: 700,
                  letterSpacing: 1, cursor: 'pointer', textTransform: 'uppercase',
                }}
              >
                Abandon Run
              </button>
              <button
                onClick={onDungeonContinue}
                style={{
                  padding: '12px', background: '#e86040', border: 'none',
                  borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700,
                  letterSpacing: 1, cursor: 'pointer', textTransform: 'uppercase',
                }}
              >
                Continue →
              </button>
            </>
          ) : (
            <button
              onClick={onDungeonFail}
              style={{
                gridColumn: '1 / -1', padding: '12px', background: '#1a0d0d',
                border: '1px solid #d0021b44', borderRadius: 8, color: '#d0021b',
                fontSize: 13, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', textTransform: 'uppercase',
              }}
            >
              End Run
            </button>
          )
        ) : (
          // ── Normal mode ──
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
