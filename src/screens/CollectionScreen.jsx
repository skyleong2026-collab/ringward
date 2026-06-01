import { ARCHETYPES, CREATURES, CREATURE_BY_ID, RECRUITABLE, RECRUITABLE_IDS } from '../data/creatures.js';
import { GEAR } from '../data/gear.js';
import { MODULES } from '../data/modules.js';
import { SIG_MODS, SIG_MODS_BY_ID, SIG_RANK_MAX, sigModRankedText, sigRankUpCost } from '../data/sigMods.js';
import { xpProgress, getAuraStyle } from '../engine/progression.js';
import { AnimationPlayer } from '../components/AnimationPlayer.jsx';
import { useState, useEffect } from 'react';
import { MAX_SQUAD } from '../config.js';

const ARCHETYPE_ABBR = { Guardian: 'GRD', Echo: 'ECH', Swift: 'SWT', Spark: 'SPK' };

// Each creature's signature — its defining behavioral identity (vC-F). Looked up
// from CREATURES by creature id so it shows even on collections saved earlier.
const SIG_BY_CREATURE = Object.fromEntries(CREATURES.map((c) => [c.id, c.signature]).filter(([, s]) => s));

// ─── Signature Modifier UI (vC-K) ─────────────────────────────────────────────

function ModSelectModal({ unit, onEquipSigMod, onClose }) {
  const equipped = unit.sigModIds ?? [];
  const rank = unit.sigRank ?? 1;
  const slots = [0, 1];
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 200,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#0d0d18', borderTop: '1px solid #2a2a3a',
        borderRadius: '12px 12px 0 0', padding: '16px 16px 28px', maxHeight: '70vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: '#444', letterSpacing: 2 }}>SIGNATURE MODIFIERS — {unit.name}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}>✕</button>
        </div>
        <div style={{ fontSize: 9, color: '#333', marginBottom: 12, lineHeight: 1.5 }}>
          {equipped.length < 2 ? `${2 - equipped.length} slot${2 - equipped.length !== 1 ? 's' : ''} open` : 'Both slots filled — tap a mod to remove it.'}
          {' '}Signature rank {rank} — effect values below reflect this rank.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SIG_MODS.map((mod) => {
            const on = equipped.includes(mod.id);
            const slotsFull = equipped.length >= 2 && !on;
            return (
              <button
                key={mod.id}
                onClick={() => { if (!slotsFull) { onEquipSigMod(unit.instanceId, mod.id); onClose(); } }}
                disabled={slotsFull}
                style={{
                  textAlign: 'left', cursor: slotsFull ? 'default' : 'pointer',
                  background: on ? mod.color + '18' : '#0d0d18',
                  border: `1px solid ${on ? mod.color + '55' : slotsFull ? '#1a1a2a' : '#2a2a3a'}`,
                  borderLeft: `3px solid ${on ? mod.color : slotsFull ? '#1a1a2a' : '#2a2a3a'}`,
                  borderRadius: 7, padding: '10px 13px', display: 'flex', flexDirection: 'column', gap: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 13, color: on ? mod.color : slotsFull ? '#333' : '#888' }}>{mod.glyph}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: on ? mod.color : slotsFull ? '#333' : '#ccc', letterSpacing: 0.5 }}>{mod.name}</span>
                  {on && <span style={{ fontSize: 7, color: mod.color, border: `1px solid ${mod.color}40`, borderRadius: 2, padding: '1px 5px', letterSpacing: 1 }}>EQUIPPED</span>}
                </div>
                <div style={{ fontSize: 9, color: on ? '#aaa' : slotsFull ? '#2a2a3a' : '#666', lineHeight: 1.5 }}>{sigModRankedText(mod.id, rank)}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Recruit roster (vC-N) ────────────────────────────────────────────────────
// Locked "rare finds" — discovered by winning matched contracts, then recruited
// for Shards. Undiscovered species show as a sealed ??? card with a hint.
function RecruitModal({ discoveredSpecies, ownedIds, shards, onRecruit, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 200,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#0d0d18', borderTop: '1px solid #2a2a3a',
        borderRadius: '12px 12px 0 0', padding: '16px 16px 28px', maxHeight: '74vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: '#444', letterSpacing: 2 }}>RECRUIT — RARE FINDS</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}>✕</button>
        </div>
        <div style={{ fontSize: 9, color: '#333', marginBottom: 12, lineHeight: 1.5 }}>
          Discover these by winning matched contracts, then recruit them with Shards. You have <span style={{ color: '#5abf8a' }}>◈ {shards}</span>.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {RECRUITABLE_IDS.map((id) => {
            const cr = CREATURE_BY_ID[id];
            const spec = RECRUITABLE[id];
            const discovered = discoveredSpecies.includes(id);
            const owned = ownedIds.has(id);
            const arch = ARCHETYPES[cr.archetype];
            const canAfford = shards >= spec.cost;
            if (!discovered) {
              return (
                <div key={id} style={{
                  background: '#0b0b12', border: '1px dashed #1e1e2a', borderRadius: 7,
                  padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#333', letterSpacing: 1 }}>???</span>
                    <span style={{ fontSize: 7, color: '#6a5a2a', letterSpacing: 1, border: '1px solid #6a5a2a55', borderRadius: 2, padding: '1px 5px' }}>LOCKED</span>
                  </div>
                  <div style={{ fontSize: 9, color: '#444', lineHeight: 1.5 }}>{spec.hint}</div>
                </div>
              );
            }
            return (
              <div key={id} style={{
                background: arch.color + '12', border: `1px solid ${arch.color}44`,
                borderLeft: `3px solid ${arch.color}`, borderRadius: 7,
                padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: arch.color, letterSpacing: 0.5 }}>{cr.name}</span>
                    <span style={{ fontSize: 9, color: '#777' }}>{cr.archetype}</span>
                    {owned && <span style={{ fontSize: 7, color: '#5abf8a', letterSpacing: 1, border: '1px solid #3a9a6a55', borderRadius: 2, padding: '1px 5px' }}>IN STABLE</span>}
                  </div>
                  {cr.signature && <div style={{ fontSize: 9, color: '#888', lineHeight: 1.5, marginTop: 3 }}>{cr.signature.name} — {cr.signature.text}</div>}
                </div>
                <button
                  onClick={() => canAfford && onRecruit(id)}
                  disabled={!canAfford}
                  title={canAfford ? `Recruit ${cr.name} for ${spec.cost} shards` : `Need ${spec.cost} ◈ shards`}
                  style={{
                    flexShrink: 0, fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
                    color: canAfford ? '#0d0d18' : '#3a3a4a',
                    background: canAfford ? '#5abf8a' : '#0d0d14',
                    border: `1px solid ${canAfford ? '#5abf8a' : '#1e1e2a'}`,
                    borderRadius: 6, padding: '8px 12px', cursor: canAfford ? 'pointer' : 'default',
                  }}
                >
                  RECRUIT · {spec.cost} ◈
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ModSlotsRow({ unit, onOpenModSelectModal }) {
  const equipped = unit.sigModIds ?? [];
  return (
    <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 7, color: '#2a2a3a', letterSpacing: 1.5, flexShrink: 0 }}>MOD</span>
      {[0, 1].map((slot) => {
        const modId = equipped[slot];
        const mod = modId ? SIG_MODS_BY_ID[modId] : null;
        return (
          <button
            key={slot}
            onClick={() => onOpenModSelectModal(unit)}
            title={mod ? `${mod.name}: ${sigModRankedText(mod.id, unit.sigRank ?? 1)}` : 'Empty slot — tap to equip modifier'}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: mod ? mod.color + '18' : '#0d0d14',
              border: `1px solid ${mod ? mod.color + '44' : '#1e1e2a'}`,
              borderRadius: 5, padding: '3px 7px', cursor: 'pointer',
              minWidth: 60,
            }}
          >
            {mod ? (
              <>
                <span style={{ fontSize: 9, color: mod.color }}>{mod.glyph}</span>
                <span style={{ fontSize: 8, color: mod.color, fontWeight: 700, letterSpacing: 0.5 }}>{mod.name}</span>
              </>
            ) : (
              <span style={{ fontSize: 8, color: '#2a2a3a', letterSpacing: 1 }}>+ SLOT {slot + 1}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SignatureRow({ unit, onRankUp, shards = 0 }) {
  const sig = unit.signature ?? SIG_BY_CREATURE[unit.id];
  if (!sig) return null;
  const isActive = sig.kind === 'active';
  const rank = unit.sigRank ?? 1;
  const cost = sigRankUpCost(rank);
  const maxed = cost == null;
  const canAfford = !maxed && shards >= cost;
  return (
    <div style={{
      padding: '6px 8px', borderRadius: 5, marginTop: 4,
      background: sig.live ? '#0c1116' : '#0d0d12',
      border: `1px solid ${sig.live ? (isActive ? '#9b6bd640' : '#2a5a8a40') : '#1a1a26'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <span style={{ fontSize: 7, color: '#2a2a3a', letterSpacing: 1.5 }}>SIGNATURE</span>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.5, color: sig.live ? (isActive ? '#cba6e6' : '#7fb0e0') : '#555' }}>
          {sig.name}
        </span>
        {isActive && <span style={{ fontSize: 6, color: '#9b6bd6', letterSpacing: 1, border: '1px solid #9b6bd640', borderRadius: 2, padding: '0 3px' }}>ACTIVE</span>}
        {!sig.live && <span style={{ fontSize: 6, color: '#6a5a2a', letterSpacing: 1, border: '1px solid #6a5a2a55', borderRadius: 2, padding: '0 3px' }}>SOON</span>}
      </div>
      <div style={{ fontSize: 8.5, color: sig.live ? '#8a99a8' : '#444', lineHeight: 1.5 }}>{sig.text}</div>
      {/* vC-M: signature rank — pips + shard-cost rank-up. Amplifies slotted mods. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <span style={{ fontSize: 7, color: '#2a2a3a', letterSpacing: 1.5 }}>RANK</span>
        <div style={{ display: 'flex', gap: 2 }}>
          {Array.from({ length: SIG_RANK_MAX }, (_, i) => (
            <span key={i} style={{
              width: 7, height: 7, borderRadius: 2,
              background: i < rank ? '#cba6e6' : 'transparent',
              border: `1px solid ${i < rank ? '#cba6e6' : '#2a2a3a'}`,
            }} />
          ))}
        </div>
        <span style={{ flex: 1 }} />
        {onRankUp && (maxed ? (
          <span style={{ fontSize: 7, color: '#6a5a2a', letterSpacing: 1, border: '1px solid #6a5a2a55', borderRadius: 3, padding: '2px 6px' }}>MAX</span>
        ) : (
          <button
            onClick={() => canAfford && onRankUp(unit.instanceId)}
            disabled={!canAfford}
            title={canAfford ? `Rank up to ${rank + 1} — strengthens slotted modifiers` : `Need ${cost} ◈ shards to rank up`}
            style={{
              fontSize: 8, fontWeight: 700, letterSpacing: 0.5,
              color: canAfford ? '#cba6e6' : '#3a3a4a',
              background: canAfford ? '#9b6bd618' : '#0d0d14',
              border: `1px solid ${canAfford ? '#9b6bd655' : '#1e1e2a'}`,
              borderRadius: 4, padding: '2px 8px', cursor: canAfford ? 'pointer' : 'default',
            }}
          >
            RANK UP · {cost} ◈
          </button>
        ))}
      </div>
    </div>
  );
}

function XpBar({ xp }) {
  const prog = xpProgress(xp);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#444', marginBottom: 2 }}>
        <span>Lv.{prog.level}</span>
        {prog.needed
          ? <span>{prog.current}/{prog.needed}</span>
          : <span style={{ color: '#7ed321' }}>MAX</span>
        }
      </div>
      <div style={{ height: 3, background: '#1a1a2a', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${prog.pct}%`,
          background: prog.needed ? '#5a5aff' : '#7ed321',
          borderRadius: 2,
        }} />
      </div>
    </div>
  );
}

function GearSelectModal({ unit, onEquipGear, onClose }) {
  const arch = ARCHETYPES[unit.archetype];
  const allGear = Object.values(GEAR);
  const archGear = allGear.filter((g) => g.archetype === unit.archetype);
  const otherGear = allGear.filter((g) => g.archetype !== unit.archetype && g.archetype !== null);
  const anyArchGear = allGear.filter((g) => g.archetype === null);

  function renderGear(gear, dim) {
    const equipped = unit.gearId === gear.id;
    return (
      <div
        key={gear.id}
        onClick={() => { onEquipGear(unit.instanceId, equipped ? null : gear.id); onClose(); }}
        style={{
          background: equipped ? gear.color + '18' : '#0d0d18',
          border: `1px solid ${equipped ? gear.color + '55' : '#2a2a3a'}`,
          borderRadius: 7,
          padding: '10px 12px',
          cursor: 'pointer',
          marginBottom: 6,
          opacity: dim ? 0.45 : 1,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 12, color: gear.color, letterSpacing: 0.5 }}>{gear.name}</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {equipped && <span style={{ fontSize: 8, color: gear.color, letterSpacing: 1 }}>EQUIPPED</span>}
            <span style={{
              fontSize: 8, color: gear.color, background: gear.color + '18',
              border: `1px solid ${gear.color}35`, borderRadius: 3, padding: '1px 5px', letterSpacing: 1,
            }}>{gear.callout}</span>
          </div>
        </div>
        <div style={{ fontSize: 10, color: dim ? '#555' : '#888', lineHeight: 1.4 }}>{gear.description}</div>
      </div>
    );
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#0a0a14', border: '1px solid #2a2a3a', borderRadius: 10, padding: 16, maxWidth: 340, width: '100%', maxHeight: '80vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: '#444', letterSpacing: 2 }}>EQUIP GEAR</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#eee', marginTop: 2 }}>{unit.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#444', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }}>×</button>
        </div>

        {archGear.length > 0 && (
          <>
            <div style={{ fontSize: 9, color: arch.color + 'aa', letterSpacing: 1.5, marginBottom: 8 }}>
              {unit.archetype.toUpperCase()} GEAR
            </div>
            {archGear.map((g) => renderGear(g, false))}
          </>
        )}

        {anyArchGear.length > 0 && (
          <>
            <div style={{ fontSize: 9, color: '#666', letterSpacing: 1.5, margin: '10px 0 8px' }}>ANY ARCHETYPE</div>
            {anyArchGear.map((g) => renderGear(g, false))}
          </>
        )}

        {otherGear.length > 0 && (
          <>
            <div style={{ fontSize: 9, color: '#2a2a3a', letterSpacing: 1.5, margin: '10px 0 8px' }}>OTHER ARCHETYPES</div>
            {otherGear.map((g) => renderGear(g, true))}
          </>
        )}

        {unit.gearId && (
          <button
            onClick={() => { onEquipGear(unit.instanceId, null); onClose(); }}
            style={{
              width: '100%', marginTop: 6, padding: '8px',
              background: 'none', border: '1px solid #2a2a3a', borderRadius: 6,
              color: '#444', fontSize: 11, cursor: 'pointer', letterSpacing: 1,
            }}
          >
            Remove Gear
          </button>
        )}
      </div>
    </div>
  );
}

function ModuleSelectModal({ unit, onEquipModule, onClose }) {
  const modules = Object.values(MODULES).filter((m) => !m.hidden);
  const equippedIds = unit.moduleIds || [];
  const atCap = equippedIds.length >= 3;

  function renderModule(mod, i) {
    const equipped = equippedIds.includes(mod.id);
    const locked = atCap && !equipped;
    return (
      <div
        key={mod.id}
        onClick={() => { if (!locked) onEquipModule(unit.instanceId, mod.id); }}
        style={{
          background: equipped ? mod.color + '18' : '#0d0d18',
          border: `1px solid ${equipped ? mod.color + '55' : '#2a2a3a'}`,
          borderRadius: 7,
          padding: '10px 12px',
          cursor: locked ? 'default' : 'pointer',
          marginBottom: 6,
          opacity: locked ? 0.4 : 1,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 12, color: mod.color, letterSpacing: 0.5 }}>{mod.name}</span>
          {equipped && <span style={{ fontSize: 8, color: mod.color, letterSpacing: 1 }}>EQUIPPED</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 8, color: mod.color, background: mod.color + '18', border: `1px solid ${mod.color}35`, borderRadius: 3, padding: '1px 5px', letterSpacing: 1, flexShrink: 0 }}>
            {mod.category}
          </span>
          <div style={{ fontSize: 9, color: '#666' }}>{mod.description}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#0a0a14', border: '1px solid #2a2a3a', borderRadius: 10, padding: 16, maxWidth: 340, width: '100%', maxHeight: '80vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: '#444', letterSpacing: 2 }}>EQUIP MODULES — {equippedIds.length}/3</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#eee', marginTop: 2 }}>{unit.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#444', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }}>×</button>
        </div>

        {modules.map((mod, i) => renderModule(mod, i))}

        {equippedIds.length > 0 && (
          <button
            onClick={onClose}
            style={{
              width: '100%', marginTop: 6, padding: '8px',
              background: 'none', border: '1px solid #2a2a3a', borderRadius: 6,
              color: '#888', fontSize: 11, cursor: 'pointer', letterSpacing: 1,
            }}
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}

function UnitCard({ unit, inSquad, squadFull, onToggleSquad, onFeed, canFeed, justFed, onOpenGearModal, onOpenModuleModal, onOpenModSelectModal, onRankUp, shards }) {
  const arch = ARCHETYPES[unit.archetype];
  const aura = getAuraStyle(unit.feedHistory);
  const canAdd = !inSquad && !squadFull;
  const [bouncing, setBouncing] = useState(false);

  useEffect(() => {
    if (justFed) {
      setBouncing(true);
      const timer = setTimeout(() => setBouncing(false), 400);
      return () => clearTimeout(timer);
    }
  }, [justFed]);

  return (
    <div style={{
      background: '#0d0d18',
      border: `1px solid ${inSquad ? arch.color + '55' : '#1e1e2e'}`,
      borderRadius: 8,
      padding: '10px 10px 8px',
      display: 'flex',
      flexDirection: 'column',
      gap: 7,
      position: 'relative',
      ...aura,
      animation: bouncing ? 'card-bounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55), level-flash 0.5s ease-out' : 'none',
    }}>
      {inSquad && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          width: 8, height: 8, borderRadius: '50%',
          background: arch.color,
        }} />
      )}

      {/* Creature sprite */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
        <AnimationPlayer creature={unit} size="small" scale={1.2} animate="idle" />
      </div>

      <div>
        <div style={{
          fontSize: 12, fontWeight: 900, color: unit.survivalCount >= 5 ? '#d4af37' : '#eee',
          letterSpacing: 0.5,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textShadow: unit.survivalCount >= 10 ? '0 0 8px rgba(212,175,55,0.4)' : 'none',
        }}>
          {unit.name}
          {unit.survivalCount >= 10 && ' ⚔'}
          {unit.survivalCount >= 5 && unit.survivalCount < 10 && ' •'}
        </div>
        <div style={{ fontSize: 9, color: arch.color, letterSpacing: 1, marginTop: 1 }}>
          {ARCHETYPE_ABBR[unit.archetype]}
          {unit.feedHistory.length > 0 && (
            <span style={{ color: '#555', marginLeft: 5 }}>
              ·{unit.feedHistory.length} fed
            </span>
          )}
          {unit.survivalCount > 0 && (
            <span style={{ color: '#d4af37', marginLeft: 5 }}>
              ·{unit.survivalCount} survived
            </span>
          )}
        </div>
        {unit.foundAt && (
          <div style={{ fontSize: 8, color: '#3a6a4a', letterSpacing: 0.5, marginTop: 1 }}>
            ∘ {unit.foundAt}
          </div>
        )}
        {unit.battleCount > 0 && (
          <div style={{ fontSize: 8, color: '#888', marginTop: 2, lineHeight: 1.2 }}>
            <div>{unit.winCount}-{unit.battleCount - unit.winCount} record · {unit.survivalStreak} streak</div>
            {unit.enemyMemory && unit.enemyMemory.length > 0 && (
              <div style={{ color: '#666', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                vs {unit.enemyMemory.slice(0, 2).join(', ')}{unit.enemyMemory.length > 2 ? '...' : ''}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid #111', paddingTop: '4px' }}>
        <div
          onClick={() => onOpenGearModal(unit)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 0',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 7, color: '#2a2a3a', letterSpacing: 1.5 }}>GEAR</span>
          {unit.gearId ? (
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: GEAR[unit.gearId]?.color || '#888' }}>
              {GEAR[unit.gearId]?.name || unit.gearId}
            </span>
          ) : (
            <span style={{ fontSize: 9, color: '#222' }}>tap to equip</span>
          )}
        </div>

        <div
          onClick={() => onOpenModuleModal(unit)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 0',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 7, color: '#2a2a3a', letterSpacing: 1.5 }}>MODULES</span>
          {unit.moduleIds?.length > 0 ? (
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: '#888' }}>
              {unit.moduleIds.map(id => MODULES[id]?.name || id).join(', ')}
            </span>
          ) : (
            <span style={{ fontSize: 9, color: '#222' }}>tap to equip</span>
          )}
        </div>
      </div>

      <SignatureRow unit={unit} onRankUp={onRankUp} shards={shards} />
      {onOpenModSelectModal && <ModSlotsRow unit={unit} onOpenModSelectModal={onOpenModSelectModal} />}

      <XpBar xp={unit.xp} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        <button
          onClick={() => onToggleSquad(unit.instanceId)}
          disabled={!inSquad && squadFull}
          style={{
            padding: '6px 4px',
            background: inSquad ? '#1a1a2a' : canAdd ? arch.color + '22' : '#0d0d18',
            border: `1px solid ${inSquad ? '#3a3a5a' : canAdd ? arch.color + '55' : '#1e1e2e'}`,
            borderRadius: 5,
            color: inSquad ? '#888' : canAdd ? arch.color : '#333',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 0.5,
            cursor: inSquad || canAdd ? 'pointer' : 'default',
          }}
        >
          {inSquad ? 'Remove' : squadFull ? 'Full' : 'Squad →'}
        </button>
        <button
          onClick={() => canFeed && onFeed(unit)}
          disabled={!canFeed}
          style={{
            padding: '6px 4px',
            background: canFeed ? '#1a2a1a' : '#0d0d18',
            border: `1px solid ${canFeed ? '#2a4a2a' : '#1e1e2e'}`,
            borderRadius: 5,
            color: canFeed ? '#7ed321' : '#333',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 0.5,
            cursor: canFeed ? 'pointer' : 'default',
          }}
        >
          Level up
        </button>
      </div>
    </div>
  );
}

function hasSameSpeciesToFeed(unit, collection, squadIds) {
  // A unit can level up if at least one OTHER unit of the same creature id exists in reserve
  return collection.some(
    (u) => u.id === unit.id && u.instanceId !== unit.instanceId && !squadIds.includes(u.instanceId)
  );
}

export default function CollectionScreen({ collection, squadIds, currencies = {}, onToggleSquad, onFeed, onEncounters, onWalk, onDungeon, onContracts, onPvp, justFedInstanceId, onEquipGear, onEquipModule, onEquipSigMod, onRankUp, discoveredSpecies = [], onRecruit }) {
  const [gearModalUnit, setGearModalUnit] = useState(null);
  const [moduleModalUnit, setModuleModalUnit] = useState(null);
  const [modSelectUnit, setModSelectUnit] = useState(null);
  const [recruitOpen, setRecruitOpen] = useState(false);
  const activeSquad = collection.filter((u) => squadIds.includes(u.instanceId));
  const reserve = collection.filter((u) => !squadIds.includes(u.instanceId));
  const squadFull = squadIds.length >= MAX_SQUAD;
  const reserveFull = reserve.length >= 24;
  const credits = currencies.credits ?? 0;
  const shards  = currencies.shards  ?? 0;
  const marks   = currencies.marks   ?? 0;
  // vC-N recruit roster: surface a dot when something is discovered + affordable.
  const ownedIds = new Set(collection.map((u) => u.id));
  const canRecruitNow = onRecruit && RECRUITABLE_IDS.some((id) => discoveredSpecies.includes(id) && shards >= RECRUITABLE[id].cost);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stable header + currencies */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 10, color: '#444', letterSpacing: 2 }}>
            STABLE — {collection.length} agents · DISPATCH {squadIds.length}/{MAX_SQUAD}
          </div>
          {/* Currency strip */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span title="Credits" style={{ fontSize: 9, color: '#8888cc', letterSpacing: 0.5 }}>⦿ {credits}</span>
            <span title="Shards"  style={{ fontSize: 9, color: '#3a9a6a', letterSpacing: 0.5 }}>◈ {shards}</span>
            {marks > 0 && <span title="Marks" style={{ fontSize: 9, color: '#d0902a', letterSpacing: 0.5 }}>✦ {marks}</span>}
          </div>
        </div>
      </div>
      {/* Nav row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 10, color: '#252535', letterSpacing: 2 }}>
          {/* spacer */}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onWalk}
            style={{
              padding: '9px 14px',
              background: 'none',
              border: '1px solid #2a4a3a',
              borderRadius: 7,
              color: '#3a6a4a',
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 1.5,
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            Walk
          </button>
          <button
            onClick={onDungeon}
            style={{
              padding: '9px 14px',
              background: 'none',
              border: '1px solid #3a2a5a',
              borderRadius: 7,
              color: '#6a4a9a',
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 1.5,
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            Dungeon
          </button>
          {onContracts && (
            <button
              onClick={onContracts}
              style={{
                padding: '9px 14px',
                background: 'none',
                border: '1px solid #4a2a5a',
                borderRadius: 7,
                color: '#9b6bd6',
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 1.5,
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              Contracts
            </button>
          )}
          {onPvp && (
            <button
              onClick={onPvp}
              style={{
                padding: '9px 14px', background: 'none', border: '1px solid #5a2a4a',
                borderRadius: 7, color: '#e06ab0', fontSize: 11, fontWeight: 900,
                letterSpacing: 1.5, cursor: 'pointer', textTransform: 'uppercase',
              }}
            >
              Arena
            </button>
          )}
          {onRecruit && (
            <button
              onClick={() => setRecruitOpen(true)}
              style={{
                position: 'relative',
                padding: '9px 14px', background: 'none', border: '1px solid #2a4a3a',
                borderRadius: 7, color: '#3a9a6a', fontSize: 11, fontWeight: 900,
                letterSpacing: 1.5, cursor: 'pointer', textTransform: 'uppercase',
              }}
            >
              Recruit
              {canRecruitNow && <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: '#5abf8a' }} />}
            </button>
          )}
          <button
            onClick={onEncounters}
            disabled={squadIds.length === 0}
            style={{
              padding: '9px 14px',
              background: squadIds.length > 0 ? '#e86040' : '#111',
              border: 'none',
              borderRadius: 7,
              color: squadIds.length > 0 ? '#fff' : '#333',
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 1.5,
              cursor: squadIds.length > 0 ? 'pointer' : 'default',
              textTransform: 'uppercase',
            }}
          >
            Battle →
          </button>
        </div>
      </div>

      {/* Dispatch */}
      {activeSquad.length === 0 ? (
        <div style={{
          border: '1px dashed #1e1e2e', borderRadius: 8,
          padding: '20px', textAlign: 'center',
          fontSize: 11, color: '#333',
        }}>
          Select up to {MAX_SQUAD} agents from your stable to dispatch
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {activeSquad.map((u) => (
            <UnitCard
              key={u.instanceId}
              unit={u}
              inSquad={true}
              squadFull={squadFull}
              onToggleSquad={onToggleSquad}
              onFeed={onFeed}
              canFeed={hasSameSpeciesToFeed(u, collection, squadIds)}
              justFed={justFedInstanceId === u.instanceId}
              onOpenGearModal={(u) => setGearModalUnit(u)}
              onOpenModuleModal={(u) => setModuleModalUnit(u)}
              onOpenModSelectModal={onEquipSigMod ? (u) => setModSelectUnit(u) : null}
              onRankUp={onRankUp}
              shards={shards}
            />
          ))}
        </div>
      )}

      {/* Reserve */}
      <div>
        <div style={{ fontSize: 10, color: '#444', letterSpacing: 2, marginBottom: 10 }}>
          BENCH — {reserve.length} agents
          {reserveFull && <span style={{ color: '#d0021b', marginLeft: 8 }}>FULL</span>}
        </div>
        {reserve.length === 0 ? (
          <div style={{ fontSize: 11, color: '#333', textAlign: 'center', padding: '12px 0' }}>
            All agents dispatched
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {reserve.map((u) => (
              <UnitCard
                key={u.instanceId}
                unit={u}
                inSquad={false}
                squadFull={squadFull}
                onToggleSquad={onToggleSquad}
                onFeed={onFeed}
                canFeed={hasSameSpeciesToFeed(u, collection, squadIds)}
                justFed={justFedInstanceId === u.instanceId}
                onOpenGearModal={(u) => setGearModalUnit(u)}
                onOpenModuleModal={(u) => setModuleModalUnit(u)}
                onOpenModSelectModal={onEquipSigMod ? (u) => setModSelectUnit(u) : null}
              onRankUp={onRankUp}
              shards={shards}
              />
            ))}
          </div>
        )}
      </div>
      {recruitOpen && onRecruit && (
        <RecruitModal
          discoveredSpecies={discoveredSpecies}
          ownedIds={ownedIds}
          shards={shards}
          onRecruit={onRecruit}
          onClose={() => setRecruitOpen(false)}
        />
      )}
      {gearModalUnit && (
        <GearSelectModal
          unit={gearModalUnit}
          onEquipGear={onEquipGear}
          onClose={() => setGearModalUnit(null)}
        />
      )}
      {moduleModalUnit && onEquipModule && (
        <ModuleSelectModal
          unit={moduleModalUnit}
          onEquipModule={onEquipModule}
          onClose={() => setModuleModalUnit(null)}
        />
      )}
      {modSelectUnit && onEquipSigMod && (
        <ModSelectModal
          unit={modSelectUnit}
          onEquipSigMod={onEquipSigMod}
          onClose={() => setModSelectUnit(null)}
        />
      )}
    </div>
  );
}
