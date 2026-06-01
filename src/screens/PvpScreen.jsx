import { useEffect, useState, useRef } from 'react';
import { ARCHETYPES, archetypeLabel } from '../data/creatures.js';
import { myDefense, fetchLeaderboard, submitDefense, pvpIsMock, myRating } from '../engine/pvp.js';

// ─── PvpScreen (vC-K refresh) ─────────────────────────────────────────────────
// Arena hub. Shows a browsable pool of 4 rating-matched opponents — you pick
// who to fight. Refresh pulls a new draw: free after a 5-minute cooldown, or
// spend 20 ⦿ credits to refresh immediately.

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const ARCHETYPE_COLOR = { Guardian: '#4a90d9', Echo: '#7ed321', Swift: '#d0021b', Spark: '#f5a623' };

function fmt(ms) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function SquadGlyphs({ squad }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {(squad ?? []).map((u, i) => (
        <span key={i} title={`${u.name ?? u.id} (${u.archetype ?? '?'})`} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: ARCHETYPES[u.archetype]?.color ?? '#555',
        }} />
      ))}
    </div>
  );
}

// Live countdown hook — re-renders every second while cooldown is active.
function useCountdown(refreshedAt) {
  const [msLeft, setMsLeft] = useState(0);
  useEffect(() => {
    function tick() {
      const left = Math.max(0, refreshedAt + COOLDOWN_MS - Date.now());
      setMsLeft(left);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [refreshedAt]);
  return msLeft;
}

export default function PvpScreen({
  playerSquad, pvpPool, pvpPoolRefreshedAt, currencies, refreshCost,
  onLoadPool, onSelectOpponent, onBack, lastResult,
}) {
  const [defense, setDefense] = useState(null);
  const [board, setBoard] = useState([]);
  const [rating, setRating] = useState(myRating() ?? 1000);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPool, setLoadingPool] = useState(false);
  const msLeft = useCountdown(pvpPoolRefreshedAt);
  const onCooldown = msLeft > 0;
  const canAffordRefresh = (currencies?.credits ?? 0) >= refreshCost;
  const hasPool = pvpPool.length > 0;

  // Auto-load pool when screen opens (free first draw).
  const didAutoLoad = useRef(false);
  useEffect(() => {
    if (!didAutoLoad.current && pvpPool.length === 0) {
      didAutoLoad.current = true;
      handleLoad(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function refresh() {
    setDefense(await myDefense());
    setBoard(await fetchLeaderboard(8));
    setRating(myRating() ?? defense?.rating ?? 1000);
  }
  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLoad(paid) {
    setLoadingPool(true);
    await onLoadPool(paid);
    setLoadingPool(false);
  }

  async function updateDefense() {
    if (playerSquad.length === 0) return;
    setSubmitting(true);
    await submitDefense(playerSquad);
    await refresh();
    setSubmitting(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#444', fontSize: 12, cursor: 'pointer', letterSpacing: 1, padding: 0, marginBottom: 10 }}>← Stable</button>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: '#eee', letterSpacing: 1 }}>Arena</span>
          <span style={{ fontSize: 12, color: '#e8a' }}>Rating {rating}</span>
        </div>
      </div>

      {/* Your dispatch */}
      <div style={{ background: '#0b0b14', border: '1px solid #1a1a2e', borderLeft: '2px solid #4a6a8a', borderRadius: 7, padding: '12px 14px' }}>
        <div style={{ fontSize: 8, color: '#4a6a8a', letterSpacing: 2, marginBottom: 8 }}>YOUR DISPATCH</div>
        {playerSquad.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: '#555' }}>No agents selected.</span>
            <button onClick={onBack} style={{ background: 'none', border: '1px solid #2a2a3a', borderRadius: 5, color: '#666', fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', padding: '5px 10px', textTransform: 'uppercase' }}>← Configure in Stable</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {playerSquad.map((u, i) => {
              const color = ARCHETYPE_COLOR[u.archetype] ?? '#888';
              return (
                <div key={u.instanceId ?? i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#ccc', fontWeight: 600, flex: 1 }}>{u.name}</span>
                  <span style={{ fontSize: 9, color: color }}>{archetypeLabel(u.archetype)}</span>
                  <span style={{ fontSize: 8, color: '#444' }}>Lv.{u.level ?? 1}</span>
                </div>
              );
            })}
            <button onClick={onBack} style={{ marginTop: 4, background: 'none', border: 'none', color: '#3a5a7a', fontSize: 9, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', padding: 0, textAlign: 'left', textTransform: 'uppercase' }}>← Change squad in Stable</button>
          </div>
        )}
      </div>

      {pvpIsMock() && (
        <div style={{ fontSize: 9, color: '#7a5a2a', background: '#1a140a', border: '1px solid #6a5a2a55', borderRadius: 5, padding: '7px 10px', lineHeight: 1.5 }}>
          ◇ OFFLINE MODE — fighting local bot squads.
        </div>
      )}

      {lastResult && (
        <div style={{ background: lastResult.won ? '#0d1a0d' : '#1a0d0d', border: `1px solid ${lastResult.won ? '#7ed32155' : '#d0021b44'}`, borderRadius: 6, padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: lastResult.won ? '#7ed321' : '#d0021b', letterSpacing: 1 }}>
            {lastResult.won ? 'VICTORY' : 'DEFEAT'} vs {lastResult.opponentName}
          </span>
          <span style={{ fontSize: 11, color: '#999' }}>{lastResult.delta >= 0 ? '+' : ''}{lastResult.delta} rating</span>
        </div>
      )}

      {/* Opponent pool */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 8, color: '#252535', letterSpacing: 2 }}>CHALLENGE</div>
          {/* Refresh controls */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* Free timed refresh */}
            {onCooldown ? (
              <span style={{ fontSize: 8, color: '#333', letterSpacing: 0.5 }}>Free refresh in {fmt(msLeft)}</span>
            ) : (
              <button
                onClick={() => handleLoad(false)}
                disabled={loadingPool}
                style={{ background: 'none', border: '1px solid #2a2a3a', borderRadius: 4, color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 1, cursor: loadingPool ? 'default' : 'pointer', padding: '4px 8px', textTransform: 'uppercase' }}
              >
                {loadingPool ? '…' : 'Refresh'}
              </button>
            )}
            {/* Paid instant refresh */}
            {onCooldown && (
              <button
                onClick={() => canAffordRefresh && handleLoad(true)}
                disabled={!canAffordRefresh || loadingPool}
                title={canAffordRefresh ? `Spend ${refreshCost} credits to refresh now` : `Need ${refreshCost} ⦿ credits`}
                style={{
                  background: canAffordRefresh ? '#1a1a0a' : '#0d0d0d',
                  border: `1px solid ${canAffordRefresh ? '#6a5a2a55' : '#1e1e1e'}`,
                  borderRadius: 4, color: canAffordRefresh ? '#c8a030' : '#333',
                  fontSize: 9, fontWeight: 700, letterSpacing: 1,
                  cursor: canAffordRefresh ? 'pointer' : 'default',
                  padding: '4px 8px', textTransform: 'uppercase',
                }}
              >
                {refreshCost} ⦿
              </button>
            )}
          </div>
        </div>

        {loadingPool && !hasPool ? (
          <div style={{ fontSize: 10, color: '#333', padding: '12px 0', textAlign: 'center' }}>Scanning for opponents…</div>
        ) : !hasPool ? (
          <div style={{ fontSize: 10, color: '#333', padding: '12px 0', textAlign: 'center' }}>No opponents found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {pvpPool.map((opp, i) => {
              const ratingDiff = opp.rating - rating;
              const diffLabel = ratingDiff === 0 ? '=' : ratingDiff > 0 ? `+${ratingDiff}` : `${ratingDiff}`;
              const diffColor = ratingDiff > 50 ? '#d0021b' : ratingDiff < -50 ? '#7ed321' : '#888';
              // Detect dominant archetype for a rough type label
              const archetypeCounts = {};
              (opp.squad ?? []).forEach((u) => { archetypeCounts[u.archetype] = (archetypeCounts[u.archetype] ?? 0) + 1; });
              const dominant = Object.entries(archetypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
              const domColor = ARCHETYPE_COLOR[dominant] ?? '#888';

              return (
                <button
                  key={opp.id ?? i}
                  onClick={() => playerSquad.length > 0 && onSelectOpponent(opp)}
                  disabled={playerSquad.length === 0}
                  style={{
                    textAlign: 'left', cursor: playerSquad.length > 0 ? 'pointer' : 'default',
                    background: '#0b0b14', border: '1px solid #1a1a2a',
                    borderLeft: `2px solid ${domColor}55`,
                    borderRadius: 7, padding: '11px 14px',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                >
                  {/* Rank number */}
                  <span style={{ fontSize: 9, color: '#333', width: 14, flexShrink: 0 }}>{i + 1}</span>

                  {/* Name + squad glyphs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#ddd', letterSpacing: 0.5 }}>{opp.player_name ?? 'Unknown'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <SquadGlyphs squad={opp.squad} />
                      {dominant && <span style={{ fontSize: 8, color: domColor, letterSpacing: 1 }}>{dominant.toUpperCase()}</span>}
                      <span style={{ fontSize: 8, color: '#3a3a4a' }}>{opp.wins ?? 0}W {opp.losses ?? 0}L</span>
                    </div>
                  </div>

                  {/* Rating */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontSize: 12, color: '#aaa', fontWeight: 700 }}>{opp.rating}</span>
                    <span style={{ fontSize: 8, color: diffColor }}>{diffLabel}</span>
                  </div>

                  <span style={{ fontSize: 9, color: '#555' }}>⚔</span>
                </button>
              );
            })}
          </div>
        )}
        {playerSquad.length === 0 && hasPool && (
          <div style={{ fontSize: 9, color: '#555', marginTop: 8, textAlign: 'center' }}>
            Select a dispatch squad in the Stable before fighting.
          </div>
        )}
      </div>

      {/* Your defense */}
      <div style={{ background: '#0b0b14', border: '1px solid #1a1a2a', borderRadius: 7, padding: '13px 15px' }}>
        <div style={{ fontSize: 8, color: '#252535', letterSpacing: 2, marginBottom: 8 }}>YOUR DEFENSE</div>
        {defense ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <SquadGlyphs squad={defense.squad} />
            <span style={{ fontSize: 9, color: '#555' }}>{defense.wins ?? 0}W · {defense.losses ?? 0}L</span>
          </div>
        ) : (
          <div style={{ fontSize: 10, color: '#555' }}>No defense submitted yet.</div>
        )}
        <button onClick={updateDefense} disabled={playerSquad.length === 0 || submitting} style={{
          marginTop: 10, width: '100%', padding: '9px', borderRadius: 5, cursor: playerSquad.length ? 'pointer' : 'default',
          background: playerSquad.length ? '#1a1a2a' : '#111', border: `1px solid ${playerSquad.length ? '#3a3a5a' : '#1e1e2a'}`,
          color: playerSquad.length ? '#9b9bff' : '#333', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
        }}>
          {submitting ? 'Submitting…' : defense ? 'Update Defense (current squad)' : 'Submit Defense (current squad)'}
        </button>
      </div>

      {/* Leaderboard */}
      <div>
        <div style={{ fontSize: 8, color: '#252535', letterSpacing: 2, marginBottom: 8 }}>LEADERBOARD</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {board.map((r, i) => {
            const me = r.id === 'me';
            return (
              <div key={r.id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px', borderRadius: 5, background: me ? '#160e22' : '#0b0b14', border: `1px solid ${me ? '#9b6bd64a' : '#161620'}` }}>
                <span style={{ fontSize: 10, color: '#444', width: 16 }}>{i + 1}</span>
                <span style={{ fontSize: 11, fontWeight: me ? 800 : 600, color: me ? '#cba6e6' : '#bbb', flex: 1 }}>{r.player_name ?? 'Anon'}</span>
                <SquadGlyphs squad={r.squad} />
                <span style={{ fontSize: 11, color: '#888', width: 44, textAlign: 'right' }}>{r.rating}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
