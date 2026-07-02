import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PROGRESION_CONFIG, xpInCurrentLevel } from '@/src/config/progressionConfig';
import { AppTheme, SkillNode } from '@/src/types';

interface UnderworldSkillsModalProps {
  visible: boolean;
  nodes: SkillNode[];
  theme: AppTheme;
  onClose: () => void;
  onRestore: (node: SkillNode) => void;
}

export function UnderworldSkillsModal({
  visible,
  nodes,
  theme,
  onClose,
  onRestore,
}: UnderworldSkillsModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.panel, { borderColor: theme.primary }]}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={[styles.title, { color: theme.primary }]}>Habilidades en el Inframundo</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Nodos archivados con borrado lógico. Restáuralos con nivel, XP y posición intactos.
          </Text>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {nodes.length === 0 ? (
              <Text style={[styles.empty, { color: theme.textMuted }]}>
                No hay habilidades en el inframundo. El mapa está limpio.
              </Text>
            ) : (
              nodes.map((node) => (
                <View key={node.id} style={[styles.row, { borderColor: 'rgba(180,150,90,0.2)' }]}>
                  <View style={styles.rowText}>
                    <Text style={[styles.nodeName, { color: theme.text }]} numberOfLines={2}>
                      {node.name}
                    </Text>
                    <Text style={[styles.nodeMeta, { color: theme.textMuted }]}>
                      Nv. {node.level} · {xpInCurrentLevel(node.xp)}/{PROGRESION_CONFIG.xpPorNivel} XP
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.restoreBtn,
                      {
                        borderColor: theme.secondary,
                        backgroundColor: pressed ? theme.secondary : 'transparent',
                      },
                    ]}
                    onPress={() => onRestore(node)}
                  >
                    {({ pressed }) => (
                      <Text
                        style={[
                          styles.restoreBtnText,
                          { color: pressed ? '#0a0e14' : theme.secondary },
                        ]}
                      >
                        Restaurar
                      </Text>
                    )}
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>

          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <Text style={{ color: theme.textMuted }}>Cerrar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    padding: 20,
  },
  panel: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 18,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    maxHeight: '78%',
    backgroundColor: '#0a0e14',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
  },
  listContent: {
    gap: 8,
    paddingBottom: 4,
  },
  empty: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  nodeName: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  nodeMeta: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  restoreBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  restoreBtnText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  closeBtn: {
    marginTop: 14,
    alignSelf: 'flex-end',
  },
});
