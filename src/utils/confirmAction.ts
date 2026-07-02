import { Alert, Platform } from 'react-native';

/** Confirmación destructiva con fallback en web (Alert a veces falla en RN Web). */
export function confirmDestructive(
  title: string,
  message: string,
  onConfirm: () => void
): void {
  const runConfirm = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
        onConfirm();
      }
      return;
    }

    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: onConfirm },
    ]);
  };

  setTimeout(runConfirm, 0);
}
