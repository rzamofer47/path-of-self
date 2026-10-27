import { memo, useCallback, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppTheme, SkillNode, User } from '@/src/types';
import { useNenHatsu } from '@/src/context/NenHatsuContext';
import { computeDecayRatio } from '@/src/utils/decayRatio';
import { getNodeVisualIntensity } from '@/src/utils/nodeIntensity';
import { getDecayState, isVisualDecayTrackedNode } from '@/src/utils/visualDecay';
import { getRuneIcon, isCatalogNodeAccessible, isNodeUnlocked, ORB_SIZE } from '@/src/utils/treeLayout';

import { ORB_VISUAL_SIZE, OrbVisual } from './OrbVisual';

interface LockedCatalogNodeProps {
  node: SkillNode;
  nodes: SkillNode[];
  theme: AppTheme;
  user: User | null;
  detailMode: boolean;
  isActive?: boolean;
  canvasMenuOpen?: boolean;
  onActivate?: (nodeId: number) => void;
  onDeactivate?: () => void;
  onAddXp?: (nodeId: number) => void;
  onDailyVerify?: (nodeId: number) => void;
  onAddSubSkill?: (parent: SkillNode) => void;
  onAdoptGuide?: (guide: SkillNode) => void;
  onDeleteNode?: (node: SkillNode) => void;
  onRenameNode?: (node: SkillNode) => void;
  onShowInfo?: (node: SkillNode) => void;
}

const ORB_OFFSET = (ORB_VISUAL_SIZE - ORB_SIZE) / 2;
const IS_WEB = Platform.OS === 'web';

/** Nodo predefinido del catálogo — brillo pleno cuando está en rutina activa. */
function LockedCatalogNodeInner({
  node,
  nodes,
  user,
  detailMode,
  isActive = false,
  canvasMenuOpen = false,
  onActivate,
}: LockedCatalogNodeProps) {
  const rune = getRuneIcon(node);
  const hatsu = useNenHatsu();
  const progressionOpen = isCatalogNodeAccessible(node, nodes);
  const unlocked = isNodeUnlocked(node) && progressionOpen;

  const { palette, routineState } = useMemo(
    () => getNodeVisualIntensity(node, nodes, user),
    [node, nodes, user]
  );

  const decayRatio = useMemo(() => {
    if (!user) return 1;
    return computeDecayRatio(node, user);
  }, [node, user]);

  const isFreshAura = useMemo(() => {
    if (!isVisualDecayTrackedNode(node)) return false;
    return getDecayState(node) === 'fresh';
  }, [node]);

  const handlePress = useCallback(() => {
    if (!isActive) {
      onActivate?.(node.id);
    }
  }, [isActive, node.id, onActivate]);

  const orb = (
    <OrbVisual
      rune={rune}
      borderColor={palette.border}
      glowColor={palette.glow}
      accentSecondary={palette.accentSecondary}
      isActive={isActive}
      isGuide={false}
      routineIntensity={routineState}
      unlocked={unlocked}
      decayRatio={decayRatio}
      simplified={!detailMode}
      hatsuAuraColor={isFreshAura ? hatsu.auraColor : undefined}
      destelloPattern={hatsu.destelloPattern}
      auraPulseMs={isFreshAura ? hatsu.pulseMs : undefined}
    />
  );

  return (
    <View
      pointerEvents={canvasMenuOpen && !isActive ? 'none' : 'box-none'}
      style={[
        styles.wrapper,
        {
          left: node.posX + ORB_SIZE / 2 - ORB_VISUAL_SIZE / 2,
          top: node.posY - ORB_OFFSET,
          zIndex: isActive ? 990 : 45,
          opacity: !progressionOpen ? 0.3 : routineState === 'active' ? 1 : 0.82,
        },
      ]}
    >
      {onActivate ? (
        IS_WEB ? (
          <Pressable
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityLabel={node.name}
            style={styles.orbHitArea}
          >
            {orb}
          </Pressable>
        ) : (
          <Pressable onPress={handlePress} style={styles.orbHitArea}>
            {orb}
          </Pressable>
        )
      ) : (
        <View style={styles.orbHitArea} pointerEvents="none">
          {orb}
        </View>
      )}
    </View>
  );
}

export const LockedCatalogNode = memo(LockedCatalogNodeInner);

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    alignItems: 'center',
    overflow: 'visible',
  },
  orbHitArea: {
    width: ORB_VISUAL_SIZE,
    height: ORB_VISUAL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
});
