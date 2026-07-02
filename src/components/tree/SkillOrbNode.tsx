import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { PROGRESION_CONFIG, xpInCurrentLevel, XP_PER_SESSION } from '@/src/config/progressionConfig';
import { AppTheme, SkillNode } from '@/src/types';
import { getOrbBorderColor, getRuneIcon, ORB_SIZE } from '@/src/utils/treeLayout';

interface SkillOrbNodeProps {
  node: SkillNode;
  theme: AppTheme;
  onAddXp: (nodeId: number) => void;
}

const LABEL_WIDTH = 100;

export function SkillOrbNode({ node, theme, onAddXp }: SkillOrbNodeProps) {
  const borderColor = getOrbBorderColor(node, theme);
  const rune = getRuneIcon(node);
  const isGuide = node.layer === 'guide';
  const glow = isGuide ? theme.primary : borderColor;

  const handlePress = () => {
    if (isGuide && node.guideUrl) {
      Alert.alert(node.name, `Nv. ${node.level}`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cómo hacerlo',
          onPress: () => Linking.openURL(node.guideUrl!),
        },
        { text: `+${XP_PER_SESSION} XP`, onPress: () => onAddXp(node.id) },
      ]);
    } else {
      Alert.alert(node.name, `Nv. ${node.level} · ${xpInCurrentLevel(node.xp)}/${PROGRESION_CONFIG.xpPorNivel} XP`, [
        { text: 'Cerrar', style: 'cancel' },
        { text: `+${XP_PER_SESSION} XP`, onPress: () => onAddXp(node.id) },
      ]);
    }
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          left: node.posX + ORB_SIZE / 2 - LABEL_WIDTH / 2,
          top: node.posY,
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.orb,
          {
            backgroundColor: '#0a0e14',
            borderColor,
            shadowColor: glow,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
          isGuide && styles.orbGuide,
        ]}
      >
        <Text style={[styles.rune, { color: borderColor }]}>{rune}</Text>
        {node.level > 1 && (
          <View style={[styles.levelDot, { backgroundColor: borderColor }]}>
            <Text style={styles.levelText}>{node.level}</Text>
          </View>
        )}
      </Pressable>
      <Text style={[styles.label, { color: theme.text }]} numberOfLines={2}>
        {node.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    width: LABEL_WIDTH,
    alignItems: 'center',
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
    elevation: 6,
  },
  orbGuide: {
    borderWidth: 2.5,
    shadowRadius: 12,
  },
  rune: {
    fontSize: 18,
    fontWeight: '700',
  },
  levelDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  levelText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '800',
  },
  label: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
