import { ARCHETYPES, archetypeLabel } from '../data/creatures.js';
import { generateSpotterRead } from '../engine/spotter.js';
import { applyLevel } from '../engine/progression.js';
import { GlossaryTerm } from '../components/GlossaryPopover.jsx';
import { ringDef, squadResonance, resolveSlots } from '../data/rings.js';

const SLOT_STYLE = {
  open:    { color: '#7ed321', label: 'open' },
  locked:  { color: '#2a2a3a', label: 'locked' },
  dormant: { color: '#d0902a', label: 'dormant' },
};

const THREAT_STYLE = {
  'PRIMARY THREAT': { color: '#d0021b', bg: '#d0021b0f', border: '#d0021b2a' },
  'WATCHLIST':      { color: '#f5a623', bg: '#f5a6230f', border: '#f5a6232a' },
  'UNSTABLE':       { color: '#9b59b6', bg: '#9b59b60f', border: '#9b59b62a' },
};

const ARCHETYPE_IMPLICATION = {
  Guardian: 'Draws all incoming fire',
  Swift:    'Hunts wounded targets',
  Spark:    'Scales with each round survived',
  Echo:     'Amplifies every allied action',
};

const ARCHETYPE_MECHANIC = {
  Guardian: 'Shield triggers at 50% HP',
  Swift:    '2× execute vs targets < 30% HP',
  Spark:    '+12% attack per round survived',
  Echo:     'Echoes every allied attack at 50%',
};

