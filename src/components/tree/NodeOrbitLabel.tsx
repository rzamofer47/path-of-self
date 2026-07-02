import { StyleSheet, Text, View } from 'react-native';

import { AppTheme, SkillNode, User } from '@/src/types';
import { LabelVisibility } from '@/src/utils/labelVisibility';
import { getNodeVisualIntensity } from '@/src/utils/nodeIntensity';
import { isNodeUnlocked, ORB_SIZE } from '@/src/utils/treeLayout';

import { MENU_CONTAINER_WIDTH } from './nodeLabelLayout';
import { ORB_VISUAL_SIZE } from './OrbVisual';

const ORB_OFFSET = (ORB_VISUAL_SIZE - ORB_SIZE) / 2;

interface NodeOrbitLabelProps {
  node: SkillNode;
  nodes: SkillNode[];
  theme: AppTheme;
  user: User | null;
  visibility: LabelVisibility;
  elevated: boolean;
}

/** Etiqueta flotante en capa superior — por encima de líneas de conexión. */
export function NodeOrbitLabel({
  node,
  nodes,
  theme,
  user,
  visibility,
  elevated,
}: NodeOrbitLabelProps) {
  const unlocked = isNodeUnlocked(node);
  const { palette } = getNodeVisualIntensity(node, nodes, user);
  const prominent = visibility.prominent || elevated;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          left: node.posX + ORB_SIZE / 2 - MENU_CONTAINER_WIDTH / 2,
          top: node.posY - ORB_OFFSET,
          zIndex: prominent ? 999 : 120,
        },
      ]}
    >
      <View style={[styles.labelWrap, prominent && styles.labelWrapSelected]} pointerEvents="none">
        <Text
          style={[
            prominent ? styles.labelSelected : styles.label,
            {
              color: prominent ? '#ffffff' : unlocked ? palette.glow : theme.textMuted,
              opacity: visibility.opacity,
            },
          ]}
          numberOfLines={2}
        >
          {node.name}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    width: MENU_CONTAINER_WIDTH,
    alignItems: 'center',
    overflow: 'visible',
    backgroundColor: 'transparent',
  },
  labelWrap: {
    marginTop: ORB_VISUAL_SIZE + 4,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  labelWrapSelected: {
    zIndex: 999,
    elevation: 999,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  labelSelected: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.35,
    textAlign: 'center',
    lineHeight: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.98)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
});
