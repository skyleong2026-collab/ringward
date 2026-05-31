import { ARTIFACTS_BY_ID, ARTIFACT_TIERS } from '../data/artifacts.js';
import { DIFFICULTIES } from '../data/contracts.js';

// ─── ContractResult (§20.8) ───────────────────────────────────────────────────
// The payout frame. On a win: the artifact this contract grants is unlocked into
// the Codex (access, never stat-power), faction standing is banked, and every
// synergy that fired is logged (discovered → repeatable). On a loss: the contract
// is simply available to retry — no roster change, no stat penalty, no reset
// (anti-permadeath, §20.1). Loss is a setback, never an erasure.

function ArtifactCard({ artifactId, isNew }) {
  const a = ARTIFACTS_BY_ID[artifactId];
  if (!a) return null;
  const tier = ARTIFACT_TIERS[a.tier];
  return (
    <div style={{
      background: '#0c0a12', border: `1px solid ${tier.color}40`,
      borderLeft: `3px solid ${tier.color}`, borderRadius: 7, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: '#eee', letterSpacing: 0.5 }}>{a.name}</span>
          <span style={{ fontSize: 9, color: tier.color, letterSpacing: 1 }}>{tier.mark} {tier.label.toUpperCase()}</span>
        </div>
        {isNew && (
          <span style={{
            fontSize: 8, color: '#7ed321', background: '#7ed32115', border: '1px solid #7ed32140',
            borderRadius: 3, padding: '2px 6px', letterSpacing: 1,
          }}>NEW</span>
        )}
      </div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 6, lineHeight: 1.55 }}>{a.text}</div>
      {a.note && <div style={{ fontSize: 9, color: '#555', marginTop: 5, fontStyle: 'italic' }}>{a.note}</div>}
    </div>
  );
}

