import { Pressable, StyleSheet, View } from 'react-native';

import { AppTheme, SkillNode } from '@/src/types';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  clamp,
  getNodeCenter,
} from '@/src/utils/treeLayout';

interface TreeMiniMapProps {
  nodes: SkillNode[];
  theme: AppTheme;
  viewportX: number;
  viewportY: number;
  viewportWidth: number;
  viewportHeight: number;
  scale: number;
  onNavigate: (x: number, y: number) => void;
}

const MINI_W = 120;
const MINI_H = 90;

export function TreeMiniMap({
  nodes,
  theme,
  viewportX,
  viewportY,
  viewportWidth,
  viewportHeight,
  scale,
  onNavigate,
}: TreeMiniMapProps) {
  const scaleX = MINI_W / CANVAS_WIDTH;
  const scaleY = MINI_H / CANVAS_HEIGHT;

  const viewW = (viewportWidth / scale) * scaleX;
  const viewH = (viewportHeight / scale) * scaleY;
  const viewLeft = clamp(-viewportX / scale * scaleX, 0, MINI_W - viewW);
  const viewTop = clamp(-viewportY / scale * scaleY, 0, MINI_H - viewH);

  const handlePress = (evt: { nativeEvent: { locationX: number; locationY: number } }) => {
    const { locationX, locationY } = evt.nativeEvent;
    const canvasX = (locationX / MINI_W) * CANVAS_WIDTH;
    const canvasY = (locationY / MINI_H) * CANVAS_HEIGHT;
    onNavigate(canvasX, canvasY);
  };

  return (
    <Pressable
      style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.primary }]}
      onPress={handlePress}
    >
      {nodes.map((node) => {
        const c = getNodeCenter(node);
        return (
          <View
            key={node.id}
            style={[
              styles.dot,
              {
                left: c.x * scaleX - 2,
                top: c.y * scaleY - 2,
                backgroundColor: node.layer === 'guide' ? theme.accent : theme.primary,
              },
            ]}
          />
        );
      })}
      <View
        style={[
          styles.viewport,
          {
            left: viewLeft,
            top: viewTop,
            width: viewW,
            height: viewH,
            borderColor: theme.primary,
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: MINI_W,
    height: MINI_H,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  viewport: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});
