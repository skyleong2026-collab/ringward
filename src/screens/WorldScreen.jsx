import { useState, useEffect, useRef } from 'react';
import { CREATURES, ARCHETYPES } from '../data/creatures.js';
import {
  getNearbySpawns, offsetPosition, formatDistance,
  ENCOUNTER_RADIUS, RARITIES,
} from '../engine/gps.js';

const STEP = 50; // meters per simulate step
const DEFAULT_LAT = 37.7749;
const DEFAULT_LNG = -122.4194;

const COMPASS = [
  { label: '↖', dN:  1, dE: -1 },
  { label: '↑', dN:  1, dE:  0 },
  { label: '↗', dN:  1, dE:  1 },
  { label: '←', dN:  0, dE: -1 },
  null,
  { label: '→', dN:  0, dE:  1 },
  { label: '↙', dN: -1, dE: -1 },
  { label: '↓', dN: -1, dE:  0 },
  { label: '↘', dN: -1, dE:  1 },
];

function SpawnRow({ spawn, onEngage }) {
  const color = ARCHETYPES[spawn.creature.archetype]?.color || '#888';
  const near = spawn.inRange;
  const rarity = RARITIES[spawn.rarity] || RARITIES.Common;
  const isElite = spawn.rarity === 'Elite';
  const isRare = spawn.rarity === 'Rare';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '10px 12px',
      background: near ? (isElite ? '#1a1200' : isRare ? '#0a0f1a' : '#0d1a0d') : '#0a0a14',
      border: `1px solid ${near ? rarity.color + '44' : isElite ? '#f5a62322' : isRare ? '#4a9eff18' : '#1a1a2a'}`,
      borderLeft: `3px solid ${near ? rarity.color : isElite ? '#f5a62366' : isRare ? '#4a9eff44' : color + '55'}`,
      borderRadius: 6,
      gap: 10,
      boxShadow: near && isElite ? '0 0 12px #f5a62318' : 'none',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: near ? '#eee' : (isElite ? '#a07020' : isRare ? '#3a6ea0' : '#888'), letterSpacing: 0.5 }}>
            {spawn.creature.name}
          </span>
          <span style={{
            fontSize: 8, color,
            background: color + '18', border: `1px solid ${color}35`,
            borderRadius: 3, padding: '1px 5px', letterSpacing: 1, flexShrink: 0,
          }}>
            {spawn.creature.archetype.toUpperCase()}
          </span>
          <span style={{
            fontSize: 8, color: rarity.color,
            background: rarity.color + '15', border: `1px solid ${rarity.color}30`,
            borderRadius: 3, padding: '1px 5px', letterSpacing: 1, flexShrink: 0,
          }}>
            {spawn.rarity.toUpperCase()}
          </span>
        </div>
        <div style={{ fontSize: 9, color: '#2a2a3a', letterSpacing: 0.5 }}>{spawn.zoneName}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: near ? rarity.engageColor : (isElite ? '#6a4a10' : isRare ? '#1a3a6a' : '#444'), letterSpacing: 0.5 }}>
          {formatDistance(spawn.distance)} {spawn.arrow}
        </div>
        {near && (
          <button
            onClick={() => onEngage(spawn)}
            style={{
              marginTop: 5,
              padding: '4px 10px',
              background: rarity.engageColor,
              border: 'none',
              borderRadius: 4,
              color: '#0a0a14',
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: 1,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ENGAGE
          </button>
        )}
      </div>
    </div>
  );
}

const SIM_KEY = '8gents_sim_pos';

function loadSimPos() {
  try { return JSON.parse(sessionStorage.getItem(SIM_KEY)); } catch { return null; }
}

function saveSimPos(pos) {
  try { sessionStorage.setItem(SIM_KEY, JSON.stringify({ lat: pos.lat, lng: pos.lng })); } catch {}
}

