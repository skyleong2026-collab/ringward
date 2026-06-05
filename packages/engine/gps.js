// Phase H — GPS utilities and spawn ecology
// Cell-based spawn system: each ~180m × 180m grid cell has a seeded, stable creature.
// Same place = same creature, every visit. Routes become intentional.

const CELL_SIZE = 0.0016; // ~177m per cell (latitude); ~135m at 40° latitude
export const ENCOUNTER_RADIUS = 100; // meters — engage threshold
export const SPAWN_RADIUS = 600;     // meters — visibility radius

// Rarity tiers — weighted distribution per cell, seeded independently from creature assignment
export const RARITIES = {
  Common: { color: '#3a3a5a', engageColor: '#7ed321' },
  Rare:   { color: '#4a9eff', engageColor: '#4a9eff' },
  Elite:  { color: '#f5a623', engageColor: '#f5a623' },
};

const RARITY_THRESHOLDS = [
  { tier: 'Common', max: 70 },
  { tier: 'Rare',   max: 92 },
  { tier: 'Elite',  max: 100 },
];

// ── Geometry ──────────────────────────────────────────────────────────────────

export function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const dφ = (lat2 - lat1) * Math.PI / 180;
  const dλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getBearing(lat1, lng1, lat2, lng2) {
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const dλ = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function bearingToArrow(bearing) {
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  return arrows[Math.round(bearing / 45) % 8];
}

export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// Move a position by meters north and east (approximate, fine for <1km)
export function offsetPosition(lat, lng, northMeters, eastMeters) {
  const dLat = northMeters / 111000;
  const dLng = eastMeters / (111000 * Math.cos(lat * Math.PI / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}

// ── Cell system ───────────────────────────────────────────────────────────────

function intHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

export function getCellKey(lat, lng) {
  const cLat = Math.round(lat / CELL_SIZE) * CELL_SIZE;
  const cLng = Math.round(lng / CELL_SIZE) * CELL_SIZE;
  return `${cLat.toFixed(4)},${cLng.toFixed(4)}`;
}

const ZONE_TERRAIN = ['Clearing', 'Underpass', 'Rail Cut', 'Canal Edge', 'Ridge', 'Block', 'Lot', 'Loop', 'Overpass', 'Yard', 'Track', 'Patch'];
const ZONE_DIRS = ['North', 'East', 'South', 'West', 'Northeast', 'Southeast', 'Southwest', 'Northwest'];

export function cellToSpawn(cellKey, creatures) {
  const h = intHash(cellKey);
  const creature = creatures[h % creatures.length];
  const zoneName = `${ZONE_DIRS[(h >> 4) % ZONE_DIRS.length]} ${ZONE_TERRAIN[(h >> 8) % ZONE_TERRAIN.length]}`;
  const rarityRoll = intHash(cellKey + ':r') % 100;
  const { tier: rarity } = RARITY_THRESHOLDS.find(r => rarityRoll < r.max);
  return { cellKey, creature, zoneName, rarity };
}

// Returns up to 8 nearby spawns sorted by distance, including user's current cell.
export function getNearbySpawns(userLat, userLng, creatures, radius = SPAWN_RADIUS) {
  const steps = Math.ceil(radius / (CELL_SIZE * 111000)) + 1;
  const results = [];
  const seen = new Set();

  for (let di = -steps; di <= steps; di++) {
    for (let dj = -steps; dj <= steps; dj++) {
      const cellLat = Math.round((userLat + di * CELL_SIZE) / CELL_SIZE) * CELL_SIZE;
      const cellLng = Math.round((userLng + dj * CELL_SIZE) / CELL_SIZE) * CELL_SIZE;
      const cellKey = `${cellLat.toFixed(4)},${cellLng.toFixed(4)}`;
      if (seen.has(cellKey)) continue;
      seen.add(cellKey);

      const dist = getDistance(userLat, userLng, cellLat, cellLng);
      if (dist > radius) continue;

      const spawn = cellToSpawn(cellKey, creatures);
      const bearing = dist < 5 ? 0 : getBearing(userLat, userLng, cellLat, cellLng);
      results.push({
        ...spawn,
        distance: dist,
        bearing,
        arrow: dist < 5 ? '·' : bearingToArrow(bearing),
        inRange: dist <= ENCOUNTER_RADIUS,
      });
    }
  }

  return results.sort((a, b) => a.distance - b.distance).slice(0, 8);
}
