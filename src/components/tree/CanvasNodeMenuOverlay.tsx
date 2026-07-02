import { useMemo } from 'react';
import { View } from 'react-native';

import { SkillNode, User } from '@/src/types';
import { getNodeVisualIntensity } from '@/src/utils/nodeIntensity';
import { getNodeMenuCapabilities } from '@/src/utils/nodeMenuPolicy';

import { buildNodeMenuActions } from './buildNodeMenuActions';
import { getNodeMenuOverlayStyle } from './nodeMenuLayout';
import { NodeRadialMenu } from './NodeRadialMenu';

const SHADOW_ACCENT = '#6a7588';

interface CanvasNodeMenuOverlayProps {
  node: SkillNode;
  nodes: SkillNode[];
  user: User | null;
  detailMode: boolean;
  accentColor?: string;
  onCloseMenu: () => void;
  onAddXp: (nodeId: number) => void;
  onDailyVerify: (nodeId: number) => void;
  onAddSubSkill: (parent: SkillNode) => void;
  onAdoptGuide: (guide: SkillNode) => void;
  onDeleteNode: (node: SkillNode) => void;
  onShowInfo: (node: SkillNode) => void;
}

export function CanvasNodeMenuOverlay({
  node,
  nodes,
  user,
  detailMode,
  accentColor,
  onCloseMenu,
  onAddXp,
  onDailyVerify,
  onAddSubSkill,
  onAdoptGuide,
  onDeleteNode,
  onShowInfo,
}: CanvasNodeMenuOverlayProps) {
  const caps = getNodeMenuCapabilities(node);

  const resolvedAccent =
    accentColor ??
    (caps.isGuide
      ? SHADOW_ACCENT
      : getNodeVisualIntensity(node, nodes, user).palette.border);

  const menuActions = useMemo(
    () =>
      buildNodeMenuActions(node, nodes, {
        onAdoptGuide,
        onAddSubSkill,
        onAddXp: () => {
          void onAddXp(node.id);
        },
        onDailyVerify: () => {
          void onDailyVerify(node.id);
        },
        onShowInfo: () => onShowInfo(node),
        onDeleteNode,
        onCloseMenu: onCloseMenu,
      }),
    [
      node,
      nodes,
      onAdoptGuide,
      onAddSubSkill,
      onAddXp,
      onDailyVerify,
      onDeleteNode,
      onCloseMenu,
      onShowInfo,
    ]
  );

  if (!detailMode || menuActions.length === 0) {
    return null;
  }

  return (
    <View style={getNodeMenuOverlayStyle(node)} pointerEvents="auto">
      <NodeRadialMenu accentColor={resolvedAccent} actions={menuActions} />
    </View>
  );
}
