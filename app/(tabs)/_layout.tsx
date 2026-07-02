import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import { useAppContext } from '@/src/context/AppContext';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function TabLayout() {
  const { theme } = useAppContext();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.surface,
        },
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Árbol',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'tree', android: 'park', web: 'park' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'person.crop.circle', android: 'person', web: 'person' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
    </Tabs>
  );
}
