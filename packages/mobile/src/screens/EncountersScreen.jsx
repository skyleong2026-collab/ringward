import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useGameState } from '../hooks/useGameState';
import { ENCOUNTERS } from '@8gents/game-data';

export default function EncountersScreen() {
  const { encounterHistory, runEncounter, squadIds } = useGameState();

  const hasActiveSquad = squadIds.length > 0;

  const handleEncounterPress = (encounter) => {
    if (!hasActiveSquad) {
      alert('You need at least one creature in your squad to battle.');
      return;
    }
    runEncounter(encounter);
  };

  const getEncounterRecord = (encounterId) => {
    const history = encounterHistory?.[encounterId];
    if (!history) return { status: '○', wins: 0, losses: 0 };
    const wins = history.wins || 0;
    const losses = history.losses || 0;
    return {
      status: wins > 0 ? `✓ ${wins}W` : losses > 0 ? `✗ ${losses}L` : '○',
      wins,
      losses,
    };
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Encounters</Text>
        <Text style={styles.subtitle}>Challenge NPCs to earn XP</Text>
      </View>

      {!hasActiveSquad && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>⚠ Add creatures to your squad first</Text>
        </View>
      )}

      <FlatList
        scrollEnabled
        data={ENCOUNTERS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const record = getEncounterRecord(item.id);
          return (
            <TouchableOpacity
              style={[
                styles.encounterCard,
                !hasActiveSquad && styles.encounterCardDisabled,
              ]}
              onPress={() => handleEncounterPress(item)}
              disabled={!hasActiveSquad}
            >
              <View style={styles.cardContent}>
                <Text style={styles.npcName}>{item.name}</Text>
                <Text style={styles.npcLevel}>Lv. {item.level}</Text>
                {record.wins > 0 || record.losses > 0 ? (
                  <Text style={styles.recordText}>
                    {record.wins}-{record.losses} record
                  </Text>
                ) : null}
              </View>
              <Text
                style={[
                  styles.status,
                  record.wins > 0
                    ? styles.statusWin
                    : record.losses > 0
                    ? styles.statusLoss
                    : styles.statusNeutral,
                ]}
              >
                {record.status}
              </Text>
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
  warningBox: {
    marginHorizontal: 12,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2a1a1a',
    borderLeftWidth: 3,
    borderLeftColor: '#e86040',
    borderRadius: 6,
  },
  warningText: {
    fontSize: 12,
    color: '#e86040',
    fontWeight: '600',
  },
  encounterCard: {
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
  encounterCardDisabled: {
    opacity: 0.5,
  },
  cardContent: {
    flex: 1,
  },
  npcName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  npcLevel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  recordText: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 50,
    textAlign: 'right',
  },
  statusWin: {
    color: '#7ed321',
  },
  statusLoss: {
    color: '#e86040',
  },
  statusNeutral: {
    color: '#666',
  },
});
