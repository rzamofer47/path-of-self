import 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AppProvider, useAppContext } from '@/src/context/AppContext';
import { isSupabaseEnabled } from '@/src/config/env';
import { isTutorialCompleted } from '@/src/storage/localPrefs';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RootLayoutNav />
      </GestureHandlerRootView>
    </AppProvider>
  );
}

function RootLayoutNav() {
  const { user, loading, theme, authAccount } = useAppContext();
  const segments = useSegments();
  const router = useRouter();
  const [routingReady, setRoutingReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    void (async () => {
      const tutorialDone = await isTutorialCompleted();
      const inOnboarding = segments[0] === 'onboarding';
      const inTutorial = segments[0] === 'tutorial';
      const inLogin = segments[0] === 'login';
      const inAuth = segments[0] === 'auth';

      if (isSupabaseEnabled() && !authAccount && !inLogin && !inAuth) {
        router.replace('/login');
        setRoutingReady(true);
        return;
      }

      if (authAccount && inLogin) {
        router.replace('/(tabs)');
        setRoutingReady(true);
        return;
      }

      if (!user?.onboardingComplete && !inOnboarding && !inLogin && !inAuth) {
        router.replace('/onboarding');
      } else if (user?.onboardingComplete && inOnboarding) {
        router.replace('/(tabs)');
      } else if (
        user?.onboardingComplete &&
        authAccount &&
        !tutorialDone &&
        !inTutorial &&
        !inLogin &&
        !inAuth
      ) {
        router.replace('/tutorial');
      } else if (tutorialDone && inTutorial) {
        router.replace('/(tabs)');
      }

      setRoutingReady(true);
    })();
  }, [user, loading, segments, router, authAccount]);

  if (loading || !routingReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="tutorial" options={{ headerShown: false }} />
    </Stack>
  );
}
