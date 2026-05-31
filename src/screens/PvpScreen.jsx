import { useEffect, useState } from 'react';
import { ARCHETYPES } from '../data/creatures.js';
import { myDefense, fetchLeaderboard, submitDefense, pvpIsMock, myRating } from '../engine/pvp.js';

// ─── PvpScreen (Test 5) ───────────────────────────────────────────────────────
// Async-PvP hub: submit your squad as a defense, find a rating-matched opponent
// to fight (locally, deterministic), and watch the leaderboard. Backed by a
// local mock until a dedicated Supabase project is wired (see PVP-SCAFFOLD.md).

function SquadGlyphs({ squad }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {(squad ?? []).map((u, i) => (
        <span key={i} title={`${u.name ?? u.id} (${u.archetype ?? '?'})`} style={{
          width: 9, height: 9, borderRadius: '50%',
          background: ARCHETYPES[u.archetype]?.color ?? '#555',
        }} />
      ))}
    </div>
  );
}

export default function PvpScreen({ playerSquad, onFindMatch, onBack, lastResult }) {
  const [defense, setDefense] = useState(null);
  const [board, setBoard] = useState([]);
  const [rating, setRating] = useState(myRating() ?? 1000);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    setDefense(await myDefense());
    setBoard(await fetchLeaderboard(8));
    setRating(myRating() ?? defense?.rating ?? 1000);
  }
  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateDefense() {
    if (playerSquad.length === 0) return;
    setSubmitting(true);
    await submitDefense(playerSquad);
    await refresh();
    setSubmitting(false);
  }

  const canFight = !!defense || playerSquad.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#444', fontSize: 12, cursor: 'pointer', letterSpacing: 1, padding: 0, marginBottom: 10 }}>← Roster</button>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: '#eee', letterSpacing: 1 }}>Arena</span>
          <span style={{ fontSize: 12, color: '#e8a' }}>Rating {rating}</span>
        </div>
        <div style={{ fontSize: 11, color: '#444', marginTop: 4, lineHeight: 1.6 }}>
          Submit a defense squad, then fight rating-matched opponents. Matches replay deterministically — you fight a snapshot of their build.
        </div>
      </div>

      {pvpIsMock() && (
        <div style={{ fontSize: 9, color: '#7a5a2a', background: '#1a140a', border: '1px solid #6a5a2a55', borderRadius: 5, padding: '7px 10px', lineHeight: 1.5 }}>
          ◇ OFFLINE MODE — playing vs local bot squads. Add a dedicated Supabase project's keys to go networked (see PVP-SCAFFOLD.md).
        </div>
      )}

      {lastResult && (
        <div style={{
          background: lastResult.won ? '#0d1a0d' : '#1a0d0d',
          border: `1px solid ${lastResult.won ? '#7ed32155' : '#d0021b44'}`,
          borderRadius: 6, padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: lastResult.won ? '#7ed321' : '#d0021b', letterSpacing: 1 }}>
            {lastResult.won ? 'VICTORY' : 'DEFEAT'} vs {lastResult.opponentName}
          </span>
          <span style={{ fontSize: 11, color: '#999' }}>{lastResult.delta >= 0 ? '+' : ''}{lastResult.delta} rating</span>
        </div>
      )}

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

      {/* Find match */}
      <button onClick={onFindMatch} disabled={!canFight} style={{
        padding: '14px', borderRadius: 7, cursor: canFight ? 'pointer' : 'default',
        background: canFight ? '#9b6bd6' : '#111', border: 'none',
        color: canFight ? '#fff' : '#333', fontSize: 13, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase',
      }}>
        ⚔ Find Opponent
      </button>

      {/* Leaderboard */}
      <div>
        <div style={{ fontSize: 8, color: '#252535', letterSpacing: 2, marginBottom: 8 }}>LEADERBOARD</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {board.map((r, i) => {
            const me = r.id === 'me';
            return (
              <div key={r.id ?? i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px', borderRadius: 5,
                background: me ? '#160e22' : '#0b0b14', border: `1px solid ${me ? '#9b6bd64a' : '#161620'}`,
              }}>
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
