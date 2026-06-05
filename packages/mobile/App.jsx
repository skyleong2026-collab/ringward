import React, { useEffect } from 'react';
import { View, Text, Modal } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';

import { useGameState } from './src/hooks/useGameState.js';
import CollectionScreen from './src/screens/CollectionScreen.jsx';
import HuntScreen from './src/screens/HuntScreen.jsx';
import EncountersScreen from './src/screens/EncountersScreen.jsx';
import DungeonScreen from './src/screens/DungeonScreen.jsx';
import BattleScreen from './src/screens/BattleScreen.jsx';

SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();

const VERSION = 'vJ-A';

export default function App() {
  const {
    collection, squadIds, _initializeState,
    screen, currentEncounter, result, currentZone, currentWildTarget,
    dungeonRun, catchResult, battleSeed
  } = useGameState();
  const [fontsLoaded, setFontsLoaded] = React.useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Set up notification handler
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });

        // Initialize game state from AsyncStorage
        await _initializeState();

        // Font loading disabled temporarily - fonts directory is empty
        // await Font.loadAsync({
        //   'Courier New': require('./assets/fonts/courier.ttf'),
        // });
      } catch (e) {
        console.warn(e);
      } finally {
        setFontsLoaded(true);
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, [_initializeState]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#0a0a14',
              borderTopColor: '#1a1a2a',
              borderTopWidth: 1,
            },
            tabBarActiveTintColor: '#e86040',
            tabBarInactiveTintColor: '#666',
            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: '600',
              marginBottom: 4,
            },
          }}
        >
          <Tab.Screen
            name="Collection"
            component={CollectionScreen}
            options={{
              tabBarLabel: 'Collection',
              tabBarIcon: ({ color }) => <TabIcon name="📦" color={color} />,
            }}
          />
          <Tab.Screen
            name="Hunt"
            component={HuntScreen}
            options={{
              tabBarLabel: 'Hunt',
              tabBarIcon: ({ color }) => <TabIcon name="🗺️" color={color} />,
            }}
          />
          <Tab.Screen
            name="Encounters"
            component={EncountersScreen}
            options={{
              tabBarLabel: 'Encounters',
              tabBarIcon: ({ color }) => <TabIcon name="⚔️" color={color} />,
            }}
          />
          <Tab.Screen
            name="Dungeon"
            component={DungeonScreen}
            options={{
              tabBarLabel: 'Dungeon',
              tabBarIcon: ({ color }) => <TabIcon name="🏰" color={color} />,
            }}
          />
          <Tab.Screen
            name="Battle"
            component={BattleScreen}
            options={{
              tabBarLabel: 'Battle',
              tabBarIcon: ({ color }) => <TabIcon name="⚡" color={color} />,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>

      {/* Modal overlays for conditional screens */}
      {screen === 'prebattle' && currentEncounter && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
        >
          <View style={{ flex: 1, backgroundColor: '#0a0a14', padding: 16, paddingTop: 40 }}>
            <Text style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>
              {currentEncounter.name} - Lv.{currentEncounter.level}
            </Text>
            <Text style={{ color: '#888', fontSize: 12 }}>Battle preview coming soon</Text>
          </View>
        </Modal>
      )}

      {screen === 'wildhunt' && currentZone && currentWildTarget && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
        >
          <View style={{ flex: 1, backgroundColor: '#0a0a14', padding: 16, paddingTop: 40 }}>
            <Text style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>
              {currentWildTarget.name}
            </Text>
            <Text style={{ color: '#888', fontSize: 12 }}>Caught in {currentZone.name}</Text>
          </View>
        </Modal>
      )}

      {screen === 'result' && result && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: result.winner === 'A' ? '#7ed321' : '#e86040', fontSize: 24, fontWeight: '700' }}>
              {result.winner === 'A' ? 'VICTORY' : 'DEFEAT'}
            </Text>
          </View>
        </Modal>
      )}

      <StatusBar barStyle="light-content" />
    </View>
  );
}

function TabIcon({ name, color }) {
  return <Text style={{ color, fontSize: 20 }}>{name}</Text>;
}
