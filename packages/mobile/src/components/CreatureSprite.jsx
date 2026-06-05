// Phase J-6: Creature Sprite Component
// Renders animated creature sprites with Expo Image and React Native Animated
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

/**
 * Renders a creature sprite with optional animation
 * @param {string} creatureId - Creature identifier (maps to sprite asset)
 * @param {number} size - Size in pixels (default 120)
 * @param {string} state - Animation state: 'idle' | 'attack' | 'damaged' | 'defeated'
 * @param {string} rarity - Creature rarity for glow effect: 'Common' | 'Rare' | 'Elite'
 */
export default function CreatureSprite({ creatureId, size = 120, state = 'idle', rarity = 'Common' }) {
  const bobAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Map creature IDs to sprite paths
  const spriteMap = {
    'vault': require('../../assets/sprites/vault.png'),
    'bastion': require('../../assets/sprites/bastion.png'),
    'bulwark': require('../../assets/sprites/bulwark.png'),
    'conduit': require('../../assets/sprites/conduit.png'),
    'nexus': require('../../assets/sprites/nexus.png'),
    'link': require('../../assets/sprites/link.png'),
    'fang': require('../../assets/sprites/fang.png'),
    'striker': require('../../assets/sprites/striker.png'),
    'claw': require('../../assets/sprites/claw.png'),
    'spark': require('../../assets/sprites/spark.png'),
    'flicker': require('../../assets/sprites/flicker.png'),
    'cinder': require('../../assets/sprites/cinder.png'),
  };

  // Get rarity color for glow effect
  const rarityColors = {
    'Common': '#7ed321',
    'Rare': '#4a9eff',
    'Elite': '#f5a623',
  };

  const glowColor = rarityColors[rarity] || '#7ed321';

  // Animation orchestration
  useEffect(() => {
    if (state === 'idle') {
      // Gentle bobbing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(bobAnim, {
            toValue: -8,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(bobAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Subtle glow pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else if (state === 'attack') {
      // Attack punch: scale up then back
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (state === 'damaged') {
      // Damage flash: red tint + slight shake
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (state === 'defeated') {
      // Defeat animation: scale down + fade out
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.5,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }

    return () => {
      // Cancel animations on unmount
      bobAnim.resetAnimation?.();
      scaleAnim.resetAnimation?.();
      opacityAnim.resetAnimation?.();
      glowAnim.resetAnimation?.();
    };
  }, [state, bobAnim, scaleAnim, opacityAnim, glowAnim]);

  // Get sprite image
  const spriteSource = spriteMap[creatureId] || spriteMap['vault'];

  // Glow shadow opacity
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Glow effect background */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: size + 20,
            height: size + 20,
            backgroundColor: glowColor,
            opacity: glowOpacity,
          },
        ]}
      />

      {/* Sprite image with animations */}
      <Animated.View
        style={[
          styles.spriteContainer,
          {
            transform: [
              { translateY: bobAnim },
              { scale: scaleAnim },
            ],
            opacity: opacityAnim,
          },
        ]}
      >
        <Image
          source={spriteSource}
          style={{ width: size, height: size }}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    borderRadius: 100,
    opacity: 0.3,
  },
  spriteContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
