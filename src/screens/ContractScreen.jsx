import { ARCHETYPES } from '../data/creatures.js';
import { generateSpotterRead } from '../engine/spotter.js';
import { applyLevel } from '../engine/progression.js';
import { INTEL_AXES, countRevealed, payoutRepAmountWithDifficulty, DIFFICULTIES, DIFFICULTY_ORDER } from '../data/contracts.js';
import { ARTIFACTS_BY_ID } from '../data/artifacts.js';

// ─── ContractScreen (§20.8 + §20.8.4 Intel) ───────────────────────────────────
// The contract entry frame. It opens PARTIALLY HIDDEN: composition, behavior and
// threat are concealed until scouted. The player sets their own caution — scout
// to fight informed for a smaller payout, or dive blind for the full bonus
// (§20.8.4). Scouting reveals an axis by fighting a fragment of the enemy; the
// reveal persists in the Codex.

const FACTION_STYLE = {
  Shadow: { color: '#9b6bd6', accent: '#6a4a9a', bg: '#120a1a', label: 'SHADOW' },
  Light:  { color: '#4a90d9', accent: '#2a5a8a', bg: '#0a1018', label: 'LIGHT' },
  Wild:   { color: '#3a8a4a', accent: '#2a5a3a', bg: '#0a140c', label: 'WILD' },
};

const ARCHETYPE_MECHANIC = {
  Guardian: 'Shield triggers at 50% HP',
  Swift:    '2× execute vs targets < 30% HP',
  Spark:    '+12% attack per round survived · detonates when overcharged',
  Echo:     'Echoes every allied action at 50%',
};

