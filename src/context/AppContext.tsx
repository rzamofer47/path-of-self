import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { getStorageMode, isSupabaseEnabled } from '@/src/config/env';
import { logSupabaseConfigDebug } from '@/src/config/supabaseDebug';
import {
  getUser,
  markOnboardingComplete,
  mergeProgressOnOpen,
  pushProgressToCloud,
  updatePracticeReminder,
  updateSelectedSkin,
  updateTreeViewMode,
} from '@/src/database/queryEngine';
import { prepareSupabaseUser } from '@/src/database/supabaseSeed';
import {
  cancelPracticeReminder,
  schedulePracticeReminder,
} from '@/src/hooks/usePracticeReminder';
import {
  getSupabaseAuthAccount,
  signInWithGoogle as googleSignIn,
  signOutFromGoogle,
  type SupabaseAuthAccount,
} from '@/src/lib/googleAuth';
import { onSupabaseAuthStateChange } from '@/src/lib/supabase';
import { consumeSkipOnboardingAfterFullReset, isSkipOnboardingAfterFullReset } from '@/src/storage/localPrefs';
import { getTheme } from '@/src/themes';
import { AppTheme, SkinId, TreeViewMode, User } from '@/src/types';

interface AppContextValue {
  user: User | null;
  authAccount: SupabaseAuthAccount | null;
  theme: AppTheme;
  loading: boolean;
  storageMode: 'cloud' | 'local';
  refreshUser: () => Promise<void>;
  refreshAuthAccount: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutAccount: () => Promise<void>;
  setSkin: (skinId: SkinId) => Promise<void>;
  setTreeViewMode: (mode: TreeViewMode) => Promise<void>;
  setPracticeReminder: (enabled: boolean, hour: number) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function SkinFadeWrapper({
  skinId,
  children,
}: {
  skinId: SkinId;
  children: React.ReactNode;
}) {
  const opacity = useSharedValue(1);
  const prevSkin = useRef(skinId);

  useEffect(() => {
    if (prevSkin.current !== skinId) {
      opacity.value = withSequence(
        withTiming(0.15, { duration: 100 }),
        withTiming(1, { duration: 200 })
      );
      prevSkin.current = skinId;
    }
  }, [skinId, opacity]);

  const style = useAnimatedStyle(() => ({
    flex: 1,
    opacity: opacity.value,
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authAccount, setAuthAccount] = useState<SupabaseAuthAccount | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const u = await getUser();
    setUser(u);
  };

  const refreshAuthAccount = async () => {
    if (!isSupabaseEnabled()) {
      setAuthAccount(null);
      return;
    }
    setAuthAccount(await getSupabaseAuthAccount());
  };

  const signInWithGoogle = async () => {
    await googleSignIn();
    if (Platform.OS === 'web') return;

    await prepareSupabaseUser();

    if (await consumeSkipOnboardingAfterFullReset()) {
      await markOnboardingComplete();
      await refreshAuthAccount();
      await refreshUser();
      return;
    }

    await mergeProgressOnOpen();
    await refreshAuthAccount();
    await refreshUser();
  };

  const signOutAccount = async () => {
    await signOutFromGoogle();
    setAuthAccount(null);
    setUser(null);
  };

  useEffect(() => {
    let unsubscribeAuth = () => {};

    void (async () => {
      try {
        logSupabaseConfigDebug();
        if (isSupabaseEnabled()) {
          await refreshAuthAccount();
          const account = await getSupabaseAuthAccount();
          if (account) {
            try {
              await prepareSupabaseUser();
              void mergeProgressOnOpen();
            } catch (err) {
              console.error('[AppContext] prepareSupabaseUser failed:', err);
            }
          }

          unsubscribeAuth = onSupabaseAuthStateChange((session) => {
            if (session?.user) {
              setAuthAccount({
                id: session.user.id,
                email: session.user.email ?? null,
              });
              void prepareSupabaseUser()
                .then(async () => {
                  if (await isSkipOnboardingAfterFullReset()) {
                    await markOnboardingComplete();
                  } else {
                    await mergeProgressOnOpen();
                  }
                  await refreshUser();
                })
                .catch((err) => {
                  console.error('[AppContext] prepareSupabaseUser on auth change:', err);
                });
            } else {
              setAuthAccount(null);
              setUser(null);
            }
          });
        }
        await refreshUser();
      } finally {
        setLoading(false);
      }
    })();

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isSupabaseEnabled() || !authAccount) return;

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        void pushProgressToCloud();
      }
    });

    return () => sub.remove();
  }, [authAccount]);

  const setSkin = async (skinId: SkinId) => {
    await updateSelectedSkin(skinId);
    await refreshUser();
  };

  const setTreeViewMode = async (mode: TreeViewMode) => {
    await updateTreeViewMode(mode);
    await refreshUser();
  };

  const setPracticeReminder = async (enabled: boolean, hour: number) => {
    await updatePracticeReminder(enabled, hour);
    if (enabled) {
      await schedulePracticeReminder(hour);
    } else {
      await cancelPracticeReminder();
    }
    await refreshUser();
  };

  const theme = getTheme(user?.selectedSkin ?? 'rpg');
  const storageMode = getStorageMode();

  return (
    <AppContext.Provider
      value={{
        user,
        authAccount,
        theme,
        loading,
        storageMode,
        refreshUser,
        refreshAuthAccount,
        signInWithGoogle,
        signOutAccount,
        setSkin,
        setTreeViewMode,
        setPracticeReminder,
      }}
    >
      <SkinFadeWrapper skinId={user?.selectedSkin ?? 'rpg'}>{children}</SkinFadeWrapper>
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext debe usarse dentro de AppProvider');
  return ctx;
}