export default function WorldScreen({ onSelectSpawn, onBack }) {
  const savedSim = loadSimPos();
  const [gpsState, setGpsState] = useState(savedSim ? 'simulating' : 'acquiring');
  const [position, setPosition] = useState(savedSim ? { ...savedSim, accuracy: 0 } : null);
  const [spawns, setSpawns] = useState([]);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (gpsState === 'simulating') return; // don't start GPS if already simulating
    if (!navigator.geolocation) {
      setGpsState('error');
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
        setGpsState('active');
      },
      () => setGpsState('error'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  useEffect(() => {
    if (position) setSpawns(getNearbySpawns(position.lat, position.lng, CREATURES));
  }, [position]);

  function startSimulate() {
    const p = { lat: DEFAULT_LAT, lng: DEFAULT_LNG, accuracy: 0 };
    saveSimPos(p);
    setPosition(p);
    setGpsState('simulating');
  }

  function simMove(dN, dE) {
    setPosition((prev) => {
      if (!prev) return prev;
      const next = { ...offsetPosition(prev.lat, prev.lng, dN * STEP, dE * STEP), accuracy: 0 };
      saveSimPos(next);
      return next;
    });
  }

  const simBtnStyle = {
    width: 36, height: 36,
    background: '#0d0d18', border: '1px solid #2a2a3a', borderRadius: 5,
    color: '#f5a623', fontSize: 15, cursor: 'pointer',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#444', fontSize: 12, cursor: 'pointer', letterSpacing: 1, padding: 0, marginBottom: 12 }}
        >
          ← Roster
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#eee', letterSpacing: 1 }}>World</div>
            <div style={{ fontSize: 11, color: '#333', marginTop: 4, lineHeight: 1.6 }}>
              Walk near creatures to engage. They don't move.
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, paddingTop: 6,
            fontSize: 9, letterSpacing: 1,
            color: gpsState === 'active' ? '#7ed321' : gpsState === 'simulating' ? '#f5a623' : '#444',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block', flexShrink: 0 }} />
            {gpsState === 'acquiring' && 'ACQUIRING'}
            {gpsState === 'active' && `GPS ±${position?.accuracy}m`}
            {gpsState === 'error' && 'NO GPS'}
            {gpsState === 'simulating' && 'SIMULATING'}
          </div>
        </div>
      </div>

      {/* Acquiring */}
      {gpsState === 'acquiring' && (
        <div style={{ background: '#0a0a14', border: '1px solid #1a1a2a', borderRadius: 8, padding: '24px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#444', letterSpacing: 1 }}>Acquiring GPS signal...</div>
          <div style={{ fontSize: 9, color: '#222', marginTop: 6, lineHeight: 1.6 }}>Allow location access when prompted.</div>
          <button
            onClick={startSimulate}
            style={{ marginTop: 16, padding: '8px 16px', background: 'none', border: '1px solid #2a2a3a', borderRadius: 5, color: '#444', fontSize: 10, cursor: 'pointer', letterSpacing: 1, fontFamily: 'inherit' }}
          >
            Simulate instead
          </button>
        </div>
      )}

      {/* Error */}
      {gpsState === 'error' && (
        <div style={{ background: '#0d0d18', border: '1px solid #2a2a3a', borderRadius: 8, padding: '16px' }}>
          <div style={{ fontSize: 11, color: '#444', marginBottom: 12, lineHeight: 1.6 }}>
            Location unavailable. Use simulate mode to explore the spawn system.
          </div>
          <button
            onClick={startSimulate}
            style={{ padding: '10px 20px', background: '#f5a623', border: 'none', borderRadius: 6, color: '#0a0a14', fontSize: 11, fontWeight: 900, letterSpacing: 1, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            SIMULATE WALK
          </button>
        </div>
      )}

      {/* Simulate controls */}
      {gpsState === 'simulating' && (
        <div style={{ background: '#0d0d10', border: '1px solid #2a2a18', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 9, color: '#f5a623', letterSpacing: 2, marginBottom: 10 }}>{STEP}m PER STEP</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 36px)', gap: 5 }}>
            {COMPASS.map((dir, i) =>
              dir ? (
                <button key={i} onClick={() => simMove(dir.dN, dir.dE)} style={simBtnStyle}>
                  {dir.label}
                </button>
              ) : (
                <div key={i} style={{ width: 36, height: 36 }} />
              )
            )}
          </div>
        </div>
      )}

      {/* Spawn list */}
      {(gpsState === 'active' || gpsState === 'simulating') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 9, color: '#2a2a3a', letterSpacing: 2 }}>
            NEARBY — {ENCOUNTER_RADIUS}m TO ENGAGE
          </div>
          {spawns.length === 0 ? (
            <div style={{ fontSize: 11, color: '#222', padding: '16px', textAlign: 'center' }}>
              No spawns in range.
            </div>
          ) : (
            spawns.map((spawn) => (
              <SpawnRow key={spawn.cellKey} spawn={spawn} onEngage={onSelectSpawn} />
            ))
          )}
        </div>
      )}

    </div>
  );
}
