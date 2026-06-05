import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useGameState } from '../hooks/useGameState';
import CreatureSprite from '../components/CreatureSprite';

export default function BattleScreen() {
  const { screen, currentEncounter, result } = useGameState();
  const [showLog, setShowLog] = useState(false);

  // Display placeholder if not in a battle
  if (!currentEncounter || screen === 'collection') {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>⚡</Text>
          <Text style={styles.placeholderTitle}>Battle Arena</Text>
          <Text style={styles.placeholderDesc}>
            Battles appear here during encounters
          </Text>
          <Text style={styles.placeholderHint}>Start a battle from Encounters or Hunt</Text>
        </View>
      </View>
    );
  }

  // Display placeholder while battle is loading or result is being processed
  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>⚡</Text>
        <Text style={styles.placeholderTitle}>Battle System</Text>
        <Text style={styles.placeholderDesc}>
          Battle system is being integrated
        </Text>
        <Text style={styles.placeholderHint}>Battles run in the background and update your squad</Text>
      </View>
    </View>
  );
        <View style={styles.creaturesRow}>
          {battleState.playerCreatures && battleState.playerCreatures.length > 0 ? (
            battleState.playerCreatures.map((creature, idx) => (
              <View key={`player-${idx}`} style={styles.creatureSlot}>
                <CreatureSprite
                  creatureId={creature.id}
                  size={60}
                  state={creature.hp <= 0 ? 'defeated' : 'idle'}
                  rarity={creature.rarity || 'Common'}
                />
                <Text style={styles.creatureHp}>{creature.hp || 0}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.arenaPlaceholder}>No player creatures</Text>
          )}
        </View>
      </View>

      <View style={styles.battleStats}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>TEAM</Text>
          <Text style={styles.statValue}>
            {battleState.playerCreatures?.length || 0}/6
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>OPPONENT</Text>
          <Text style={styles.statValue}>
            {battleState.enemyCreatures?.length || 0}/6
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>TURN</Text>
          <Text style={styles.statValue}>{battleState.turn || 0}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.logToggle}
        onPress={() => setShowLog(!showLog)}
      >
        <Text style={styles.logToggleText}>
          {showLog ? '▼ Hide Log' : '▲ Show Log'}
        </Text>
      </TouchableOpacity>

      {showLog && (
        <ScrollView style={styles.battleLog}>
          {(battleState.log || []).map((entry, idx) => (
            <Text key={idx} style={styles.logEntry}>{entry}</Text>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a14',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    marginBottom: 12,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  placeholderDesc: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },
  placeholderHint: {
    fontSize: 10,
    color: '#666',
  },
  battleHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2a',
  },
  battleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e86040',
  },
  battleControls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a2a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  controlButtonExit: {
    borderColor: '#e86040',
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  battleArena: {
    height: 180,
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#1a1a2a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a3a',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    flexDirection: 'column',
  },
  creaturesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  creatureSlot: {
    alignItems: 'center',
    gap: 4,
  },
  creatureHp: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7ed321',
  },
  arenaPlaceholder: {
    fontSize: 14,
    color: '#888',
  },
  battleStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1a1a2a',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  statLabel: {
    fontSize: 8,
    color: '#666',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  logToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logToggleText: {
    fontSize: 11,
    color: '#4a90e2',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  battleLog: {
    maxHeight: 150,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0d0d18',
  },
  logEntry: {
    fontSize: 10,
    color: '#888',
    marginBottom: 4,
    lineHeight: 14,
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 16,
  },
  resultVictory: {
    color: '#7ed321',
  },
  resultDefeat: {
    color: '#e86040',
  },
  resultXp: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  resultCaught: {
    fontSize: 14,
    color: '#4a90e2',
    marginBottom: 24,
  },
  resultButton: {
    backgroundColor: '#e86040',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  resultButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
