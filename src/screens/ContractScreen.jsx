import { ARCHETYPES } from '../data/creatures.js';
import { generateSpotterRead } from '../engine/spotter.js';
import { applyLevel } from '../engine/progression.js';

// ─── ContractScreen (§20.8) ───────────────────────────────────────────────────
// The contract entry frame: a client, a situation to resolve, a stake, the one
// modifier that breaks the default build, the win condition, and the enemy
// build you are about to test yourself against. Commit takes you straight into
// the fight (no intel layer yet — that is Test 2).

const FACTION_STYLE = {
  Shadow: { color: '#9b6bd6', accent: '#6a4a9a', bg: '#120a1a', label: 'SHADOW' },
  Light:  { color: '#4a90d9', accent: '#2a5a8a', bg: '#0a1018', label: 'LIGHT' },
  Wild:   { color: '#3a8a4a', accent: '#2a5a3a', bg: '#0a140c', label: 'WILD' },
};

const ARCHETYPE_MECHANIC = {
  Guardian: 'Shield triggers at 50% HP',
  Swift:    '2× execute vs targets < 30% HP',
  Spark:    '+12% attack per round survived · detonates when overcharged',
  Echo:     'Echoes every allied attack at 50%',
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

function EnemyRow({ unit, level, isSignal, isLast }) {
  const color = ARCHETYPES[unit.archetype]?.color || '#888';
  const lvl = level ?? unit.level ?? 1;
  const eff = applyLevel({ ...unit, level: lvl });
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
        {ARCHETYPE_MECHANIC[unit.archetype] && (
          <span style={{ fontSize: 9, color: '#1e2e3e', letterSpacing: 0.3 }}>{ARCHETYPE_MECHANIC[unit.archetype]}</span>
        )}
      </div>
      {isSignal && (
        <span style={{
          fontSize: 8, color: '#ff6b35', background: '#ff6b3510', border: '1px solid #ff6b352a',
          borderRadius: 3, padding: '2px 7px', letterSpacing: 0.5, whiteSpace: 'nowrap',
          flexShrink: 0, marginLeft: 12,
        }}>THE CLOCK</span>
      )}
    </div>
  );
}

export default function ContractScreen({ contract, playerSquad, onCommit, onBack }) {
  const fs = FACTION_STYLE[contract.client] || FACTION_STYLE.Shadow;
  const spotterRead = generateSpotterRead(playerSquad, contract.squad);
  const signalUnit = contract.squad.find((u) => u.archetype === 'Spark');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

      {/* Modifier — the one rule that breaks the default build */}
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

      {/* Win condition + stakes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: '#0d0d18', border: '1px solid #1e1e2e', borderRadius: 6, padding: '11px 13px' }}>
          <div style={{ fontSize: 8, color: '#7a5a2a', letterSpacing: 1.5, marginBottom: 6 }}>WIN CONDITION</div>
          <div style={{ fontSize: 11, color: '#cca060', lineHeight: 1.55 }}>{contract.winCondition.summary}</div>
        </div>
        <div style={{ background: '#0d0d18', border: '1px solid #1e1e2e', borderRadius: 6, padding: '11px 13px' }}>
          <div style={{ fontSize: 8, color: '#555', letterSpacing: 1.5, marginBottom: 6 }}>IF YOU WALK AWAY</div>
          <div style={{ fontSize: 11, color: '#6a6a7a', lineHeight: 1.55 }}>{contract.stakes}</div>
        </div>
      </div>

      {/* Payout */}
      <div style={{
        background: '#0c0a12', border: '1px solid #2a1f3a', borderRadius: 6,
        padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <div>
          <div style={{ fontSize: 8, color: fs.accent, letterSpacing: 1.5, marginBottom: 4 }}>PAYOUT</div>
          <div style={{ fontSize: 12, color: fs.color, fontWeight: 600 }}>{contract.payout.summary}</div>
        </div>
        <div style={{ fontSize: 9, color: '#444', textAlign: 'right', maxWidth: 150, lineHeight: 1.5 }}>
          {contract.rewardsLine}
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

      {/* Your squad */}
      <div>
        <div style={{ fontSize: 8, color: '#252535', letterSpacing: 2, marginBottom: 8 }}>
          YOUR SQUAD — {playerSquad.length} UNIT{playerSquad.length !== 1 ? 'S' : ''}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {playerSquad.map((u, i) => <SquadChip key={i} unit={u} />)}
        </div>
      </div>

      {/* Enemy formation */}
      <div>
        <div style={{ fontSize: 8, color: '#252535', letterSpacing: 2, marginBottom: 2 }}>
          THE JOB — {contract.squad.length} UNIT{contract.squad.length !== 1 ? 'S' : ''}
        </div>
        {contract.squad.map((u, i) => (
          <EnemyRow
            key={i}
            unit={u}
            level={contract.level}
            isSignal={signalUnit && u === signalUnit}
            isLast={i === contract.squad.length - 1}
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
        {playerSquad.length > 0 ? 'Take the Contract' : 'Form a Squad First'}
      </button>
    </div>
  );
}
