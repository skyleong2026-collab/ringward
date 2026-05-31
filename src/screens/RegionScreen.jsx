import { loadCodex } from '../engine/codex.js';
import { REGIONS, combinedStanding, regionUnlocked } from '../data/regions.js';
import { availableContractIds } from '../data/regions.js';

// ─── RegionScreen (World Layer board — vC-O) ──────────────────────────────────
// Territory select. The Ironfield is home and holds every current contract;
// frontier territories are the visible horizon — locked behind a COMBINED
// standing threshold (Shadow rep + Light rep). Doing work anywhere pushes the
// frontier open. Contracts carry a `region` id, so a frontier lights up with
// real operations the moment content is tagged into it — no screen change needed.

const FACTION_STYLE = {
  Shadow: { color: '#9b6bd6', label: 'SHADOW' },
  Light:  { color: '#4a90d9', label: 'LIGHT' },
  Wild:   { color: '#3a8a4a', label: 'WILD' },
};

// Count contracts in a region, split into available-now vs total, using the
// per-faction rep ladders (standing within a region still gates each contract).
function regionContractCounts(region, contracts, reputation) {
  const inRegion = contracts.filter((c) => (c.region ?? 'ironfield') === region.id);
  if (inRegion.length === 0) return { available: 0, total: 0 };
  const availIds = new Set();
  for (const faction of region.factions ?? []) {
    for (const id of availableContractIds(faction, reputation?.[faction] ?? 0)) availIds.add(id);
  }
  const available = inRegion.filter((c) => availIds.has(c.id)).length;
  return { available, total: inRegion.length };
}

function FactionChips({ factions }) {
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      {(factions ?? []).map((f) => {
        const fs = FACTION_STYLE[f] || FACTION_STYLE.Shadow;
        return (
          <span key={f} style={{
            fontSize: 7, color: fs.color, border: `1px solid ${fs.color}40`,
            borderRadius: 3, padding: '1px 5px', letterSpacing: 1.5,
          }}>{fs.label}</span>
        );
      })}
    </div>
  );
}

function RegionCard({ region, counts, onEnter }) {
  const lean = FACTION_STYLE[region.lean] || FACTION_STYLE.Shadow;
  const enterable = counts.available > 0;
  const opening = counts.total === 0; // unlocked frontier with no ops posted yet

  return (
    <button
      onClick={enterable ? () => onEnter(region.id) : undefined}
      disabled={!enterable}
      style={{
        textAlign: 'left', cursor: enterable ? 'pointer' : 'default',
        background: '#0b0b14', border: '1px solid #1a1a2a', borderLeft: `2px solid ${lean.color}`,
        borderRadius: 8, padding: '15px 16px', display: 'flex', flexDirection: 'column', gap: 9,
        opacity: enterable ? 1 : 0.78,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18, color: lean.color, lineHeight: 1 }}>{region.sigil}</span>
          <span style={{ fontSize: 15, fontWeight: 900, color: '#eee', letterSpacing: 0.5 }}>{region.name}</span>
          {region.status === 'home' && (
            <span style={{ fontSize: 7, color: '#7ed321', border: '1px solid #7ed32140', borderRadius: 3, padding: '1px 5px', letterSpacing: 1.5 }}>HOME</span>
          )}
        </div>
        <FactionChips factions={region.factions} />
      </div>

      <div style={{ fontSize: 10, color: '#5a5a6a', lineHeight: 1.55 }}>{region.tagline}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 8, color: '#3a3a4a', letterSpacing: 0.5 }}>
        {opening ? (
          <span style={{ color: lean.color }}>Operations opening soon</span>
        ) : (
          <span style={{ color: counts.available > 0 ? '#6a6a7a' : '#3a3a4a' }}>
            {counts.available} of {counts.total} operations active
          </span>
        )}
        {enterable && <span style={{ marginLeft: 'auto', color: lean.color }}>ENTER →</span>}
      </div>
    </button>
  );
}

function LockedRegionCard({ region, standing }) {
  const lean = FACTION_STYLE[region.lean] || FACTION_STYLE.Shadow;
  const need = region.unlockAt ?? 0;
  const remaining = Math.max(0, need - standing);
  const pct = Math.max(0, Math.min(1, standing / (need || 1)));

  return (
    <div style={{
      background: '#080810', border: '1px solid #14141e', borderLeft: '2px solid #2a2a3a',
      borderRadius: 8, padding: '15px 16px', display: 'flex', flexDirection: 'column', gap: 9,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18, color: '#2f2f3c', lineHeight: 1 }}>{region.sigil}</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#3a3a48', letterSpacing: 0.5 }}>{region.name}</span>
        </div>
        <span style={{ fontSize: 11, color: '#2f2f3c' }}>🔒</span>
      </div>

      <div style={{ fontSize: 10, color: '#3a3a46', lineHeight: 1.55 }}>{region.tagline}</div>

      {/* Combined-standing progress to unlock */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ height: 4, background: '#14141e', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${pct * 100}%`, height: '100%', background: lean.color + '88' }} />
        </div>
        <div style={{ fontSize: 8, color: '#3a3a4a', letterSpacing: 0.5 }}>
          Opens at <span style={{ color: '#6a6a7a' }}>{need} combined standing</span>
          {' · '}{remaining > 0 ? `${remaining} to go` : 'ready — earn rep to secure'}
        </div>
      </div>
    </div>
  );
}

export default function RegionScreen({ contracts, onEnter, onBack }) {
  const codex = loadCodex();
  const reputation = codex.reputation ?? {};
  const standing = combinedStanding(reputation);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: '#444',
          fontSize: 12, cursor: 'pointer', letterSpacing: 1, padding: 0, marginBottom: 10,
        }}>← Stable</button>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#eee', letterSpacing: 1 }}>The World</div>
          <div style={{ fontSize: 9, color: '#555', letterSpacing: 1 }}>
            COMBINED STANDING <span style={{ color: '#8a8a9a', fontWeight: 700 }}>{standing}</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#444', marginTop: 4, lineHeight: 1.6 }}>
          Pick a territory to work. Standing earned anywhere pushes the frontier open.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {REGIONS.map((region) => {
          const unlocked = regionUnlocked(region, standing);
          if (!unlocked) return <LockedRegionCard key={region.id} region={region} standing={standing} />;
          const counts = regionContractCounts(region, contracts, reputation);
          return <RegionCard key={region.id} region={region} counts={counts} onEnter={onEnter} />;
        })}
      </div>
    </div>
  );
}
