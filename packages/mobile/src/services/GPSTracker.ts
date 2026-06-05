// Phase J-5: GPS Background Tracking
// Handles location updates and spawns creatures via cell-based system
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { getCellKey, getNearbySpawns, getDistance } from '@8gents/engine';

const LOCATION_TASK_NAME = 'background-location-task';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export interface GPSTrackerState {
  isTracking: boolean;
  currentLocation: LocationData | null;
  lastCellKey: string | null;
  lastEncounterTime: number | null;
}

class GPSTrackerService {
  private state: GPSTrackerState = {
    isTracking: false,
    currentLocation: null,
    lastCellKey: null,
    lastEncounterTime: null,
  };

  private locationCallbacks: Array<(location: LocationData) => void> = [];
  private cellTransitionCallbacks: Array<(cellKey: string) => void> = [];
  private encounterCallbacks: Array<(cellKey: string) => void> = [];

  /**
   * Request location permission and start foreground tracking
   */
  async startTracking(): Promise<boolean> {
    try {
      // Request foreground permission
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.warn('Foreground location permission denied');
        return false;
      }

      // Request background permission (iOS requires explicit permission)
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.warn('Background location permission denied (non-critical)');
        // Continue anyway - foreground tracking will still work
      }

      // Register background task if permissions granted
      if (backgroundStatus === 'granted') {
        await this.registerBackgroundTask();
      }

      // Start foreground location updates
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // Update every 10 seconds in foreground
        distanceInterval: 50, // Or when moved 50m
      });

      this.state.isTracking = true;
      console.log('GPS tracking started');
      return true;
    } catch (error) {
      console.error('Failed to start GPS tracking:', error);
      return false;
    }
  }

  /**
   * Stop foreground location tracking
   */
  async stopTracking(): Promise<void> {
    try {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      this.state.isTracking = false;
      console.log('GPS tracking stopped');
    } catch (error) {
      console.error('Failed to stop GPS tracking:', error);
    }
  }

  /**
   * Get current location (foreground)
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const data: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };

      this.state.currentLocation = data;
      this.checkForCellTransition(data);
      this.notifyLocationChange(data);

      return data;
    } catch (error) {
      console.error('Failed to get current location:', error);
      return null;
    }
  }

  /**
   * Register background location task
   */
  private async registerBackgroundTask(): Promise<void> {
    // Define the background task
    TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }: any) => {
      if (error) {
        console.error('Background location task error:', error);
        return;
      }

      if (data) {
        const { locations } = data;
        if (locations && locations.length > 0) {
          const lastLocation = locations[locations.length - 1];
          const locationData: LocationData = {
            latitude: lastLocation.latitude,
            longitude: lastLocation.longitude,
            accuracy: lastLocation.accuracy,
            timestamp: lastLocation.timestamp,
          };

          this.state.currentLocation = locationData;
          this.checkForCellTransition(locationData);
          this.notifyLocationChange(locationData);
        }
      }
    });

    // Check if task is already registered
    const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
    if (!isTaskDefined) {
      console.log('Background location task registered');
    }
  }

  /**
   * Check if user has moved to a new cell
   */
  private checkForCellTransition(location: LocationData): void {
    const newCellKey = getCellKey(location.latitude, location.longitude);

    if (newCellKey !== this.state.lastCellKey) {
      this.state.lastCellKey = newCellKey;
      this.notifyCellTransition(newCellKey);

      // Spawn a new encounter if enough time has passed (min 5 minutes between encounters)
      const now = Date.now();
      const lastEncounter = this.state.lastEncounterTime || 0;
      if (now - lastEncounter > 5 * 60 * 1000) {
        this.state.lastEncounterTime = now;
        this.notifyEncounter(newCellKey);
        this.sendNotification(newCellKey);
      }
    }
  }

  /**
   * Send local notification for new encounter
   */
  private async sendNotification(cellKey: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎭 Creature Spotted!',
          body: 'A creature appeared nearby. Open the app to engage!',
          data: { cellKey },
        },
        trigger: { seconds: 1 },
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Subscribe to location changes
   */
  onLocationChange(callback: (location: LocationData) => void): () => void {
    this.locationCallbacks.push(callback);
    return () => {
      this.locationCallbacks = this.locationCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to cell transitions
   */
  onCellTransition(callback: (cellKey: string) => void): () => void {
    this.cellTransitionCallbacks.push(callback);
    return () => {
      this.cellTransitionCallbacks = this.cellTransitionCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to new encounters
   */
  onEncounter(callback: (cellKey: string) => void): () => void {
    this.encounterCallbacks.push(callback);
    return () => {
      this.encounterCallbacks = this.encounterCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all location change listeners
   */
  private notifyLocationChange(location: LocationData): void {
    this.locationCallbacks.forEach(cb => cb(location));
  }

  /**
   * Notify all cell transition listeners
   */
  private notifyCellTransition(cellKey: string): void {
    this.cellTransitionCallbacks.forEach(cb => cb(cellKey));
  }

  /**
   * Notify all encounter listeners
   */
  private notifyEncounter(cellKey: string): void {
    this.encounterCallbacks.forEach(cb => cb(cellKey));
  }

  /**
   * Get current state
   */
  getState(): GPSTrackerState {
    return { ...this.state };
  }
}

// Export singleton instance
export const gpsTracker = new GPSTrackerService();
