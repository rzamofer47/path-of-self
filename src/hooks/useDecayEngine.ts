import { useCallback, useEffect, useState } from 'react';

import { recordNenSnapshot } from '@/src/database/nenHistory';
import {
  applyDecayToAllNodes,
  getAllNodes,
  getDeletedNodes,
  getUser,
  loadPersistedTree,
} from '@/src/database/queryEngine';
import { clearShadowLayoutCache } from '@/src/utils/shadowRadialRepulsion';
import { syncAllDecayWarnings, syncCoolingAlerts } from '@/src/hooks/usePracticeReminder';
import { SkillNode, User } from '@/src/types';

export interface RefreshOptions {
  /** Sin spinner de carga (p. ej. tras arrastrar un nodo). */
  silent?: boolean;
  /** Recarga desde BD sin recalcular oxidación (posiciones / sync UI). */
  skipDecay?: boolean;
}

export function useDecayEngine() {
  const [nodes, setNodes] = useState<SkillNode[]>([]);
  const [deletedNodes, setDeletedNodes] = useState<SkillNode[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options?: RefreshOptions) => {
    if (!options?.silent) setLoading(true);
    setError(null);
    try {
      const currentUser = await getUser();
      if (!currentUser) return;

      if (!options?.skipDecay && currentUser.onboardingComplete) {
        await applyDecayToAllNodes(currentUser);
      }

      const { user: loadedUser, nodes: loadedNodes } = await loadPersistedTree();
      const archived = await getDeletedNodes();
      setUser(loadedUser);
      setNodes(loadedNodes);
      setDeletedNodes(archived);

      if (loadedUser?.onboardingComplete) {
        const dbNodes = loadedNodes.filter((n) => n.id > 0 && n.layer !== 'dormant');
        await syncAllDecayWarnings(dbNodes, loadedUser);
        await syncCoolingAlerts(dbNodes);
        const allDbNodes = await getAllNodes();
        await recordNenSnapshot(allDbNodes.filter((n) => !n.isDeleted));
      }
    } catch (err) {
      clearShadowLayoutCache();
      const message =
        err instanceof Error ? err.message : 'No se pudo cargar el árbol de habilidades';
      setError(message);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { nodes, deletedNodes, user, loading, error, refresh };
}