function SquadChip({ unit, resonance = 0 }) {
  const color = ARCHETYPES[unit.archetype]?.color || '#888';
  const eff = applyLevel(unit);
  const level = unit.level ?? 1;
  const ring = ringDef(unit.originRing);
  const slots = resolveSlots(unit, resonance);
  const hasDormant = slots.some((s) => s.state === 'dormant');
  return (
    <div style={{
      background: color + '10',
      border: `1px solid ${color}25`,
      borderRadius: 5,
      padding: '5px 9px',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#bbb', letterSpacing: 0.5 }}>{unit.name}</span>
      <span style={{ fontSize: 8, color, letterSpacing: 0.5 }}>
        <GlossaryTerm term={unit.archetype} style={{ color }}>{archetypeLabel(unit.archetype).toUpperCase()}</GlossaryTerm>
        <span style={{ color: '#555' }}> · Lv.{level}</span>
      </span>
      <span style={{ fontSize: 8, color: '#666', letterSpacing: 0.5 }}>
        HP {eff.hp} · ATK {eff.attack}
      </span>
      {/* §22.5 slots: each pip is a slot, coloured by state for this squad's
          resonance. Dormant (amber) = earned by level but unpowered until the
          squad's resonance is high enough. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
        <span style={{ fontSize: 7, color: '#8a6a3a', letterSpacing: 0.5 }} title={`${ring.name} · resonance R ${resonance}`}>
          {ring.name.replace('The ', '')} · R{resonance}
        </span>
        <span style={{ display: 'flex', gap: 2 }}>
          {slots.map((s) => (
            <span
              key={s.index}
              title={`slot ${s.index + 1}: ${SLOT_STYLE[s.state].label} (needs Lv.${s.needLevel}${s.needResonance ? `, R${s.needResonance}` : ''})`}
              style={{ width: 5, height: 5, borderRadius: '50%', background: SLOT_STYLE[s.state].color, border: s.state === 'locked' ? '1px solid #333' : 'none' }}
            />
          ))}
        </span>
        {hasDormant && <span style={{ fontSize: 7, color: '#d0902a', letterSpacing: 0.3 }}>dormant</span>}
      </div>
    </div>
  );
}

function EnemyRow({ unit, level, threatLabel, isLast }) {
  const color = ARCHETYPES[unit.archetype]?.color || '#888';
  const ts = threatLabel ? THREAT_STYLE[threatLabel] : null;
  const lvl = level ?? unit.level ?? 1;
  const eff = applyLevel({ ...unit, level: lvl });

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '9px 0',
      borderBottom: isLast ? 'none' : '1px solid #0f0f1a',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#ccc', letterSpacing: 0.5 }}>{unit.name}</span>
          <span style={{
            fontSize: 8, color,
            background: color + '15',
            border: `1px solid ${color}30`,
            borderRadius: 3,
            padding: '1px 5px',
            letterSpacing: 0.5,
          }}>
            {archetypeLabel(unit.archetype).toUpperCase()}
          </span>
          <span style={{ fontSize: 8, color: '#888', letterSpacing: 0.5 }}>
            Lv.{lvl} · HP {eff.hp} · ATK {eff.attack}
          </span>
        </div>
        <span style={{ fontSize: 10, color: '#333' }}>
          {ARCHETYPE_IMPLICATION[unit.archetype] || ''}
        </span>
        {ARCHETYPE_MECHANIC[unit.archetype] && (
          <span style={{ fontSize: 9, color: '#1e2e3e', letterSpacing: 0.3 }}>
            {ARCHETYPE_MECHANIC[unit.archetype]}
          </span>
        )}
      </div>

      {ts && (
        <span style={{
          fontSize: 8,
          color: ts.color,
          background: ts.bg,
          border: `1px solid ${ts.border}`,
          borderRadius: 3,
          padding: '2px 7px',
          letterSpacing: 0.5,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          marginLeft: 12,
        }}>
          {threatLabel}
        </span>
      )}
    </div>
  );
}

export default function PreBattle({ encounter, playerSquad, onCommit, onBack }) {
  const spotterRead = generateSpotterRead(playerSquad, encounter.squad);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Header */}
      <div>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', color: '#444',
            fontSize: 12, cursor: 'pointer', letterSpacing: 1, padding: 0, marginBottom: 10,
          }}
        >
          ← Encounters
        </button>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#eee', letterSpacing: 1 }}>
          {encounter.name}
        </div>
        <div style={{ fontSize: 11, color: '#333', marginTop: 5, lineHeight: 1.6 }}>
          {encounter.flavor}
        </div>
      </div>

      {/* Spotter block */}
      <div style={{
        background: '#060610',
        border: '1px solid #131326',
        borderLeft: '2px solid #1e3a5f',
        borderRadius: 5,
        padding: '13px 15px',
      }}>
        <div style={{
          fontSize: 8, color: '#1e3a5f', letterSpacing: 2,
          marginBottom: 10, fontFamily: 'monospace',
        }}>
          ◼ SPOTTER
        </div>
        {spotterRead.lines.map((line, i) => (
          <div key={i} style={{
            fontSize: 12,
            color: '#6a8090',
            lineHeight: 1.7,
            fontStyle: i === 1 ? 'italic' : 'normal',
            marginTop: i > 0 ? 4 : 0,
          }}>
            {line}
          </div>
        ))}
      </div>

      {/* Your squad */}
      <div>
        <div style={{ fontSize: 8, color: '#252535', letterSpacing: 2, marginBottom: 8 }}>
          YOUR SQUAD — {playerSquad.length} UNIT{playerSquad.length !== 1 ? 'S' : ''}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {playerSquad.map((u, i) => (
            <SquadChip key={i} unit={u} resonance={squadResonance(playerSquad, u.instanceId)} />
          ))}
        </div>
      </div>

      {/* Enemy formation */}
      <div>
        <div style={{ fontSize: 8, color: '#252535', letterSpacing: 2, marginBottom: 2 }}>
          ENEMY FORMATION — {encounter.squad.length} UNIT{encounter.squad.length !== 1 ? 'S' : ''}
        </div>
        {encounter.squad.map((u, i) => (
          <EnemyRow
            key={i}
            unit={u}
            level={encounter.level}
            threatLabel={spotterRead.threatLabels[i]}
            isLast={i === encounter.squad.length - 1}
          />
        ))}
      </div>

      {/* Commit */}
      <button
        onClick={onCommit}
        style={{
          padding: '14px',
          background: '#e86040',
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
        Commit to Battle
      </button>

    </div>
  );
}
