import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';

import { XP_PER_SESSION } from '@/src/config/progressionConfig';
import { TreeCanvas } from '@/src/components/tree/TreeCanvas';
import { DailySummaryOverlay } from '@/src/components/tree/DailySummaryOverlay';
import { TopBar } from '@/src/components/TopBar';
import { NenHatsuProvider } from '@/src/context/NenHatsuContext';
import { useAppContext } from '@/src/context/AppContext';
import {
  addXpToNode,
  triggerXPFeedback,
  restoreDeletedNode,
  softDeleteNode,
  configureWildcardNode,
  createCustomNode,
  reactivateNode,
  setDailyVerification,
  getAllNodes,
  resetTestMode,
  isSupabaseEnabled,
} from '@/src/database/queryEngine';
import { isDormantNode } from '@/src/utils/nodeMenuPolicy';
import { useDecayEngine } from '@/src/hooks/useDecayEngine';
import { syncCoolingAlerts } from '@/src/hooks/usePracticeReminder';
import { markOpenedToday, shouldShowDailySummary, consumeAutoFocusMap, setTutorialCompleted } from '@/src/storage/localPrefs';
import { DecayCategoryPicker, DEFAULT_DECAY_CATEGORIA } from '@/src/components/nen/DecayCategoryPicker';
import { MacroArea, NodeType, SkillNode, DecayCategoria, CalidadSesion } from '@/src/types';
import { resolveOrbitPlacement, resolveSubSkillPlacement } from '@/src/utils/polarLayout';
import { SPACE_BG } from '@/src/utils/treeLayout';

const MACRO_AREAS: { value: MacroArea; label: string }[] = [
  { value: 'physical', label: 'Física' },
  { value: 'intellectual', label: 'Intelectual' },
  { value: 'mental_emotional', label: 'Mental/Emocional' },
  { value: 'productive', label: 'Productiva' },
];

