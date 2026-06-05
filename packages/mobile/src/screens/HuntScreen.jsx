import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useGameState } from '../hooks/useGameState';
import { useGPSTracking } from '../hooks/useGPSTracking';
import { ARCHETYPES } from '@8gents/game-data';

export default function HuntScreen() {
  const {
    collection,
    squadIds,
    enterGpsSpawn,
  } = useGameState();

  const gps = useGPSTracking();
  const hasActiveSquad = squadIds.length > 0;

  const handleStartWildEncounter = (spawn) => {
    if (!hasActiveSquad) {
      Alert.alert('No Squad', 'You need at least one creature in your squad to hunt.');
      return;
    }

    // Use enterGpsSpawn to set up the wild hunt with proper zone data
    enterGpsSpawn(spawn, ARCHETYPES);
  };

  const creatureOwned = (creatureId) => {
    return collection.some((c) => c.id === creatureId);
  };

  return (
    <ScrollView style={styles.container} scrollEnabled>
      <View style={styles.header}>
        <Text style={styles.title}>Hunt</Text>
        <Text style={styles.subtitle}>Walk to discover creatures</Text>
      </View>

      <View style={styles.statusBox}>
        <View style={{ flex: 1 }}>
          <Text style={styles.statusLabel}>LOCATION</Text>
          {gps.location ? (
            <Text style={styles.statusValue}>
              {gps.location.latitude.toFixed(4)}°
            </Text>
          ) : (
            <Text style={[styles.statusValue, { color: '#888' }]}>
              {gps.isTracking ? 'Getting location...' : 'No GPS'}
            </Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.statusLabel}>SQUAD</Text>
          <Text style={styles.statusValue}>{squadIds.length}/8</Text>
        </View>
      </View>

      {!hasActiveSquad && (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>⚠ No Squad Active</Text>
          <Text style={styles.warningText}>
            Add creatures to your squad to hunt
          </Text>
        </View>
      )}

      <View style={styles.nearbySection}>
        <Text style={styles.sectionTitle}>NEARBY CREATURES</Text>
        <Text style={styles.sectionDesc}>Creatures detected in your area</Text>

        {!gps.isTracking ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#4a90e2" />
            <Text style={styles.loadingText}>Initializing GPS...</Text>
          </View>
        ) : gps.nearbyCreatures.length > 0 ? (
          gps.nearbyCreatures.map((spawn) => {
            const creature = spawn.creature;
            const owned = creatureOwned(creature.id);
            const distanceText = spawn.distance < 1000
              ? `${Math.round(spawn.distance)}m away`
              : `${(spawn.distance / 1000).toFixed(1)}km away`;
            const rarityColor =
              spawn.rarity === 'Elite' ? '#f5a623' :
              spawn.rarity === 'Rare' ? '#4a9eff' :
              '#7ed321';

            return (
              <TouchableOpacity
                key={`${spawn.cellKey}-${creature.id}`}
                style={[
                  styles.creatureCard,
                  !hasActiveSquad && styles.creatureCardDisabled,
                  owned && styles.creatureCardOwned,
                ]}
                onPress={() => handleStartWildEncounter(spawn)}
                disabled={!hasActiveSquad}
              >
                <View style={styles.creatureCardContent}>
                  <View style={styles.creatureCardHeader}>
                    <Text style={styles.creatureName}>{creature.name}</Text>
                    <Text style={[styles.rarityBadge, { color: rarityColor }]}>
                      {spawn.rarity}
                    </Text>
                  </View>
                  <Text style={styles.distanceText}>{distanceText}</Text>
                  {owned && (
                    <Text style={styles.ownedBadge}>✓ Owned</Text>
                  )}
                </View>
                <Text style={styles.encounterArrow}>▶</Text>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🔍</Text>
            <Text style={styles.emptyStateText}>No creatures nearby</Text>
            <Text style={styles.emptyStateHint}>GPS is scanning your area...</Text>
          </View>
        )}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>GPS Hunting Tips</Text>
        <Text style={styles.infoItem}>📍 Enable location services</Text>
        <Text style={styles.infoItem}>🚶 Walk around to find creatures</Text>
        <Text style={styles.infoItem}>⚡ Battle and catch new species</Text>
        <Text style={styles.infoItem}>🔄 Creatures respawn over time</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a14',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2a',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e86040',
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  statusBox: {
    marginHorizontal: 12,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1a1a2a',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusLabel: {
    fontSize: 9,
    color: '#666',
    letterSpacing: 1,
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  warningBox: {
    marginHorizontal: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#2a1a1a',
    borderLeftWidth: 3,
    borderLeftColor: '#e86040',
    borderRadius: 6,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e86040',
  },
  warningText: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 4,
  },
  nearbySection: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 10,
    color: '#666',
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 11,
    color: '#888',
    marginBottom: 8,
  },
  creatureCard: {
    backgroundColor: '#1a1a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#4a90e2',
  },
  creatureCardDisabled: {
    opacity: 0.4,
  },
  creatureCardOwned: {
    borderLeftColor: '#7ed321',
  },
  creatureCardContent: {
    flex: 1,
  },
  creatureCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creatureName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  rarityBadge: {
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  distanceText: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  ownedBadge: {
    fontSize: 10,
    color: '#7ed321',
    marginTop: 4,
    fontWeight: '600',
  },
  loadingState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#888',
    marginTop: 12,
  },
  encounterArrow: {
    fontSize: 16,
    color: '#4a90e2',
    fontWeight: '700',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  emptyStateHint: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  infoBox: {
    marginHorizontal: 12,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1a1a2a',
    borderLeftWidth: 3,
    borderLeftColor: '#4a90e2',
    borderRadius: 6,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4a90e2',
    marginBottom: 8,
  },
  infoItem: {
    fontSize: 11,
    color: '#888',
    marginBottom: 4,
  },
});
