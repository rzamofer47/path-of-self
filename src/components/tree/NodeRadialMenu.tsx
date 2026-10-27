import { useMemo } from 'react';
import { Platform, Pressable as RNPressable, StyleSheet, Text, View } from 'react-native';
import { Pressable as GHPressable } from 'react-native-gesture-handler';

export interface RadialMenuAction {
  key: string;
  icon: string;
  label?: string;
  onPress: () => void;
  destructive?: boolean;
  checked?: boolean;
}

interface NodeRadialMenuProps {
  accentColor: string;
  actions: RadialMenuAction[];
}

export const MENU_BUTTON_SIZE = 56;
export const MENU_CHECK_BUTTON_SIZE = 72;
export const MENU_PAW_RADIUS = 92;
export const MENU_PAW_PADDING = 12;
export const MENU_PAW_SIZE =
  MENU_PAW_RADIUS * 2 + MENU_CHECK_BUTTON_SIZE + MENU_PAW_PADDING * 2;
/** @deprecated Usar MENU_PAW_SIZE */
export const MENU_ROW_HEIGHT = MENU_PAW_SIZE;
export const MENU_BUTTON_GAP = 8;
export const MENU_TOP_INSET = MENU_PAW_SIZE;

const CHECK_ACTIVE_BORDER = '#3d9e48';
const CHECK_ACTIVE_FILL = '#1e3d24';
const ORB_PAD_RADIUS = 30;

const MenuPressable = Platform.OS === 'web' ? RNPressable : GHPressable;

function buttonSizeForAction(action: RadialMenuAction): number {
  return action.key === 'daily-check' ? MENU_CHECK_BUTTON_SIZE : MENU_BUTTON_SIZE;
}

/**
 * Pata de conejo: arco amplio alrededor del orbe (195°–345°).
 * Orden: izquierda → arriba → derecha.
 */
function pawButtonPositions(actions: RadialMenuAction[], center: number, radius: number) {
  if (actions.length <= 0) return [];

  const startDeg = 200;
  const endDeg = 340;

  return actions.map((action, index) => {
    const t = actions.length === 1 ? 0.5 : index / (actions.length - 1);
    const deg = startDeg + t * (endDeg - startDeg);
    const rad = (deg * Math.PI) / 180;
    const size = buttonSizeForAction(action);
    return {
      left: center + radius * Math.cos(rad) - size / 2,
      top: center + radius * Math.sin(rad) - size / 2,
      size,
    };
  });
}

export function NodeRadialMenu({ accentColor, actions }: NodeRadialMenuProps) {
  const center = MENU_PAW_SIZE / 2;
  const positions = useMemo(
    () => pawButtonPositions(actions, center, MENU_PAW_RADIUS),
    [actions]
  );

  if (actions.length === 0) return null;

  return (
    <View style={styles.paw} pointerEvents="box-none">
      <View style={styles.padRing} pointerEvents="none" />
      {actions.map((action, index) => {
        const pos = positions[index];
        const isCheck = action.key === 'daily-check';
        const isChecked = Boolean(action.checked);
        const color = action.destructive
          ? '#e5534b'
          : isCheck && isChecked
            ? CHECK_ACTIVE_BORDER
            : accentColor;

        return (
          <MenuPressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label ?? action.key}
            accessibilityState={{ checked: isCheck ? isChecked : undefined }}
            hitSlop={16}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.btn,
              {
                left: pos.left,
                top: pos.top,
                width: pos.size,
                height: pos.size,
                borderRadius: pos.size / 2,
              },
              action.destructive && styles.btnDestructive,
              isCheck && isChecked && styles.btnChecked,
              isCheck && styles.btnCheck,
              {
                borderColor: color,
                shadowColor: color,
                backgroundColor: pressed
                  ? color
                  : action.destructive
                    ? '#1a0808'
                    : isCheck && isChecked
                      ? CHECK_ACTIVE_FILL
                      : '#121820',
              },
            ]}
          >
            {({ pressed }) => (
              <Text
                style={[
                  styles.icon,
                  action.key === 'xp' && styles.iconXp,
                  isCheck && styles.iconCheck,
                  {
                    color: pressed
                      ? '#0a0e14'
                      : action.destructive
                        ? '#ff6b6b'
                        : isCheck && isChecked
                          ? CHECK_ACTIVE_BORDER
                          : accentColor,
                  },
                ]}
              >
                {action.icon}
              </Text>
            )}
          </MenuPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  paw: {
    width: MENU_PAW_SIZE,
    height: MENU_PAW_SIZE,
    zIndex: 1001,
    overflow: 'visible',
  },
  padRing: {
    position: 'absolute',
    left: MENU_PAW_SIZE / 2 - ORB_PAD_RADIUS,
    top: MENU_PAW_SIZE / 2 - ORB_PAD_RADIUS,
    width: ORB_PAD_RADIUS * 2,
    height: ORB_PAD_RADIUS * 2,
    borderRadius: ORB_PAD_RADIUS,
    borderWidth: 1.5,
    borderColor: 'rgba(200, 170, 100, 0.35)',
    backgroundColor: 'rgba(6, 10, 16, 0.72)',
  },
  btn: {
    position: 'absolute',
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 12,
    cursor: 'pointer',
  },
  btnCheck: {
    borderWidth: 3,
  },
  btnDestructive: {
    borderWidth: 3,
  },
  btnChecked: {
    borderWidth: 3.5,
  },
  icon: {
    fontSize: 20,
    fontWeight: '800',
  },
  iconXp: {
    fontSize: 12,
    letterSpacing: -0.5,
  },
  iconCheck: {
    fontSize: 30,
    lineHeight: 32,
  },
});
