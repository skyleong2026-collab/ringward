import { loadCodex } from '../engine/codex.js';
import { countRevealed, RIVALS, RIVAL_UNLOCK_THRESHOLD, DIFFICULTIES } from '../data/contracts.js';

// ─── ContractsList (§20.8 + Test 4 Rivals + Test 6 Difficulty) ───────────────
// The board of available contracts plus the Rivals section. Each job is
// build-vs-build under a constraint; the Rivals section shows recurring opponents
// that escalate with each defeat — the async-PvP on-ramp.

const FACTION_STYLE = {
  Shadow: { color: '#9b6bd6', accent: '#6a4a9a', bg: '#120a1a', label: 'SHADOW' },
  Light:  { color: '#4a90d9', accent: '#2a5a8a', bg: '#0a1018', label: 'LIGHT' },
  Wild:   { color: '#3a8a4a', accent: '#2a5a3a', bg: '#0a140c', label: 'WILD' },
};

const TIER_LABELS = ['I', 'II', 'III', 'IV'];

function RivalCard({ rival, rivalData, onSelect }) {
  const fs = FACTION_STYLE[rival.faction] || FACTION_STYLE.Shadow;
  const tier = rivalData?.tier ?? 0;
  const wins = rivalData?.wins ?? 0;
  const losses = rivalData?.losses ?? 0;
  const lastResult = rivalData?.lastResult;
  const enemyLevel = rival.tiers[Math.min(tier, rival.tiers.length - 1)]?.level;

  return (
    <button
      onClick={() => onSelect(rival)}
      style={{
        textAlign: 'left', cursor: 'pointer',
        background: '#0c0a14', border: `1px solid ${fs.color}30`, borderLeft: `2px solid ${fs.color}`,
        borderRadius: 7, padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 7,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 7, color: fs.color, background: fs.bg, border: `1px solid ${fs.accent}`,
            borderRadius: 3, padding: '2px 6px', letterSpacing: 1.5,
          }}>{fs.label} RIVAL</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#eee' }}>{rival.name}</span>
          <span style={{ fontSize: 9, color: '#555', letterSpacing: 0.5 }}>{rival.title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {TIER_LABELS.map((t, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: 2,
              background: i <= tier ? fs.color : '#1a1a2a',
              border: `1px solid ${i <= tier ? fs.color : '#2a2a3a'}`,
            }} />
          ))}
          <span style={{ fontSize: 7, color: fs.color, marginLeft: 4, letterSpacing: 1 }}>TIER {TIER_LABELS[tier]}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, fontSize: 8, color: '#3a3a4a', letterSpacing: 0.5 }}>
        <span>Lv.{enemyLevel} squad</span>
        <span>·</span>
        <span style={{ color: wins > 0 ? '#7ed321' : '#3a3a4a' }}>{wins}W</span>
        <span style={{ color: losses > 0 ? '#d0021b' : '#3a3a4a' }}>{losses}L</span>
        {lastResult && (
          <span style={{ color: lastResult === 'win' ? '#7ed321' : '#d0021b' }}>
            · last: {lastResult.toUpperCase()}
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: fs.color }}>GAUNTLET →</span>
      </div>
    </button>
  );
}

function LockedRivalRow({ rival }) {
  const fs = FACTION_STYLE[rival.faction] || FACTION_STYLE.Shadow;
  return (
    <div style={{
      background: '#080810', border: '1px solid #14141e', borderLeft: `2px solid #2a2a3a`,
      borderRadius: 7, padding: '11px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 7, color: '#333', letterSpacing: 1.5 }}>{fs.label} RIVAL</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#33333f' }}>{rival.name}</span>
      </div>
      <span style={{ fontSize: 8, color: '#333', letterSpacing: 0.5 }}>
        Earn {rival.faction} standing {RIVAL_UNLOCK_THRESHOLD} to unlock
      </span>
    </div>
  );
}

export default function ContractsList({ contracts, onSelect, onSelectRival, onBack }) {
  const codex = loadCodex();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: '#444',
          fontSize: 12, cursor: 'pointer', letterSpacing: 1, padding: 0, marginBottom: 10,
        }}>← Roster</button>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#eee', letterSpacing: 1 }}>Contracts</div>
        <div style={{ fontSize: 11, color: '#444', marginTop: 4, lineHeight: 1.6 }}>
          Every job is a build against a build, under one constraint. Pick the problem that fits what you brought.
        </div>
      </div>

      {/* Regular contracts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {contracts.map((contract) => {
          const fs = FACTION_STYLE[contract.client] || FACTION_STYLE.Shadow;
          const standing = codex.reputation?.[contract.client] ?? 0;
          const done = !!codex.artifacts?.[contract.payout?.artifactId]?.unlocked;
          const scouted = countRevealed(codex.intel?.[contract.id]);
          // Highest difficulty cleared (stored in codex.cleared[contractId])
          const cleared = codex.cleared?.[contract.id];
          const clearedDiff = cleared ? DIFFICULTIES[cleared] : null;
          return (
            <button
              key={contract.id}
              onClick={() => onSelect(contract)}
              style={{
                textAlign: 'left', cursor: 'pointer',
                background: '#0b0b14', border: '1px solid #1a1a2a', borderLeft: `2px solid ${fs.color}`,
                borderRadius: 7, padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 7,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 7, color: fs.color, background: fs.bg, border: `1px solid ${fs.accent}`,
                    borderRadius: 3, padding: '2px 6px', letterSpacing: 1.5,
                  }}>{fs.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#eee', letterSpacing: 0.5 }}>{contract.name}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {clearedDiff && (
                    <span style={{ fontSize: 7, color: clearedDiff.color, letterSpacing: 1, border: `1px solid ${clearedDiff.color}40`, borderRadius: 3, padding: '1px 5px' }}>
                      ✓ {clearedDiff.label.toUpperCase()}
                    </span>
                  )}
                  {done && !clearedDiff && (
                    <span style={{ fontSize: 8, color: '#7ed321', letterSpacing: 1 }}>✓ CLEARED</span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 10, color: '#5a5a6a', lineHeight: 1.5 }}>{contract.modifier.headline}</div>
              <div style={{ display: 'flex', gap: 12, fontSize: 8, color: '#3a3a4a', letterSpacing: 0.5 }}>
                <span>{fs.label} STANDING {standing}</span>
                <span>·</span>
                <span>{scouted > 0 ? `${scouted}/3 SCOUTED` : 'UNSCOUTED'}</span>
                <span style={{ marginLeft: 'auto', color: fs.color }}>OPEN →</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Rivals section (Test 4) */}
      <div>
        <div style={{ fontSize: 8, color: '#252535', letterSpacing: 2, marginBottom: 8 }}>RIVALS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {RIVALS.map((rival) => {
            const rivalKey = rival.faction.toLowerCase();
            const rivalData = codex.rivals?.[rivalKey];
            const unlocked = !!rivalData;
            return unlocked
              ? <RivalCard key={rival.rivalId} rival={rival} rivalData={rivalData} onSelect={onSelectRival} />
              : <LockedRivalRow key={rival.rivalId} rival={rival} />;
          })}
        </div>
      </div>
    </div>
  );
}
