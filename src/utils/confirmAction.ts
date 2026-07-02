import { Alert, Platform } from 'react-native';

function runWithWebFallback(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
  destructive = false
): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: confirmLabel,
      style: destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}

/** Confirmación genérica con fallback en web (Alert a veces falla en RN Web). */
export function confirmAction(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
  options?: { destructive?: boolean }
): void {
  setTimeout(
    () => runWithWebFallback(title, message, confirmLabel, onConfirm, options?.destructive ?? false),
    0
  );
}

/** Confirmación destructiva con fallback en web (Alert a veces falla en RN Web). */
export function confirmDestructive(
  title: string,
  message: string,
  onConfirm: () => void
): void {
  confirmAction(title, message, 'Eliminar', onConfirm, { destructive: true });
}
