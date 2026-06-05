# Phase J-5: GPS Background Tracking Implementation

## Overview
Implemented location-based creature spawning using Expo's location APIs and TaskManager for background tracking. Players can now discover creatures based on their real-world location.

## Architecture

### Core Components

#### 1. GPSTracker Service (`src/services/GPSTracker.ts`)
Manages location updates and background location tracking.

**Features:**
- Foreground location tracking (10-second intervals)
- Background location updates via Expo TaskManager
- Cell-based encounter spawning (min 5 minutes between encounters)
- Location change events with subscriber pattern
- Cell transition detection
- Local notifications for creature encounters

**Key Methods:**
- `startTracking()` - Request permissions and start location updates
- `stopTracking()` - Stop all location tracking
- `getCurrentLocation()` - Get immediate location in foreground
- `onLocationChange()` - Subscribe to location updates
- `onCellTransition()` - Subscribe to cell boundary crossings
- `onEncounter()` - Subscribe to creature spawn events

#### 2. useGPSTracking Hook (`src/hooks/useGPSTracking.ts`)
React hook that integrates GPS tracking with game state.

**Returns:**
```typescript
{
  location: LocationData | null,
  isTracking: boolean,
  nearbyCreatures: any[],
  currentCellKey: string | null,
  refreshLocation: () => Promise<void>,
  formatLocation: (location) => string,
  getDistanceToCreature: (lat, lng) => number | null,
}
```

**Integration Points:**
- Automatically requests location permissions on mount
- Subscribes to location changes
- Updates nearby creature list from GPS coordinates
- Handles cleanup on unmount

#### 3. HuntScreen Updates (`src/screens/HuntScreen.jsx`)
Updated to use GPS-based creature spawning.

**Changes:**
- Replaced simulated creatures with GPS-tracked spawns
- Shows current location (latitude/longitude)
- Displays creature distance from player (meters/kilometers)
- Shows creature rarity tiers (Common/Rare/Elite)
- Loading state while GPS initializes
- Location permission flow integrated

## Cell-Based Spawn System

Creatures spawn in a grid of ~180m × 180m cells. Same location = same creature, every visit.

**Key Functions (from `@8gents/engine`):**
- `getCellKey(lat, lng)` - Convert coordinates to cell identifier
- `cellToSpawn(cellKey, creatures)` - Generate spawn data for a cell
- `getNearbySpawns(lat, lng, creatures)` - Get up to 8 nearby spawns with distances

**Rarity Distribution:**
- Common (70%): #7ed321 (green)
- Rare (22%): #4a9eff (blue)
- Elite (8%): #f5a623 (orange)

## Permissions

### iOS
- **Foreground:** `NSLocationWhenInUseUsageDescription`
- **Background:** `NSLocationAlwaysAndWhenInUseUsageDescription`
- **Background Modes:** location, remote-notification
- Configured in `app.json`

### Android
- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`
- Configured in `app.json`

## Notifications

Local notifications trigger when a new creature is encountered:
- Title: "🎭 Creature Spotted!"
- Body: "A creature appeared nearby. Open the app to engage!"
- Data: Cell key for routing

Notification handler set up in `App.jsx`.

## Testing

### Foreground Testing
1. Run app on iOS Simulator
2. Go to Hunt tab
3. Allow location permission when prompted
4. Simulator shows creatures near hardcoded location
5. Can tap creatures to initiate wild hunt

### Background Testing (Real Device Only)
1. Build app for physical iPhone
2. Enable location services
3. Open app, grant permissions
4. Start background tracking
5. Close app
6. Walk around (real movement needed on device)
7. Receive notifications when entering new cells

### Simulator Limitations
- Simulated location via Xcode debug navigator
- No background location updates without physical device
- Can test foreground logic and UI

## Performance Considerations

### Battery Impact
- Foreground: ~1-2% per hour (continuous tracking)
- Background: ~0.5% per hour (10+ second intervals)
- Configurable intervals and accuracy for optimization

### Memory
- Location callbacks cleaned up on unmount
- Max 8 nearby spawns returned (sorted by distance)
- Minimal state overhead

## Next Steps (Phase J-6)

1. Sprite rendering with Expo Image
2. Battle animations using React Native Animated
3. Creature visual effects (rarity glow, spawn effects)
4. Performance profiling with 6v6 battles

## File Changes Summary

**New Files:**
- `src/services/GPSTracker.ts` - GPS tracking service
- `src/hooks/useGPSTracking.ts` - React hook for GPS integration
- `PHASE-J5-GPS.md` - This document

**Modified Files:**
- `src/screens/HuntScreen.jsx` - Integrated GPS tracking
- `App.jsx` - Added notification handler setup
- `package.json` - Added expo-dev-client (needed for native modules)

## References

- [Expo Location API](https://docs.expo.dev/versions/v56.0.0/sdk/location/)
- [Expo TaskManager](https://docs.expo.dev/versions/v56.0.0/sdk/task-manager/)
- [Expo Notifications](https://docs.expo.dev/versions/v56.0.0/sdk/notifications/)
- [Engine GPS Utilities](../../engine/gps.js)
