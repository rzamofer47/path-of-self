import { XP_PER_SESSION } from '@/src/config/progressionConfig';
import { SkillNode } from '@/src/types';
import { confirmDestructive } from '@/src/utils/confirmAction';
import { isDailyVerifiedToday } from '@/src/utils/dailyVerification';
import { getNodeMenuCapabilities, isDormantNode } from '@/src/utils/nodeMenuPolicy';

import { RadialMenuAction } from './NodeRadialMenu';

export interface NodeMenuHandlers {
  onAdoptGuide: (node: SkillNode) => void;
  onAddSubSkill: (parent: SkillNode) => void;
  onAddXp: () => void | Promise<void>;
  onDailyVerify: () => void | Promise<void>;
  onShowInfo: () => void;
  onRenameNode: (node: SkillNode) => void;
  onDeleteNode: (node: SkillNode) => void;
  onCloseMenu: () => void;
}

export function buildNodeMenuActions(
  node: SkillNode,
  nodes: SkillNode[],
  handlers: NodeMenuHandlers
): RadialMenuAction[] {
  const caps = getNodeMenuCapabilities(node);
  const actions: RadialMenuAction[] = [];
  const verifiedToday = isDailyVerifiedToday(node);

  if (caps.canAdoptGuide) {
    actions.push({
      key: 'adopt',
      icon: '+',
      label: isDormantNode(node) ? 'Reactivar habilidad' : 'Adoptar guía',
      onPress: () => {
        handlers.onAdoptGuide(node);
        handlers.onCloseMenu();
      },
    });
  }

  if (caps.canAddSubSkill) {
    actions.push({
      key: 'add-sub',
      icon: '+',
      label: 'Sub-habilidad',
      onPress: () => {
        handlers.onAddSubSkill(node);
        handlers.onCloseMenu();
      },
    });
  }

  if (caps.canDailyVerify) {
    actions.push({
      key: 'daily-check',
      icon: '✓',
      label: verifiedToday
        ? 'Completado hoy'
        : 'Marcar actividad de hoy',
      checked: verifiedToday,
      onPress: () => {
        if (verifiedToday) {
          handlers.onCloseMenu();
          return;
        }
        void Promise.resolve(handlers.onDailyVerify()).finally(() => {
          handlers.onCloseMenu();
        });
      },
    });
  }

  if (caps.canAddXp) {
    actions.push({
      key: 'xp',
      icon: 'XP',
      label: `Registrar práctica (+${XP_PER_SESSION} XP)`,
      onPress: () => {
        void Promise.resolve(handlers.onAddXp()).finally(() => {
          handlers.onCloseMenu();
        });
      },
    });
  }

  if (caps.canShowInfo) {
    actions.push({
      key: 'info',
      icon: 'i',
      label: 'Información',
      onPress: () => {
        handlers.onShowInfo();
        requestAnimationFrame(() => {
          handlers.onCloseMenu();
        });
      },
    });
  }

  if (caps.canRename) {
    actions.push({
      key: 'rename',
      icon: '✎',
      label: 'Renombrar',
      onPress: () => {
        handlers.onCloseMenu();
        handlers.onRenameNode(node);
      },
    });
  }

  if (caps.canDelete) {
    const childCount = nodes.filter(
      (n) => n.parentId === node.id && n.layer !== 'dormant' && !n.isDeleted
    ).length;
    const message =
      childCount > 0
        ? `"${node.name}" y ${childCount} sub-habilidad${childCount === 1 ? '' : 'es'} se ocultarán del mapa. Conservarás nivel, XP y posición. Podrás restaurarlos desde el Inframundo.`
        : `"${node.name}" se ocultará del mapa. Conservarás nivel, XP y posición. Podrás restaurarlo desde el Inframundo.`;

    actions.push({
      key: 'delete',
      icon: '×',
      label: 'Archivar habilidad',
      destructive: true,
      onPress: () => {
        handlers.onCloseMenu();
        confirmDestructive('Archivar habilidad', message, () => {
          handlers.onDeleteNode(node);
        });
      },
    });
  }

  return actions;
}
