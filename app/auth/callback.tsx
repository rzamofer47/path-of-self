import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAppContext } from '@/src/context/AppContext';
import { markOnboardingComplete, mergeProgressOnOpen } from '@/src/database/queryEngine';
import { prepareSupabaseUser } from '@/src/database/supabaseSeed';
import { consumeSkipOnboardingAfterFullReset } from '@/src/storage/localPrefs';
import { createSessionFromUrl } from '@/src/lib/googleAuth';
import { SPACE_BG } from '@/src/utils/treeLayout';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { theme, refreshUser, refreshAuthAccount } = useAppContext();

  useEffect(() => {
    void (async () => {
      try {
        const url =
          Platform.OS === 'web' && typeof window !== 'undefined'
            ? window.location.href
            : '';

        if (url) {
          await createSessionFromUrl(url);
        }

        await prepareSupabaseUser();

        const skipOnboardingAfterReset = await consumeSkipOnboardingAfterFullReset();
        if (skipOnboardingAfterReset) {
          await markOnboardingComplete();
          await refreshAuthAccount();
          await refreshUser();
          router.replace('/(tabs)');
          return;
        }

        await mergeProgressOnOpen();
        await refreshAuthAccount();
        await refreshUser();
        router.replace('/(tabs)');
      } catch {
        router.replace('/login');
      }
    })();
  }, [refreshAuthAccount, refreshUser, router]);

  return (
    <View style={[styles.center, { backgroundColor: SPACE_BG }]}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
