import { useCallback, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { AppTheme, SkillNode, User } from '@/src/types';
import { getRuneIcon, ORB_SIZE } from '@/src/utils/treeLayout';

import { buildNodeMenuActions } from './buildNodeMenuActions';
import { NodeRadialMenu, MENU_ROW_HEIGHT } from './NodeRadialMenu';
import { ORB_VISUAL_SIZE, OrbVisual } from './OrbVisual';
import { MENU_CONTAINER_WIDTH } from './nodeLabelLayout';

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
  hideRadialMenu?: boolean;
}

const ORB_OFFSET = (ORB_VISUAL_SIZE - ORB_SIZE) / 2;
const MENU_GAP_ABOVE_ORB = 6;
const MENU_STACK_HEIGHT = MENU_ROW_HEIGHT + MENU_GAP_ABOVE_ORB;
const SHADOW_ACCENT = '#6a7588';
const IS_WEB = Platform.OS === 'web';

export function ShadowGuideNode({
  node,
  nodes,
  theme,
  user: _user,
  isActive,
  onActivate,
  onDeactivate,
  onAdoptGuide,
  onAddXp,
  onDailyVerify,
  onAddSubSkill,
  onDeleteNode,
  onRenameNode,
  onShowInfo,
  detailMode,
  hideRadialMenu = false,
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

  const menuActions = useMemo(
    () =>
      hideRadialMenu
        ? []
        : buildNodeMenuActions(node, nodes, {
            onAdoptGuide,
            onAddSubSkill,
            onAddXp: () => {
              void onAddXp(node.id);
            },
            onDailyVerify: () => {
              void onDailyVerify(node.id);
            },
            onShowInfo: () => onShowInfo(node),
            onRenameNode,
            onDeleteNode,
            onCloseMenu: onDeactivate,
          }),
    [hideRadialMenu, node, nodes, onAdoptGuide, onAddSubSkill, onAddXp, onDailyVerify, onRenameNode, onDeleteNode, onDeactivate, onShowInfo]
  );

  const showMenu = !hideRadialMenu && detailMode && isActive && menuActions.length > 0;
  const isMenuSelected = showMenu || (hideRadialMenu && isActive);

  return (
    <View
      pointerEvents={detailMode ? 'box-none' : 'none'}
      style={[
        styles.wrapper,
        {
          left: node.posX + ORB_SIZE / 2 - MENU_CONTAINER_WIDTH / 2,
          top: node.posY - ORB_OFFSET - (showMenu ? MENU_STACK_HEIGHT : 0),
          paddingTop: showMenu ? MENU_STACK_HEIGHT : 0,
          zIndex: isMenuSelected ? 998 : isActive ? 990 : 12,
        },
      ]}
      collapsable={false}
    >
      {showMenu && (
        <View style={styles.menuSlot} pointerEvents="auto">
          <NodeRadialMenu accentColor={SHADOW_ACCENT} actions={menuActions} />
        </View>
      )}

      {IS_WEB ? (
        <Pressable
          onPress={handleOrbPress}
          accessibilityRole="button"
          accessibilityLabel={node.name}
          style={styles.orbHitArea}
        >
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
        </Pressable>
      ) : (
        <GestureDetector gesture={tapGesture}>
          <View style={styles.orbHitArea}>
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
          </View>
        </GestureDetector>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    width: MENU_CONTAINER_WIDTH,
    alignItems: 'center',
    overflow: 'visible',
    backgroundColor: 'transparent',
  },
  menuSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'center',
    zIndex: 500,
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
