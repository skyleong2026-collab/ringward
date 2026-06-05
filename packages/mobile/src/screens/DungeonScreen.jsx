import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { useGameState } from '../hooks/useGameState';
import { DUNGEONS } from '@8gents/game-data';

export default function DungeonScreen() {
  const { dungeonRun, startDungeon, squadIds } = useGameState();

  const hasActiveSquad = squadIds.length > 0;

  const handleStartDungeon = (dungeon) => {
    if (!hasActiveSquad) {
      alert('You need at least one creature in your squad to enter a dungeon.');
      return;
    }
    startDungeon(dungeon);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dungeon</Text>
        <Text style={styles.subtitle}>Multi-floor challenges</Text>
      </View>

      {dungeonRun && (
        <View style={styles.activeRunBox}>
          <View style={styles.activeRunContent}>
            <Text style={styles.activeRunLabel}>ACTIVE RUN</Text>
            <Text style={styles.activeRunName}>{dungeonRun.dungeon.name}</Text>
            <Text style={styles.activeRunDepth}>Depth: {dungeonRun.nodeIndex}</Text>
          </View>
        </View>
      )}

      <FlatList
        scrollEnabled
        data={DUNGEONS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isActive = dungeonRun?.dungeon.id === item.id;
          return (
            <TouchableOpacity
              style={[
                styles.dungeonCard,
                isActive && styles.dungeonCardActive,
                !hasActiveSquad && styles.dungeonCardDisabled,
              ]}
              onPress={() => handleStartDungeon(item)}
              disabled={!hasActiveSquad}
            >
              <View style={styles.dungeonInfo}>
                <Text style={styles.dungeonName}>{item.name}</Text>
                <Text style={styles.dungeonNodes}>
                  {item.nodeCount} nodes
                </Text>
                {item.description && (
                  <Text style={styles.dungeonDesc}>{item.description}</Text>
                )}
              </View>
              {isActive && (
                <View style={styles.activeIndicator}>
                  <Text style={styles.activeIndicatorText}>▶</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
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
  activeRunBox: {
    marginHorizontal: 12,
    marginVertical: 12,
    backgroundColor: '#2a1a1a',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#e86040',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeRunContent: {
    flex: 1,
  },
  activeRunLabel: {
    fontSize: 9,
    color: '#e86040',
    letterSpacing: 1,
    fontWeight: '700',
  },
  activeRunName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  activeRunDepth: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
  continueButton: {
    backgroundColor: '#e86040',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  dungeonCard: {
    marginHorizontal: 12,
    marginVertical: 6,
    backgroundColor: '#1a1a2a',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#4a90e2',
  },
  dungeonCardActive: {
    borderLeftColor: '#e86040',
    backgroundColor: '#2a1a1a',
  },
  dungeonCardDisabled: {
    opacity: 0.5,
  },
  dungeonInfo: {
    flex: 1,
  },
  dungeonName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  dungeonNodes: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  dungeonDesc: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  activeIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e86040',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  activeIndicatorText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
});
