// Phase J-5: GPS Tracking Hook
// Integrates GPS tracker with game state for creature spawning
import { useEffect, useState } from 'react';
import { gpsTracker, LocationData } from '../services/GPSTracker';
import { useGameState } from './useGameState';
import { getCellKey, getNearbySpawns, getDistance } from '@8gents/engine';
import { CREATURES } from '@8gents/game-data';

export interface GPSTrackingState {
  location: LocationData | null;
  isTracking: boolean;
  nearbyCreatures: any[];
  currentCellKey: string | null;
}

/**
 * Hook for GPS tracking integration with game state
 * Manages location updates, creature spawning, and encounter generation
 */
export function useGPSTracking() {
  const gameState = useGameState();
  const [gpsState, setGpsState] = useState<GPSTrackingState>({
    location: null,
    isTracking: false,
    nearbyCreatures: [],
    currentCellKey: null,
  });

  // Initialize GPS tracking on mount
  useEffect(() => {
    let unsubscribeLocation: (() => void) | null = null;
    let unsubscribeCellTransition: (() => void) | null = null;
    let unsubscribeEncounter: (() => void) | null = null;

    const initGPS = async () => {
      // Request location permission and start tracking
      const started = await gpsTracker.startTracking();

      if (started) {
        // Get initial location
        const location = await gpsTracker.getCurrentLocation();
        if (location) {
          setGpsState(prev => ({
            ...prev,
            location,
            isTracking: true,
            currentCellKey: getCellKey(location.latitude, location.longitude),
          }));
        }

        // Subscribe to location updates
        unsubscribeLocation = gpsTracker.onLocationChange((location) => {
          setGpsState(prev => {
            const cellKey = getCellKey(location.latitude, location.longitude);
            // Use all available creatures for wild spawns
            const creaturesList = Object.values(CREATURES);
            const nearby = getNearbySpawns(location.latitude, location.longitude, creaturesList);

            return {
              ...prev,
              location,
              currentCellKey: cellKey,
              nearbyCreatures: nearby,
            };
          });
        });

        // Subscribe to cell transitions (optional, for analytics)
        unsubscribeCellTransition = gpsTracker.onCellTransition((cellKey) => {
          console.log('Entered new cell:', cellKey);
        });

        // Subscribe to new encounters (creature spawn events)
        unsubscribeEncounter = gpsTracker.onEncounter((cellKey) => {
          console.log('New encounter in cell:', cellKey);
          // This will be handled by the notification and when user opens app
          // The game state will record this as a wild encounter
        });
      }
    };

    initGPS();

    // Cleanup
    return () => {
      if (unsubscribeLocation) unsubscribeLocation();
      if (unsubscribeCellTransition) unsubscribeCellTransition();
      if (unsubscribeEncounter) unsubscribeEncounter();
      gpsTracker.stopTracking();
    };
  }, []);

  /**
   * Manually refresh location (for testing or UI refresh)
   */
  const refreshLocation = async () => {
    const location = await gpsTracker.getCurrentLocation();
    if (location) {
      setGpsState(prev => ({
        ...prev,
        location,
        currentCellKey: getCellKey(location.latitude, location.longitude),
      }));
    }
  };

  /**
   * Format location for display
   */
  const formatLocation = (location: LocationData | null) => {
    if (!location) return 'No location';
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  };

  /**
   * Get distance to a creature spawn
   */
  const getDistanceToCreature = (lat: number, lng: number) => {
    if (!gpsState.location) return null;
    return getDistance(
      gpsState.location.latitude,
      gpsState.location.longitude,
      lat,
      lng
    );
  };

  return {
    location: gpsState.location,
    isTracking: gpsState.isTracking,
    nearbyCreatures: gpsState.nearbyCreatures,
    currentCellKey: gpsState.currentCellKey,
    refreshLocation,
    formatLocation,
    getDistanceToCreature,
  };
}