export default function ContractResult({ contract, outcome, onRetry, onDone }) {
  const { won, reason, codexResult, firedSynergies = [], revealedCount = 0, repAmount: dialRep, difficultyKey, newRival, currenciesEarned } = outcome;
  const newArtifact = codexResult?.newArtifact;
  const newSynergyKeys = new Set(codexResult?.newSynergies ?? []);
  const repFaction = contract.payout?.reputation?.faction;
  const repAmount = dialRep ?? contract.payout?.reputation?.amount;
  const repTotal = codexResult?.codex?.reputation?.[repFaction];
  const boldLabel = revealedCount === 0 ? 'BLIND DIVE' : revealedCount >= 3 ? 'FULLY SCOUTED' : `${revealedCount} SCOUTED`;
  const diff = DIFFICULTIES[difficultyKey];

  if (won) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Banner */}
        <div style={{
          background: '#0d1a0d', border: '1px solid #7ed32155', borderRadius: 8,
          padding: '16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#7ed321', letterSpacing: 2 }}>CONTRACT COMPLETE</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 5 }}>
            {contract.winLine ?? `The job is done. ${contract.client} remembers.`}
          </div>
        </div>

        {/* Artifact unlocked */}
        {contract.payout?.artifactId && (
          <div>
            <div style={{ fontSize: 8, color: '#252535', letterSpacing: 2, marginBottom: 8 }}>ARTIFACT UNLOCKED</div>
            <ArtifactCard artifactId={contract.payout.artifactId} isNew={newArtifact === contract.payout.artifactId} />
            {newArtifact !== contract.payout.artifactId && (
              <div style={{ fontSize: 9, color: '#444', marginTop: 6 }}>Already in your Codex — access confirmed.</div>
            )}
          </div>
        )}

        {/* Reputation */}
        {repFaction && (
          <div style={{
            background: '#0c0a12', border: '1px solid #2a1f3a', borderRadius: 6,
            padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#9b6bd6', letterSpacing: 1 }}>{repFaction.toUpperCase()} STANDING</span>
              <span style={{
                fontSize: 7, color: '#8a6ab0', background: '#9b6bd615', border: '1px solid #9b6bd62a',
                borderRadius: 3, padding: '1px 5px', letterSpacing: 1,
              }}>{boldLabel}</span>
            </div>
            <span style={{ fontSize: 12, color: '#cba6e6', fontWeight: 700 }}>
              +{repAmount}{repTotal != null && <span style={{ color: '#555', fontWeight: 400 }}> → {repTotal}</span>}
            </span>
          </div>
        )}

        {/* Synergies logged to Codex */}
        <div>
          <div style={{ fontSize: 8, color: '#252535', letterSpacing: 2, marginBottom: 8 }}>
            SYNERGIES LOGGED — {firedSynergies.length}
          </div>
          {firedSynergies.length === 0 ? (
            <div style={{ fontSize: 10, color: '#444', lineHeight: 1.6 }}>
              No gear or engine synergies fired this fight. A leaner win — the Codex stays as it was.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {firedSynergies.map((s) => {
                const isNew = newSynergyKeys.has(s.key);
                return (
                  <div key={s.key} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 9px', borderRadius: 5,
                    background: isNew ? '#0d1a0d' : '#0d0d18',
                    border: `1px solid ${isNew ? '#7ed32140' : '#1e1e2e'}`,
                  }}>
                    <span style={{ fontSize: 10, color: isNew ? '#7ed321' : '#888', fontWeight: 600, letterSpacing: 0.5 }}>{s.label}</span>
                    <span style={{ fontSize: 8, color: '#444' }}>{s.unitName}</span>
                    {isNew && <span style={{ fontSize: 7, color: '#7ed321', letterSpacing: 1 }}>NEW</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Currencies earned */}
        {currenciesEarned && (currenciesEarned.credits > 0 || currenciesEarned.shards > 0 || currenciesEarned.marks > 0) && (
          <div style={{
            background: '#08080f', border: '1px solid #1e1e2e', borderRadius: 6,
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 20,
          }}>
            <span style={{ fontSize: 8, color: '#333', letterSpacing: 1.5 }}>EARNED</span>
            {currenciesEarned.credits > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 9, color: '#8888cc' }}>⦿</span>
                <span style={{ fontSize: 11, color: '#aaaaee', fontWeight: 700 }}>+{currenciesEarned.credits}</span>
                <span style={{ fontSize: 8, color: '#444' }}>credits</span>
              </div>
            )}
            {currenciesEarned.shards > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 9, color: '#3a9a6a' }}>◈</span>
                <span style={{ fontSize: 11, color: '#5abf8a', fontWeight: 700 }}>+{currenciesEarned.shards}</span>
                <span style={{ fontSize: 8, color: '#444' }}>shards</span>
              </div>
            )}
            {currenciesEarned.marks > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 9, color: '#d0902a' }}>✦</span>
                <span style={{ fontSize: 11, color: '#e8a840', fontWeight: 700 }}>+{currenciesEarned.marks}</span>
                <span style={{ fontSize: 8, color: '#444' }}>marks</span>
              </div>
            )}
          </div>
        )}

        {/* Difficulty badge */}
        {diff && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: diff.color + '10', border: `1px solid ${diff.color}30`, borderRadius: 6 }}>
            <span style={{ fontSize: 9, color: diff.color, fontWeight: 700, letterSpacing: 1 }}>CLEARED ON {diff.label.toUpperCase()}</span>
            <span style={{ fontSize: 8, color: '#555' }}>·  ×{diff.payoutMult} payout</span>
          </div>
        )}

        {/* Rival unlock reveal */}
        {newRival && (
          <div style={{
            background: '#0c0a14', border: '1px solid #9b6bd660', borderRadius: 8, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 8, color: '#9b6bd6', letterSpacing: 2, marginBottom: 8 }}>RIVAL UNLOCKED</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#cba6e6', letterSpacing: 1 }}>
              {newRival.charAt(0).toUpperCase() + newRival.slice(1)} challenges you.
            </div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 5, lineHeight: 1.6 }}>
              You've earned enough standing that someone noticed. They're on the board now — and they escalate each time you beat them.
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={onRetry} style={{
            padding: '12px', background: '#1a1a2a', border: '1px solid #3a3a5a', borderRadius: 8,
            color: '#8888ff', fontSize: 12, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', textTransform: 'uppercase',
          }}>Run Again</button>
          <button onClick={onDone} style={{
            padding: '12px', background: '#e86040', border: 'none', borderRadius: 8,
            color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', textTransform: 'uppercase',
          }}>Return</button>
        </div>
      </div>
    );
  }

  // ── Loss ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        background: '#1a0d0d', border: '1px solid #d0021b44', borderRadius: 8,
        padding: '16px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#d0021b', letterSpacing: 2 }}>
          {reason === 'clock' ? 'THE SIGNAL COMPLETED'
            : reason === 'escortee' ? 'THE BEACON FELL'
            : reason === 'forfeit' ? 'CONTRACT FORFEITED'
            : 'THE SQUAD FELL'}
        </div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 6, lineHeight: 1.6 }}>
          {reason === 'clock'
            ? 'The third surge went off before you could quiet it. The job is still open.'
            : reason === 'escortee'
            ? 'The surge broke through before the crossing could hold. The job is still open.'
            : reason === 'forfeit'
            ? 'You pulled out. It counts as a loss, but nothing was taken — the job stays open.'
            : 'Your squad could not hold. The job is still open.'}
        </div>
      </div>

      <div style={{
        background: '#0d0d18', border: '1px solid #1e1e2e', borderRadius: 7, padding: '13px 15px',
      }}>
        <div style={{ fontSize: 8, color: '#252535', letterSpacing: 2, marginBottom: 8 }}>NO LASTING COST</div>
        <div style={{ fontSize: 11, color: '#777', lineHeight: 1.7 }}>
          Nothing was lost. Your roster is intact, no stat penalty, no reset. The contract is available to
          retry — bring a different build, or the same one with a sharper plan.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button onClick={onDone} style={{
          padding: '12px', background: 'none', border: '1px solid #2a2a3a', borderRadius: 8,
          color: '#666', fontSize: 12, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', textTransform: 'uppercase',
        }}>Back to Roster</button>
        <button onClick={onRetry} style={{
          padding: '12px', background: '#e86040', border: 'none', borderRadius: 8,
          color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', textTransform: 'uppercase',
        }}>Retry Contract</button>
      </div>
    </div>
  );
}
