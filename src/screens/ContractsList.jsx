import { loadCodex } from '../engine/codex.js';
import { countRevealed } from '../data/contracts.js';

// ─── ContractsList (§20.8) ────────────────────────────────────────────────────
// The board of available contracts. Each is build-vs-build under a stated
// constraint; the player picks which problem to take. Shows faction, the hook,
// current standing, and how much of it has already been scouted (intel persists).

const FACTION_STYLE = {
  Shadow: { color: '#9b6bd6', accent: '#6a4a9a', bg: '#120a1a', label: 'SHADOW' },
  Light:  { color: '#4a90d9', accent: '#2a5a8a', bg: '#0a1018', label: 'LIGHT' },
  Wild:   { color: '#3a8a4a', accent: '#2a5a3a', bg: '#0a140c', label: 'WILD' },
};

export default function ContractsList({ contracts, onSelect, onBack }) {
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {contracts.map((contract) => {
          const fs = FACTION_STYLE[contract.client] || FACTION_STYLE.Shadow;
          const standing = codex.reputation?.[contract.client] ?? 0;
          const done = !!codex.artifacts?.[contract.payout?.artifactId]?.unlocked;
          const scouted = countRevealed(codex.intel?.[contract.id]);
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
                {done && (
                  <span style={{ fontSize: 8, color: '#7ed321', letterSpacing: 1 }}>✓ CLEARED</span>
                )}
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
    </div>
  );
}
