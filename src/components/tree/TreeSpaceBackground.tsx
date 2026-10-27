import { StyleSheet, View } from 'react-native';

import { CANVAS_HEIGHT, CANVAS_WIDTH, SPACE_BG } from '@/src/utils/treeLayout';

/** Fondo sólido — evita SVG 2400×2400 que congela Android. */
export function TreeSpaceBackground() {
  return <View style={styles.bg} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  bg: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: SPACE_BG,
  },
});