export default function TreeScreen() {
  const { theme, user } = useAppContext();
  const { nodes, deletedNodes, loading, error, refresh } = useDecayEngine();
  const [modalVisible, setModalVisible] = useState(false);
  const [parentNode, setParentNode] = useState<SkillNode | null>(null);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<NodeType>('intellectual');
  const [adoptingGuide, setAdoptingGuide] = useState<SkillNode | null>(null);
  const [newArea, setNewArea] = useState<MacroArea>('intellectual');
  const [newDecayCategoria, setNewDecayCategoria] = useState<DecayCategoria | null>(null);
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [focusNodeIds, setFocusNodeIds] = useState<number[]>([]);
  const [focusRequestKey, setFocusRequestKey] = useState(0);

  useEffect(() => {
    if (loading || !user) return;
    void (async () => {
      const show = await shouldShowDailySummary();
      if (show) setShowDailySummary(true);
      const autoFocus = await consumeAutoFocusMap();
      if (autoFocus) setFocusRequestKey(Date.now());
    })();
  }, [loading, user]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as {
        focusDecay?: boolean;
        nodeIds?: number[];
      };
      if (data?.focusDecay) {
        setFocusNodeIds(Array.isArray(data.nodeIds) ? data.nodeIds : []);
        setFocusRequestKey(Date.now());
      }
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        focusDecay?: boolean;
        nodeIds?: number[];
      };
      if (data?.focusDecay) {
        setFocusNodeIds(Array.isArray(data.nodeIds) ? data.nodeIds : []);
        setFocusRequestKey(Date.now());
      }
    });

    return () => sub.remove();
  }, []);

  const dismissDailySummary = useCallback(async () => {
    setShowDailySummary(false);
    await markOpenedToday();
  }, []);

  const handleAddXp = useCallback(
    async (nodeId: number) => {
      if (!user) return;
      const result = await addXpToNode(nodeId, XP_PER_SESSION, user);
      if (!result.success) {
        Alert.alert('No se pudo registrar', result.message);
        return;
      }
      if (result.message) {
        Alert.alert('Sobreentrenamiento', result.message);
      }
      if (result.feedback) {
        triggerXPFeedback(result.feedback);
      }
      await refresh({ silent: true });
    },
    [user, refresh]
  );

  const handleDailyVerify = useCallback(
    async (nodeId: number, calidad: CalidadSesion) => {
      const result = await setDailyVerification(nodeId, calidad, user);
      if (!result.success) {
        Alert.alert('Verificación', result.message ?? 'No se pudo guardar');
        return;
      }
      if (result.message) {
        Alert.alert('Sobreentrenamiento', result.message);
      }
      if (result.feedback) {
        triggerXPFeedback(result.feedback);
      }
      const allNodes = await getAllNodes();
      await syncCoolingAlerts(allNodes.filter((n) => !n.isDeleted && n.id > 0));
      await refresh({ silent: true });
    },
    [user, refresh]
  );

  const handleAdoptGuide = useCallback(
    async (guide: SkillNode) => {
      if (isDormantNode(guide)) {
        const result = await reactivateNode(guide.id);
        if (!result.success) {
          Alert.alert('No se pudo reactivar', result.message ?? 'Error desconocido');
          return;
        }
        await refresh({ silent: true });
        return;
      }

      const parent = guide.parentId
        ? nodes.find((n) => n.id === guide.parentId) ?? null
        : null;
      setAdoptingGuide(guide);
      setParentNode(parent);
      setNewName(guide.name);
      setNewType(guide.type);
      setNewArea(guide.macroArea);
      setModalVisible(true);
    },
    [nodes, refresh]
  );

  const handleAddSubSkill = useCallback((parent: SkillNode) => {
    setAdoptingGuide(null);
    setNewName('');
    setParentNode(parent);
    setNewType(parent.type);
    setNewArea(parent.macroArea);
    setModalVisible(true);
  }, []);

  const openRootModal = useCallback(() => {
    setAdoptingGuide(null);
    setParentNode(null);
    setNewName('');
    setModalVisible(true);
  }, []);

  const handleDeleteNode = useCallback(
    async (node: SkillNode) => {
      const result = await softDeleteNode(node.id);
      if (!result.success) {
        Alert.alert('No se pudo archivar', result.message ?? 'Error desconocido');
        return;
      }
      await refresh({ silent: true });
    },
    [refresh]
  );

  const handleRestoreNode = useCallback(
    async (node: SkillNode) => {
      const result = await restoreDeletedNode(node.id);
      if (!result.success) {
        Alert.alert('No se pudo restaurar', result.message ?? 'Error desconocido');
        return;
      }
      await refresh({ silent: true });
    },
    [refresh]
  );

  const handleConfigureWildcard = useCallback(
    async (node: SkillNode, name: string, decayCategoria?: DecayCategoria) => {
      const result = await configureWildcardNode(
        node.id,
        name,
        decayCategoria ?? DEFAULT_DECAY_CATEGORIA
      );
      if (!result.success) {
        Alert.alert('No se pudo forjar', result.message ?? 'Error desconocido');
        return;
      }
      await refresh({ silent: true });
    },
    [refresh]
  );

  const handleResetTestMode = useCallback(() => {
    const runReset = () => {
      void (async () => {
        try {
          await resetTestMode();
          await setTutorialCompleted(false);
          await refresh();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'No se pudo reiniciar la base de datos';
          Alert.alert('Error al reiniciar', message);
        }
      })();
    };

    if (isSupabaseEnabled()) {
      Alert.alert(
        'Reinicio local',
        'Se borrará el almacenamiento local (SQLite / localStorage). Si la app está en modo nube, los datos de Supabase no se eliminan — desactiva EXPO_PUBLIC_SUPABASE_URL para probar solo en local.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Reiniciar local', style: 'destructive', onPress: runReset },
        ]
      );
      return;
    }

    const message =
      'Se borrará todo el progreso guardado en este dispositivo (nodos, logs y historial Nen) y volverás al árbol inicial. ¿Continuar?';

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(message)) runReset();
      return;
    }

    Alert.alert('Reiniciar modo prueba', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Reiniciar', style: 'destructive', onPress: runReset },
    ]);
  }, [refresh]);

  const handleCreateNode = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Escribe un nombre para el nodo');
      return;
    }

    let posX: number;
    let posY: number;
    let parentId: number | null | undefined;

    if (parentNode) {
      const placement = resolveSubSkillPlacement(nodes, parentNode);
      posX = placement.posX;
      posY = placement.posY;
      parentId = placement.parentId;
    } else {
      const placement = resolveOrbitPlacement(nodes, newArea);
      posX = placement.posX;
      posY = placement.posY;
      parentId = placement.parentId ?? undefined;
    }

    try {
      await createCustomNode(newName.trim(), newType, newArea, posX, posY, parentId, {
        slug: adoptingGuide?.slug ?? null,
        guideUrl: adoptingGuide?.guideUrl ?? null,
        decayCategoria: newDecayCategoria ?? DEFAULT_DECAY_CATEGORIA,
      });
      setNewName('');
      setNewDecayCategoria(null);
      setParentNode(null);
      setAdoptingGuide(null);
      setModalVisible(false);
      await refresh({ silent: true });
    } catch {
      Alert.alert('Error', 'No se pudo forjar el nodo. Inténtalo de nuevo.');
    }
  };

  const nenHatsuTick = useMemo(
    () =>
      nodes.reduce(
        (sum, node) =>
          sum + node.xp + node.level + (node.dailyVerifiedAt ? 1000 : 0),
        0
      ),
    [nodes]
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: SPACE_BG }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: SPACE_BG }]}>
        <Text style={[styles.errorText, { color: theme.textMuted }]}>{error}</Text>
        <Pressable onPress={() => refresh()} style={styles.retryBtn}>
          <Text style={{ color: theme.primary }}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: SPACE_BG }]}>
      <DailySummaryOverlay
        visible={showDailySummary}
        userName="Roman"
        nodes={nodes}
        theme={theme}
        onDismiss={dismissDailySummary}
      />

      <TopBar
        nodes={nodes}
        deletedNodes={deletedNodes}
        user={user}
        theme={theme}
        onRestoreNode={handleRestoreNode}
        onResetTestMode={handleResetTestMode}
      />

      <NenHatsuProvider profileTick={nenHatsuTick}>
        <TreeCanvas
          nodes={nodes}
          theme={theme}
          user={user}
          onAddXp={handleAddXp}
          onDailyVerify={handleDailyVerify}
          onAddSubSkill={handleAddSubSkill}
          onAdoptGuide={handleAdoptGuide}
          onDeleteNode={handleDeleteNode}
          onConfigureWildcard={handleConfigureWildcard}
          onPersistPosition={() => refresh({ silent: true, skipDecay: true })}
          focusNodeIds={focusNodeIds}
          focusRequestKey={focusRequestKey}
        />
      </NenHatsuProvider>

      <Pressable
        style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
        onPress={openRootModal}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: '#0a0e14', borderColor: theme.primary }]}>
            <Text style={[styles.modalTitle, { color: theme.primary }]}>
              {parentNode ? `Sub-habilidad de ${parentNode.name}` : 'Nueva Habilidad'}
            </Text>

            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.primary }]}
              placeholder="Nombre"
              placeholderTextColor={theme.textMuted}
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={[styles.label, { color: theme.textMuted }]}>Tipo</Text>
            <View style={styles.row}>
              {(['intellectual', 'physical'] as NodeType[]).map((t) => (
                <Pressable
                  key={t}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: newType === t ? theme.primary : 'transparent',
                      borderColor: theme.primary,
                    },
                  ]}
                  onPress={() => setNewType(t)}
                >
                  <Text style={{ color: newType === t ? '#000' : theme.text }}>
                    {t === 'physical' ? 'Físico' : 'Intelectual'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: theme.textMuted }]}>Categoría</Text>
            <View style={styles.row}>
              {MACRO_AREAS.map((a) => (
                <Pressable
                  key={a.value}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: newArea === a.value ? theme.primary : 'transparent',
                      borderColor: theme.primary,
                    },
                  ]}
                  onPress={() => setNewArea(a.value)}
                >
                  <Text
                    style={{
                      color: newArea === a.value ? '#000' : theme.text,
                      fontSize: 11,
                    }}
                  >
                    {a.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <DecayCategoryPicker
              theme={theme}
              value={newDecayCategoria}
              onChange={setNewDecayCategoria}
              accentColor={theme.primary}
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setModalVisible(false);
                  setParentNode(null);
                  setAdoptingGuide(null);
                  setNewDecayCategoria(null);
                }}
              >
                <Text style={{ color: theme.textMuted }}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.createButton, { backgroundColor: theme.primary }]}
                onPress={handleCreateNode}
              >
                <Text style={styles.createButtonText}>Forjar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  fabText: {
    color: '#000',
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#030508',
  },
  label: {
    fontSize: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  createButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#000',
    fontWeight: '700',
  },
});
