import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NEN_AXIS_LABELS, NenAxisId } from '@/src/config/nenConfig';
import { NenAxisDecayInsight, NenAxisDecayStatus } from '@/src/utils/nenDecayEngine';
import { AppTheme } from '@/src/types';

const STATUS_LABEL: Record<NenAxisDecayStatus, string> = {
  estable: 'Estable',
  enfriando: 'Enfriando',
  en_decay: 'En decay',
};

const STATUS_COLOR: Record<NenAxisDecayStatus, string> = {
  estable: 'rgba(120, 200, 140, 0.9)',
  enfriando: 'rgba(200, 180, 100, 0.9)',
  en_decay: 'rgba(160, 170, 185, 0.95)',
};

interface NenHexagonDetailPanelProps {
  visible: boolean;
  insights: NenAxisDecayInsight[];
  theme: AppTheme;
  onClose: () => void;
}

function activityLine(insight: NenAxisDecayInsight): string | null {
  if (!insight.stalestNode || insight.daysSinceActivity == null) return null;
  const dias =
    insight.daysSinceActivity === 0
      ? 'hoy'
      : insight.daysSinceActivity === 1
        ? '1 día'
        : `${insight.daysSinceActivity} días`;
  return `Esta área lleva ${dias} sin actividad en «${insight.stalestNode.name}»`;
}

export function NenHexagonDetailPanel({
  visible,
  insights,
  theme,
  onClose,
}: NenHexagonDetailPanelProps) {
  const ordered = [...insights].sort((a, b) =>
    NEN_AXIS_LABELS[a.axisId].localeCompare(NEN_AXIS_LABELS[b.axisId], 'es')
  );

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.panel, { borderColor: theme.primary }]} onPress={() => {}}>
          <Text style={[styles.title, { color: theme.primary }]}>Perfil Nen</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Espejo de tu desarrollo actual — el decay del radar no afecta XP ni nivel de nodos.
          </Text>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {ordered.map((insight) => (
              <AxisRow key={insight.axisId} insight={insight} theme={theme} />
            ))}
          </ScrollView>

          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Text style={{ color: theme.textMuted, fontWeight: '600' }}>Cerrar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AxisRow({ insight, theme }: { insight: NenAxisDecayInsight; theme: AppTheme }) {
  const axisLabel = NEN_AXIS_LABELS[insight.axisId as NenAxisId];
  const activity = activityLine(insight);

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={[styles.axisName, { color: theme.text }]}>{axisLabel}</Text>
        <Text style={[styles.axisValue, { color: theme.primary }]}>{insight.value}</Text>
      </View>
      <Text style={[styles.status, { color: STATUS_COLOR[insight.status] }]}>
        Estado: {STATUS_LABEL[insight.status]}
      </Text>
      {activity ? (
        <Text style={[styles.activity, { color: theme.textMuted }]}>{activity}</Text>
      ) : insight.status === 'estable' ? (
        <Text style={[styles.activity, { color: theme.textMuted }]}>
          Ritmo estable en esta área
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '82%',
    backgroundColor: '#0a0e14',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 6,
    marginBottom: 10,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: 10,
    paddingBottom: 8,
  },
  row: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  axisName: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    paddingRight: 8,
  },
  axisValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  status: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  activity: {
    fontSize: 10,
    lineHeight: 14,
  },
  closeBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
});
