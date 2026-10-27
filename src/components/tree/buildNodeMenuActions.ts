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

/** Orden fijo de la pata de conejo para todos los nodos. */
const STANDARD_MENU_ORDER = [
  'daily-check',
  'info',
  'rename',
  'add-sub',
  'delete',
] as const;

export function buildNodeMenuActions(
  node: SkillNode,
  nodes: SkillNode[],
  handlers: NodeMenuHandlers
): RadialMenuAction[] {
  const caps = getNodeMenuCapabilities(node);
  const byKey = new Map<string, RadialMenuAction>();
  const verifiedToday = isDailyVerifiedToday(node);

  if (caps.canDailyVerify) {
    byKey.set('daily-check', {
      key: 'daily-check',
      icon: '✓',
      label: verifiedToday ? 'Completado hoy' : 'Marcar actividad de hoy',
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

  if (caps.canDelete) {
    const childCount = nodes.filter(
      (n) => n.parentId === node.id && n.layer !== 'dormant' && !n.isDeleted
    ).length;
    const message =
      childCount > 0
        ? `"${node.name}" y ${childCount} sub-habilidad${childCount === 1 ? '' : 'es'} se ocultarán del mapa. Conservarás nivel, XP y posición. Podrás restaurarlos desde el Inframundo.`
        : `"${node.name}" se ocultará del mapa. Conservarás nivel, XP y posición. Podrás restaurarlo desde el Inframundo.`;

    byKey.set('delete', {
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

  if (caps.canShowInfo) {
    byKey.set('info', {
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
    byKey.set('rename', {
      key: 'rename',
      icon: '✎',
      label: 'Renombrar',
      onPress: () => {
        handlers.onCloseMenu();
        handlers.onRenameNode(node);
      },
    });
  }

  if (caps.canAdoptGuide) {
    byKey.set('add-sub', {
      key: 'add-sub',
      icon: '+',
      label: isDormantNode(node) ? 'Reactivar habilidad' : 'Agregar habilidad',
      onPress: () => {
        handlers.onAdoptGuide(node);
        handlers.onCloseMenu();
      },
    });
  } else if (caps.canAddSubSkill) {
    byKey.set('add-sub', {
      key: 'add-sub',
      icon: '+',
      label: 'Agregar habilidad',
      onPress: () => {
        handlers.onAddSubSkill(node);
        handlers.onCloseMenu();
      },
    });
  }

  return STANDARD_MENU_ORDER.map((key) => byKey.get(key)).filter(
    (action): action is RadialMenuAction => action != null
  );
}
