import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/src/types';
import { CANVAS_ZOOM, isDetailZoom } from '@/src/utils/canvasZoom';

interface ZoomControlsProps {
  theme: AppTheme;
  scale: number;
  minScale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function ZoomControls({
  theme,
  scale,
  minScale,
  onZoomIn,
  onZoomOut,
  onReset,
}: ZoomControlsProps) {
  const atMin = scale <= minScale * 1.02;
  const atMax = scale >= CANVAS_ZOOM.MAX * 0.98;
  const detail = isDetailZoom(scale);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Pressable style={[styles.btn, atMax && styles.btnDisabled]} onPress={onZoomIn} disabled={atMax}>
        <Text style={[styles.btnText, { color: theme.text, opacity: atMax ? 0.35 : 1 }]}>+</Text>
      </Pressable>
      <Text style={[styles.scale, { color: theme.textMuted }]}>
        {Math.round(scale * 100)}%
      </Text>
      <Text style={[styles.lodHint, { color: detail ? theme.primary : theme.textMuted }]}>
        {detail ? 'Detalle' : 'Mapa'}
      </Text>
      <Pressable
        style={[styles.btn, atMin && styles.btnDisabled]}
        onPress={onZoomOut}
        disabled={atMin}
      >
        <Text style={[styles.btnText, { color: theme.text, opacity: atMin ? 0.35 : 1 }]}>−</Text>
      </Pressable>
      <Pressable style={[styles.reset, { borderColor: theme.primary }]} onPress={onReset}>
        <Text style={[styles.resetText, { color: theme.primary }]}>⊙</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 10,
    padding: 6,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 2000,
  },
  btn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    fontSize: 22,
    fontWeight: '300',
  },
  scale: {
    fontSize: 11,
    marginVertical: 2,
  },
  lodHint: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  reset: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'transparent',
    marginTop: 4,
    paddingTop: 4,
  },
  resetText: {
    fontSize: 18,
  },
});

export { CANVAS_ZOOM, isDetailZoom } from '@/src/utils/canvasZoom';
