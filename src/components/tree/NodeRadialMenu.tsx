import { Platform, Pressable as RNPressable, StyleSheet, Text, View } from 'react-native';
import { Pressable as GHPressable } from 'react-native-gesture-handler';

export interface RadialMenuAction {
  key: string;
  icon: string;
  label?: string;
  onPress: () => void;
  destructive?: boolean;
  /** Botón de verificación diaria marcado hoy. */
  checked?: boolean;
}

interface NodeRadialMenuProps {
  accentColor: string;
  actions: RadialMenuAction[];
}

export const MENU_BUTTON_SIZE = 34;
export const MENU_BUTTON_GAP = 6;
export const MENU_ROW_HEIGHT = MENU_BUTTON_SIZE + 8;
/** @deprecated Usar posicionamiento relativo al orbe en CustomNode */
export const MENU_TOP_INSET = MENU_ROW_HEIGHT;

const CHECK_ACTIVE_BORDER = '#3d9e48';
const CHECK_ACTIVE_FILL = '#1e3d24';

const MenuPressable = Platform.OS === 'web' ? RNPressable : GHPressable;

export function NodeRadialMenu({ accentColor, actions }: NodeRadialMenuProps) {
  if (actions.length === 0) return null;

  return (
    <View style={styles.dock} pointerEvents="auto">
      {actions.map((action) => {
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
            hitSlop={10}
            onPress={() => {
              action.onPress();
            }}
            style={({ pressed }) => [
              styles.btn,
              action.destructive && styles.btnDestructive,
              isCheck && isChecked && styles.btnChecked,
              {
                borderColor: color,
                shadowColor: color,
                backgroundColor: pressed
                  ? color
                  : action.destructive
                    ? '#1a0808'
                    : isCheck && isChecked
                      ? CHECK_ACTIVE_FILL
                      : '#0a0e14',
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
  dock: {
    width: '100%',
    height: MENU_ROW_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: MENU_BUTTON_GAP,
    zIndex: 500,
    overflow: 'visible',
    backgroundColor: 'transparent',
  },
  btn: {
    width: MENU_BUTTON_SIZE,
    height: MENU_BUTTON_SIZE,
    borderRadius: MENU_BUTTON_SIZE / 2,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    cursor: 'pointer',
  },
  btnDestructive: {
    borderWidth: 2,
  },
  btnChecked: {
    borderWidth: 2,
  },
  icon: {
    fontSize: 15,
    fontWeight: '800',
  },
  iconXp: {
    fontSize: 10,
    letterSpacing: -0.5,
  },
  iconCheck: {
    fontSize: 17,
    lineHeight: 18,
  },
});
