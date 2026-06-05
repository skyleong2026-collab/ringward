import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useGameState } from '../hooks/useGameState';
import { ARCHETYPES, CORES, MODULES } from '@8gents/game-data';
import { xpProgress } from '@8gents/engine';

const ARCHETYPE_ABBR = { Guardian: 'GRD', Echo: 'ECH', Swift: 'SWT', Spark: 'SPK' };
const { width } = Dimensions.get('window');

function XpBar({ xp }) {
  const prog = xpProgress(xp);
  return (
    <View>
      <View style={styles.xpHeader}>
        <Text style={styles.xpLevel}>Lv.{prog.level}</Text>
        <Text style={styles.xpText}>
          {prog.needed ? `${prog.current}/${prog.needed}` : 'MAX'}
        </Text>
      </View>
      <View style={styles.xpBarContainer}>
        <View
          style={[
            styles.xpBarFill,
            {
              width: `${prog.pct}%`,
              backgroundColor: prog.needed ? '#5a5aff' : '#7ed321',
            },
          ]}
        />
      </View>
    </View>
  );
}

function CreatureCard({ unit, inSquad, onPress, onEquipCore, onEquipModule, onToggleSquad, onFeed, canFeed, squadFull }) {
  const arch = ARCHETYPES[unit.archetype];

  return (
    <TouchableOpacity style={[styles.card, inSquad && { borderColor: arch.color + '55' }]}>
      {inSquad && <View style={[styles.squadIndicator, { backgroundColor: arch.color }]} />}

      <Text style={styles.creatureName}>{unit.name}</Text>

      <View style={styles.archRow}>
        <Text style={[styles.archText, { color: arch.color }]}>{ARCHETYPE_ABBR[unit.archetype]}</Text>
        {unit.feedHistory && unit.feedHistory.length > 0 && (
          <Text style={styles.fedText}>·{unit.feedHistory.length} fed</Text>
        )}
        {unit.survivalCount > 0 && (
          <Text style={styles.survivalText}>·{unit.survivalCount} survived</Text>
        )}
      </View>

      <XpBar xp={unit.xp} />

      <View style={styles.slotsContainer}>
        <TouchableOpacity
          style={styles.slotButton}
          onPress={() => onEquipCore(unit)}
        >
          <Text style={styles.slotLabel}>CORE</Text>
          {unit.coreId ? (
            <Text style={[styles.slotValue, { color: CORES[unit.coreId]?.color || '#888' }]}>
              {CORES[unit.coreId]?.name || '?'}
            </Text>
          ) : (
            <Text style={styles.slotEmpty}>—</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.slotButton}
          onPress={() => onEquipModule(unit)}
        >
          <Text style={styles.slotLabel}>MODULE</Text>
          {unit.moduleId ? (
            <Text style={[styles.slotValue, { color: MODULES[unit.moduleId]?.color || '#888' }]}>
              {MODULES[unit.moduleId]?.name || '?'}
            </Text>
          ) : (
            <Text style={styles.slotEmpty}>—</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            inSquad ? styles.actionButtonActive : squadFull ? styles.actionButtonDisabled : styles.actionButtonEnabled,
          ]}
          onPress={() => onToggleSquad(unit.instanceId)}
          disabled={!inSquad && squadFull}
        >
          <Text style={[styles.actionButtonText, inSquad && { color: '#888' }]}>
            {inSquad ? 'Remove' : squadFull ? 'Full' : 'Squad →'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            canFeed ? styles.actionButtonLevelUp : styles.actionButtonDisabled,
          ]}
          onPress={() => onFeed(unit)}
          disabled={!canFeed}
        >
          <Text style={[styles.actionButtonText, canFeed && { color: '#7ed321' }]}>
            Level up
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function CoreSelectModal({ unit, onClose, onSelect }) {
  if (!unit) return null;
  const arch = ARCHETYPES[unit.archetype];
  const allCores = Object.values(CORES);
  const archCores = allCores.filter((c) => c.archetype === unit.archetype);
  const otherCores = allCores.filter((c) => c.archetype !== unit.archetype);

  return (
    <Modal
      visible={!!unit}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay} onPress={onClose}>
        <ScrollView
          style={styles.modalContent}
          scrollEnabled
          nestedScrollEnabled
        >
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalLabel}>EQUIP CORE</Text>
              <Text style={styles.modalTitle}>{unit.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>×</Text>
            </TouchableOpacity>
          </View>

          {archCores.length > 0 && (
            <>
              <Text style={[styles.coreCategory, { color: arch.color + 'aa' }]}>
                {unit.archetype.toUpperCase()} CORES
              </Text>
              {archCores.map((core) => (
                <TouchableOpacity
                  key={core.id}
                  style={[
                    styles.coreOption,
                    unit.coreId === core.id && styles.coreOptionEquipped,
                  ]}
                  onPress={() => {
                    onSelect(unit.instanceId, unit.coreId === core.id ? null : core.id);
                    onClose();
                  }}
                >
                  <Text style={[styles.coreName, { color: core.color }]}>{core.name}</Text>
                  <Text style={styles.coreDesc}>{core.description}</Text>
                  {unit.coreId === core.id && (
                    <Text style={[styles.equippedBadge, { color: core.color }]}>EQUIPPED</Text>
                  )}
                </TouchableOpacity>
              ))}
            </>
          )}

          {otherCores.length > 0 && (
            <>
              <Text style={styles.coreCategory}>OTHER CORES</Text>
              {otherCores.map((core) => (
                <TouchableOpacity
                  key={core.id}
                  style={[styles.coreOption, styles.coreOptionOther]}
                  onPress={() => {
                    onSelect(unit.instanceId, core.id);
                    onClose();
                  }}
                >
                  <Text style={[styles.coreName, { color: core.color, opacity: 0.5 }]}>
                    {core.name}
                  </Text>
                  <Text style={[styles.coreDesc, { opacity: 0.5 }]}>{core.description}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {unit.coreId && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => {
                onSelect(unit.instanceId, null);
                onClose();
              }}
            >
              <Text style={styles.removeButtonText}>Remove Core</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function CollectionScreen() {
  const { collection, squadIds, toggleSquad, equipCore, equipModule, confirmFeed } = useGameState();
  const [coreModalUnit, setCoreModalUnit] = useState(null);
  const [moduleModalUnit, setModuleModalUnit] = useState(null);

  const activeSquad = collection.filter((u) => squadIds.includes(u.instanceId));
  const reserve = collection.filter((u) => !squadIds.includes(u.instanceId));
  const squadFull = squadIds.length >= 8;

  const hasSameSpeciesToFeed = (unit) => {
    return collection.some(
      (u) => u.id === unit.id && u.instanceId !== unit.instanceId && !squadIds.includes(u.instanceId)
    );
  };

  const renderSection = (title, data) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        scrollEnabled={false}
        data={data}
        keyExtractor={(item) => item.instanceId}
        renderItem={({ item }) => (
          <CreatureCard
            unit={item}
            inSquad={squadIds.includes(item.instanceId)}
            onEquipCore={() => setCoreModalUnit(item)}
            onEquipModule={() => setModuleModalUnit(item)}
            onToggleSquad={toggleSquad}
            onFeed={(unit) => {
              if (hasSameSpeciesToFeed(unit)) {
                confirmFeed(unit.instanceId, []);
              }
            }}
            canFeed={hasSameSpeciesToFeed(item)}
            squadFull={squadFull}
          />
        )}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Collection</Text>
        <Text style={styles.squadCount}>SQUAD — {squadIds.length}/8</Text>
      </View>

      <FlatList
        data={[{ type: 'squad' }, { type: 'reserve' }]}
        keyExtractor={(item) => item.type}
        renderItem={({ item }) =>
          item.type === 'squad'
            ? renderSection(`ACTIVE SQUAD (${activeSquad.length})`, activeSquad)
            : renderSection(`RESERVE (${reserve.length})`, reserve)
        }
      />

      <CoreSelectModal
        unit={coreModalUnit}
        onClose={() => setCoreModalUnit(null)}
        onSelect={equipCore}
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
  squadCount: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    letterSpacing: 1,
  },
  section: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 10,
    color: '#666',
    marginBottom: 8,
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#1a1a2a',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  squadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  creatureName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  archRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  archText: {
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  fedText: {
    fontSize: 9,
    color: '#555',
    marginLeft: 5,
  },
  survivalText: {
    fontSize: 9,
    color: '#d4af37',
    marginLeft: 5,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 3,
  },
  xpLevel: {
    fontSize: 10,
    color: '#666',
  },
  xpText: {
    fontSize: 10,
    color: '#666',
  },
  xpBarContainer: {
    height: 4,
    backgroundColor: '#0a0a14',
    borderRadius: 2,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  slotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#0a0a14',
  },
  slotButton: {
    flex: 1,
    backgroundColor: '#0d0d18',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    borderRadius: 6,
    padding: 6,
  },
  slotLabel: {
    fontSize: 7,
    color: '#2a2a3a',
    letterSpacing: 1,
    fontWeight: '600',
  },
  slotValue: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  slotEmpty: {
    fontSize: 9,
    color: '#555',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 5,
    alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: '#1a1a2a',
    borderWidth: 1,
    borderColor: '#3a3a5a',
  },
  actionButtonEnabled: {
    backgroundColor: '#e8604022',
    borderWidth: 1,
    borderColor: '#e8604055',
  },
  actionButtonLevelUp: {
    backgroundColor: '#1a2a1a',
    borderWidth: 1,
    borderColor: '#2a4a2a',
  },
  actionButtonDisabled: {
    backgroundColor: '#0d0d18',
    borderWidth: 1,
    borderColor: '#1e1e2e',
  },
  actionButtonText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: '#0a0a14',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    borderRadius: 10,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 10,
    color: '#444',
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#eee',
    marginTop: 4,
  },
  closeButton: {
    fontSize: 24,
    color: '#444',
    fontWeight: '300',
  },
  coreCategory: {
    fontSize: 9,
    color: '#2a2a3a',
    letterSpacing: 1.2,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 10,
  },
  coreOption: {
    backgroundColor: '#0d0d18',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
  },
  coreOptionEquipped: {
    borderColor: '#5a5aff55',
    backgroundColor: '#5a5aff18',
  },
  coreOptionOther: {
    opacity: 0.45,
  },
  coreName: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  coreDesc: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
    lineHeight: 14,
  },
  equippedBadge: {
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: '700',
    marginTop: 4,
  },
  removeButton: {
    marginTop: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2a2a3a',
    borderRadius: 6,
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 11,
    color: '#444',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