function SquadChip({ unit }) {
  const color = ARCHETYPES[unit.archetype]?.color || '#888';
  const eff = applyLevel(unit);
  const level = unit.level ?? 1;
  return (
    <div style={{
      background: color + '10', border: `1px solid ${color}25`, borderRadius: 5,
      padding: '5px 9px', display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#bbb', letterSpacing: 0.5 }}>{unit.name}</span>
      <span style={{ fontSize: 8, color, letterSpacing: 0.5 }}>
        {unit.archetype.toUpperCase()}<span style={{ color: '#555' }}> · Lv.{level}</span>
      </span>
      <span style={{ fontSize: 8, color: '#666', letterSpacing: 0.5 }}>HP {eff.hp} · ATK {eff.attack}</span>
    </div>
  );
}

// An enemy row — only fully legible once Composition is scouted. Behavior unlocks
// the per-unit mechanic hint.
function EnemyRow({ unit, level, isSignal, isLast, compositionKnown, behaviorKnown }) {
  const color = ARCHETYPES[unit.archetype]?.color || '#888';
  const lvl = level ?? unit.level ?? 1;
  const eff = applyLevel({ ...unit, level: lvl });

  if (!compositionKnown) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 0', borderBottom: isLast ? 'none' : '1px solid #0f0f1a',
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#161620', border: '1px solid #26263a' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#33333f', letterSpacing: 2 }}>UNKNOWN</span>
        <span style={{ fontSize: 9, color: '#26263a' }}>— scout Composition to read the lineup</span>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '9px 0', borderBottom: isLast ? 'none' : '1px solid #0f0f1a',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#ccc', letterSpacing: 0.5 }}>{unit.name}</span>
          <span style={{
            fontSize: 8, color, background: color + '15', border: `1px solid ${color}30`,
            borderRadius: 3, padding: '1px 5px', letterSpacing: 0.5,
          }}>{unit.archetype.toUpperCase()}</span>
          <span style={{ fontSize: 8, color: '#888', letterSpacing: 0.5 }}>Lv.{lvl} · HP {eff.hp} · ATK {eff.attack}</span>
        </div>
        {behaviorKnown && ARCHETYPE_MECHANIC[unit.archetype] && (
          <span style={{ fontSize: 9, color: '#1e2e3e', letterSpacing: 0.3 }}>{ARCHETYPE_MECHANIC[unit.archetype]}</span>
        )}
      </div>
      {isSignal && behaviorKnown && (
        <span style={{
          fontSize: 8, color: '#ff6b35', background: '#ff6b3510', border: '1px solid #ff6b352a',
          borderRadius: 3, padding: '2px 7px', letterSpacing: 0.5, whiteSpace: 'nowrap',
          flexShrink: 0, marginLeft: 12,
        }}>THE CLOCK</span>
      )}
    </div>
  );
}

// One scoutable intel axis: revealed knowledge, or hidden + a SCOUT action.
function IntelRow({ axis, spec, known, onScout, canScout, fs }) {
  return (
    <div style={{
      border: `1px solid ${known ? '#1e3a2e' : '#1f1f2e'}`,
      borderLeft: `2px solid ${known ? '#3a8a5a' : fs.accent}`,
      background: known ? '#08120c' : '#0b0b14', borderRadius: 5, padding: '10px 12px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 10, color: known ? '#5aa87a' : '#555' }}>{spec.glyph}</span>
          <span style={{ fontSize: 9, letterSpacing: 1.5, color: known ? '#5aa87a' : '#666' }}>
            {spec.label.toUpperCase()}
          </span>
          {known
            ? <span style={{ fontSize: 7, color: '#3a8a5a', letterSpacing: 1 }}>SCOUTED</span>
            : <span style={{ fontSize: 7, color: '#444', letterSpacing: 1 }}>HIDDEN</span>}
        </div>
        <span style={{ fontSize: 11, color: known ? '#9fb8a8' : '#4a4a58', lineHeight: 1.5 }}>
          {known ? spec.revealed : spec.hidden}
        </span>
        {!known && (
          <span style={{ fontSize: 9, color: '#33333f', fontStyle: 'italic' }}>{spec.scoutLine}</span>
        )}
      </div>
      {!known && (
        <button onClick={() => onScout(axis)} disabled={!canScout} style={{
          flexShrink: 0, padding: '7px 12px', background: 'none',
          border: `1px solid ${canScout ? fs.accent : '#1e1e2a'}`, borderRadius: 5,
          color: canScout ? fs.color : '#333', fontSize: 9, fontWeight: 800,
          letterSpacing: 1.5, cursor: canScout ? 'pointer' : 'default',
        }}>SCOUT</button>
      )}
    </div>
  );
}

export default function ContractScreen({ contract, playerSquad, intel, reconFeedback, onScout, onCommit, onBack, difficulty, onDifficultyChange }) {
  const fs = FACTION_STYLE[contract.client] || FACTION_STYLE.Shadow;
  const spotterRead = generateSpotterRead(playerSquad, contract.squad);
  const hasClock = contract.winCondition.detonationLimit != null;
  const signalUnit = hasClock ? contract.squad.find((u) => u.archetype === 'Spark') : null;
  const escortee = contract.escortee;
  const canScout = playerSquad.length > 0;
  const isRival = !!contract.isRival;

  const revealedCount = countRevealed(intel);
  const repAmount = payoutRepAmountWithDifficulty(contract, revealedCount, difficulty);
  const diff = DIFFICULTIES[difficulty] ?? DIFFICULTIES.standard;
  const compositionKnown = isRival || !!intel?.composition?.revealed;
  const behaviorKnown = isRival || !!intel?.behavior?.revealed;
  const threatKnown = isRival || !!intel?.threat?.revealed;
  const boldnessMax = contract.payout?.boldnessMax ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: '#444',
          fontSize: 12, cursor: 'pointer', letterSpacing: 1, padding: 0, marginBottom: 10,
        }}>← Contracts</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            fontSize: 8, color: fs.color, background: fs.bg, border: `1px solid ${fs.accent}`,
            borderRadius: 3, padding: '2px 7px', letterSpacing: 2,
          }}>◇ {fs.label} CLIENT</span>
        </div>
        <div style={{ fontSize: 17, fontWeight: 900, color: '#eee', letterSpacing: 1 }}>{contract.name}</div>
      </div>

      {/* Situation */}
      <div style={{ fontSize: 12, color: '#7a7a8a', lineHeight: 1.7 }}>{contract.situation}</div>

      {/* Modifier — the contract's terms, always visible */}
      <div style={{
        background: '#0a0814', border: '1px solid #2a1f3a', borderLeft: `2px solid ${fs.color}`,
        borderRadius: 5, padding: '13px 15px',
      }}>
        <div style={{ fontSize: 8, color: fs.accent, letterSpacing: 2, marginBottom: 8, fontFamily: 'monospace' }}>
          ◼ CONTRACT MODIFIER
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: fs.color, lineHeight: 1.5 }}>
          {contract.modifier.headline}
        </div>
        <div style={{ fontSize: 11, color: '#555', marginTop: 6, lineHeight: 1.6 }}>
          {contract.modifier.detail}
        </div>
      </div>

      {/* ── Intel layer (§20.8.4) — hidden for Rivals (no scouting, no secrets) ── */}
      {!isRival && <div style={{
        background: '#070710', border: '1px solid #15152a', borderRadius: 6, padding: '13px 14px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 8, color: '#3a3a5a', letterSpacing: 2, fontFamily: 'monospace' }}>
            ◼ INTEL — {revealedCount}/{INTEL_AXES.length} SCOUTED
          </span>
          <span style={{ fontSize: 8, color: '#555', letterSpacing: 1 }}>
            {revealedCount === 0 ? 'BLIND DIVE' : revealedCount === INTEL_AXES.length ? 'FULLY SCOUTED' : 'PARTIAL'}
          </span>
        </div>

        {reconFeedback && (
          <div style={{
            fontSize: 10, lineHeight: 1.5, padding: '7px 10px', borderRadius: 4,
            color: reconFeedback.ok ? '#7ed321' : '#d0905a',
            background: reconFeedback.ok ? '#0d1a0d' : '#1a120a',
            border: `1px solid ${reconFeedback.ok ? '#7ed32130' : '#d0905a30'}`,
          }}>
            {reconFeedback.text}
          </div>
        )}

        {INTEL_AXES.map((axis) => (
          <IntelRow
            key={axis}
            axis={axis}
            spec={contract.intel[axis]}
            known={!!intel?.[axis]?.revealed}
            onScout={onScout}
            canScout={canScout}
            fs={fs}
          />
        ))}

        <div style={{ fontSize: 9, color: '#33333f', lineHeight: 1.6, marginTop: 2 }}>
          Scouting is optional. Each fight you scout makes the contract safer but trades one
          point of standing — caution is paid less, never punished. Dive blind for the full reward.
        </div>
      </div>}

      {/* ── Difficulty picker (Test 6) ── */}
      {!isRival && (
        <div style={{ background: '#080810', border: '1px solid #15152a', borderRadius: 6, padding: '12px 14px' }}>
          <div style={{ fontSize: 8, color: '#3a3a5a', letterSpacing: 2, marginBottom: 10, fontFamily: 'monospace' }}>
            ◼ DIFFICULTY — enemy level + payout scale
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {DIFFICULTY_ORDER.map((key) => {
              const d = DIFFICULTIES[key];
              const active = difficulty === key;
              return (
                <button key={key} onClick={() => onDifficultyChange(key)} style={{
                  flex: 1, padding: '8px 4px', borderRadius: 5, cursor: 'pointer',
                  background: active ? d.color + '20' : 'none',
                  border: `1px solid ${active ? d.color : '#1e1e2a'}`,
                  color: active ? d.color : '#444',
                  fontSize: 9, fontWeight: active ? 800 : 400, letterSpacing: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                }}>
                  <span>{d.label.toUpperCase()}</span>
                  <span style={{ fontSize: 7, color: active ? d.color : '#333' }}>Lv.{d.level} · ×{d.payoutMult}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Win condition + payout dial */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: '#0d0d18', border: '1px solid #1e1e2e', borderRadius: 6, padding: '11px 13px' }}>
          <div style={{ fontSize: 8, color: '#7a5a2a', letterSpacing: 1.5, marginBottom: 6 }}>WIN CONDITION</div>
          <div style={{ fontSize: 11, color: threatKnown ? '#cca060' : '#4a4a58', lineHeight: 1.55 }}>
            {threatKnown ? contract.winCondition.summary : 'Unknown — scout Threat to learn what ends this.'}
          </div>
        </div>
        <div style={{ background: '#0c0a12', border: '1px solid #2a1f3a', borderRadius: 6, padding: '11px 13px' }}>
          <div style={{ fontSize: 8, color: fs.accent, letterSpacing: 1.5, marginBottom: 6 }}>PAYOUT</div>
          <div style={{ fontSize: 11, color: fs.color, fontWeight: 600, lineHeight: 1.5 }}>
            {ARTIFACTS_BY_ID[contract.payout.artifactId]?.name ?? 'Artifact'} · {contract.payout.reputation.faction} standing +{repAmount}
          </div>
          <div style={{ fontSize: 8, color: '#555', marginTop: 4 }}>
            {isRival
              ? `Rival payout — no scouting dial`
              : revealedCount === 0
              ? `Blind-dive +${boldnessMax}${diff.payoutMult > 1 ? ` · ${diff.label} ×${diff.payoutMult}` : ''}`
              : `−${revealedCount} scouted · floor +${contract.payout.reputation.amount}${diff.payoutMult > 1 ? ` · ×${diff.payoutMult}` : ''}`}
          </div>
        </div>
      </div>

      {/* Spotter read */}
      <div style={{
        background: '#060610', border: '1px solid #131326', borderLeft: '2px solid #1e3a5f',
        borderRadius: 5, padding: '13px 15px',
      }}>
        <div style={{ fontSize: 8, color: '#1e3a5f', letterSpacing: 2, marginBottom: 10, fontFamily: 'monospace' }}>◼ SPOTTER</div>
        {spotterRead.lines.map((line, i) => (
          <div key={i} style={{
            fontSize: 12, color: '#6a8090', lineHeight: 1.7,
            fontStyle: i === 1 ? 'italic' : 'normal', marginTop: i > 0 ? 4 : 0,
          }}>{line}</div>
        ))}
      </div>

      {/* Escortee — what you protect (hold contracts) */}
      {escortee && (
        <div style={{
          background: '#0a1018', border: '1px solid #1e3a5f', borderLeft: '2px solid #4a90d9',
          borderRadius: 6, padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 8, color: '#3a6a8a', letterSpacing: 1.5, marginBottom: 4 }}>▲ YOU PROTECT</div>
            <div style={{ fontSize: 12, color: '#9fc0e0', fontWeight: 700 }}>{escortee.name}</div>
            <div style={{ fontSize: 9, color: '#4a5a6a', marginTop: 2 }}>{escortee.flavor}</div>
          </div>
          <div style={{ fontSize: 9, color: '#3a5a7a', textAlign: 'right', fontFamily: 'monospace' }}>
            HP {escortee.hp} · ARM {escortee.armor}<br />
            <span style={{ color: '#2a3a4a' }}>fields beside your squad</span>
          </div>
        </div>
      )}

      {/* Your squad */}
      <div>
        <div style={{ fontSize: 8, color: '#252535', letterSpacing: 2, marginBottom: 8 }}>
          YOUR SQUAD — {playerSquad.length} UNIT{playerSquad.length !== 1 ? 'S' : ''}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {playerSquad.map((u, i) => <SquadChip key={i} unit={u} />)}
        </div>
      </div>

      {/* Enemy formation — gated by Composition intel */}
      <div>
        <div style={{ fontSize: 8, color: '#252535', letterSpacing: 2, marginBottom: 2 }}>
          THE JOB — {compositionKnown ? `${contract.squad.length} UNITS` : 'LINEUP HIDDEN'}
        </div>
        {contract.squad.map((u, i) => (
          <EnemyRow
            key={i}
            unit={u}
            level={contract.level}
            isSignal={signalUnit && u === signalUnit}
            isLast={i === contract.squad.length - 1}
            compositionKnown={compositionKnown}
            behaviorKnown={behaviorKnown}
          />
        ))}
      </div>

      {/* Commit */}
      <button onClick={onCommit} disabled={playerSquad.length === 0} style={{
        padding: '14px',
        background: playerSquad.length > 0 ? fs.color : '#111',
        border: 'none', borderRadius: 7,
        color: playerSquad.length > 0 ? '#fff' : '#333',
        fontSize: 13, fontWeight: 900, letterSpacing: 2,
        cursor: playerSquad.length > 0 ? 'pointer' : 'default', textTransform: 'uppercase',
      }}>
        {playerSquad.length === 0
          ? 'Form a Squad First'
          : revealedCount === 0 ? 'Dive Blind — Take the Contract' : 'Take the Contract'}
      </button>
    </div>
  );
}
