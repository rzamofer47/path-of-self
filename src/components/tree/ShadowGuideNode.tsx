import { useCallback, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { AppTheme, SkillNode, User } from '@/src/types';
import { getRuneIcon, ORB_SIZE } from '@/src/utils/treeLayout';

import { ORB_VISUAL_SIZE, OrbVisual } from './OrbVisual';

interface ShadowGuideNodeProps {
  node: SkillNode;
  nodes: SkillNode[];
  theme: AppTheme;
  user: User | null;
  isActive: boolean;
  onActivate: (nodeId: number) => void;
  onDeactivate: () => void;
  onAdoptGuide: (guide: SkillNode) => void;
  onAddXp: (nodeId: number) => void;
  onDailyVerify: (nodeId: number) => void;
  onAddSubSkill: (parent: SkillNode) => void;
  onDeleteNode: (node: SkillNode) => void;
  onRenameNode: (node: SkillNode) => void;
  onShowInfo: (node: SkillNode) => void;
  detailMode: boolean;
}

const ORB_OFFSET = (ORB_VISUAL_SIZE - ORB_SIZE) / 2;
const SHADOW_ACCENT = '#6a7588';
const IS_WEB = Platform.OS === 'web';

export function ShadowGuideNode({
  node,
  isActive,
  onActivate,
  onDeactivate,
  detailMode,
}: ShadowGuideNodeProps) {
  const rune = getRuneIcon(node);

  const handleOrbPress = useCallback(() => {
    if (isActive) {
      onDeactivate();
    } else {
      onActivate(node.id);
    }
  }, [isActive, node.id, onActivate, onDeactivate]);

  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        runOnJS(handleOrbPress)();
      }),
    [handleOrbPress]
  );

  const orb = (
    <OrbVisual
      rune={rune}
      borderColor={SHADOW_ACCENT}
      glowColor="#3d4452"
      accentSecondary="#4a5060"
      isActive={isActive}
      isGuide
      isShadow
      unlocked={false}
      simplified={!detailMode}
    />
  );

  return (
    <View
      pointerEvents={detailMode ? 'box-none' : 'none'}
      style={[
        styles.wrapper,
        {
          left: node.posX + ORB_SIZE / 2 - ORB_VISUAL_SIZE / 2,
          top: node.posY - ORB_OFFSET,
          width: ORB_VISUAL_SIZE,
          zIndex: isActive ? 990 : 12,
        },
      ]}
      collapsable={false}
    >
      {IS_WEB ? (
        <Pressable
          onPress={handleOrbPress}
          accessibilityRole="button"
          accessibilityLabel={node.name}
          style={styles.orbHitArea}
        >
          {orb}
        </Pressable>
      ) : (
        <GestureDetector gesture={tapGesture}>
          <View style={styles.orbHitArea}>{orb}</View>
        </GestureDetector>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    alignItems: 'center',
    overflow: 'visible',
    backgroundColor: 'transparent',
  },
  orbHitArea: {
    width: ORB_VISUAL_SIZE,
    height: ORB_VISUAL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'visible',
    elevation: 0,
  },
});
