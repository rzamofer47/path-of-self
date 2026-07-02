import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { DECAY_CATEGORIAS } from '@/src/config/nenDecayConfig';
import { CalidadSesion, SkillNode } from '@/src/types';
import { resolveDecayCategoria } from '@/src/utils/resolveNenDecayCategory';

interface SessionQualityModalProps {
  visible: boolean;
  node: SkillNode | null;
  nodes: SkillNode[];
  accentColor: string;
  onSelect: (calidad: CalidadSesion) => void;
  onCancel: () => void;
}

export function SessionQualityModal({
  visible,
  node,
  nodes,
  accentColor,
  onSelect,
  onCancel,
}: SessionQualityModalProps) {
  if (!node) return null;

  const categoria = DECAY_CATEGORIAS[resolveDecayCategoria(node, nodes)];
  const { sesionMinima, sesionOptima } = categoria;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Cancelar" />

        <View style={styles.card}>
          <Text style={styles.title}>¿Cómo fue tu sesión de hoy?</Text>
          <Text style={styles.nodeName}>{node.name}</Text>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            onPress={() => onSelect('parcial')}
            accessibilityRole="button"
            accessibilityLabel={`Sesión corta, menos de ${sesionMinima} minutos`}
          >
            <Text style={styles.optionIcon}>⚡</Text>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Sesión corta</Text>
              <Text style={styles.optionSubtitle}>Menos de {sesionMinima} min</Text>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.option, styles.optionRecommended, pressed && styles.optionPressed]}
            onPress={() => onSelect('completa')}
            accessibilityRole="button"
            accessibilityLabel={`Sesión completa, entre ${sesionMinima} y ${sesionOptima} minutos`}
          >
            <Text style={styles.optionIcon}>✓</Text>
            <View style={styles.optionTextWrap}>
              <View style={styles.recommendedRow}>
                <Text style={styles.optionTitle}>Sesión completa</Text>
                <View style={[styles.recommendedBadge, { borderColor: accentColor }]}>
                  <Text style={[styles.recommendedText, { color: accentColor }]}>RECOMENDADO</Text>
                </View>
              </View>
              <Text style={styles.optionSubtitle}>
                Entre {sesionMinima} y {sesionOptima} min
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            onPress={() => onSelect('extendida')}
            accessibilityRole="button"
            accessibilityLabel={`Sesión extendida, más de ${sesionOptima} minutos`}
          >
            <Text style={styles.optionIcon}>🔥</Text>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Sesión extendida</Text>
              <Text style={styles.optionSubtitle}>Más de {sesionOptima} min</Text>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.cancelBtnPressed]}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#12121F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 39, 0.35)',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 16,
  },
  title: {
    color: '#E8E4DC',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  nodeName: {
    color: '#9A9588',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(201, 162, 39, 0.25)',
    marginVertical: 18,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  optionRecommended: {
    borderColor: 'rgba(201, 162, 39, 0.25)',
  },
  optionPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  optionIcon: {
    fontSize: 22,
    width: 28,
    textAlign: 'center',
  },
  optionTextWrap: {
    flex: 1,
  },
  recommendedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionTitle: {
    color: '#E8E4DC',
    fontSize: 15,
    fontWeight: '600',
  },
  optionSubtitle: {
    color: '#7A7568',
    fontSize: 13,
    marginTop: 2,
  },
  recommendedBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  recommendedText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnPressed: {
    opacity: 0.7,
  },
  cancelText: {
    color: '#9A9588',
    fontSize: 14,
    fontWeight: '600',
  },
});
