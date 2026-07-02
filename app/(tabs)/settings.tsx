import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAppContext } from '@/src/context/AppContext';
import { getAllNodes, shareProgressExport, syncProgressNow } from '@/src/database/queryEngine';
import { isSupabaseEnabled } from '@/src/config/env';
import { syncCoolingAlerts } from '@/src/hooks/usePracticeReminder';
import {
  getCoolingAlertsEnabled,
  setCoolingAlertsEnabled,
  setTutorialCompleted,
} from '@/src/storage/localPrefs';
import { themes } from '@/src/themes';
import { SkinId } from '@/src/types';

export default function SettingsScreen() {
  const { theme, user, setSkin, setPracticeReminder, storageMode, authAccount, signOutAccount } =
    useAppContext();
  const router = useRouter();

  const SKIN_IDS: SkinId[] = ['rpg', 'cyberpunk', 'minimal'];
  const [reminderHour, setReminderHour] = useState(user?.practiceReminderHour ?? 9);
  const [coolingAlerts, setCoolingAlerts] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const supabaseReady = isSupabaseEnabled();

  useEffect(() => {
    void getCoolingAlertsEnabled().then(setCoolingAlerts);
  }, []);

  const handleCoolingToggle = async (enabled: boolean) => {
    setCoolingAlerts(enabled);
    await setCoolingAlertsEnabled(enabled);
    if (enabled) {
      const nodes = await getAllNodes();
      await syncCoolingAlerts(nodes.filter((n) => !n.isDeleted && n.id > 0));
    }
  };

  const handleSyncNow = async () => {
    if (!supabaseReady) {
      Alert.alert('Supabase', 'Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.');
      return;
    }
    setSyncing(true);
    try {
      const result = await syncProgressNow();
      Alert.alert(result.ok ? 'Sincronización' : 'Error', result.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await shareProgressExport();
      if (!result.ok) Alert.alert('Exportar', result.message);
    } finally {
      setExporting(false);
    }
  };

  const handleReplayTutorial = async () => {
    await setTutorialCompleted(false);
    router.push('/tutorial');
  };

  const handleSignOut = async () => {
    try {
      await signOutAccount();
      router.replace('/login');
    } catch (err) {
      Alert.alert(
        'Cerrar sesión',
        err instanceof Error ? err.message : 'No se pudo cerrar la sesión'
      );
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.header, { color: theme.text }]}>Configuración</Text>

      {supabaseReady ? (
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Cuenta Google</Text>
          {authAccount ? (
            <>
              <Text style={[styles.accountEmail, { color: theme.text }]}>
                {authAccount.email ?? 'Sesión activa'}
              </Text>
              <Text style={[styles.sectionDesc, { color: theme.textMuted }]}>
                Tu progreso se sincroniza con esta cuenta en todos tus dispositivos.
              </Text>
              <Pressable
                style={[styles.actionBtn, { borderColor: theme.textMuted }]}
                onPress={() => void handleSignOut()}
              >
                <Text style={[styles.actionBtnText, { color: theme.text }]}>Cerrar sesión</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.sectionDesc, { color: theme.textMuted }]}>
                Inicia sesión para respaldar y recuperar tu progreso entre laptop y móvil.
              </Text>
              <Pressable
                style={[styles.actionBtn, { borderColor: theme.primary }]}
                onPress={() => router.push('/login')}
              >
                <Text style={[styles.actionBtnText, { color: theme.primary }]}>
                  Iniciar sesión con Google
                </Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Almacenamiento</Text>
        <View
          style={[
            styles.syncBadge,
            {
              backgroundColor: theme.background,
              borderColor: theme.textMuted,
            },
          ]}
        >
          <Text style={[styles.syncLabel, { color: theme.text }]}>
            {authAccount ? '☁ Cuenta Google conectada' : supabaseReady ? '☁ Supabase listo' : '💾 Modo local activo'}
          </Text>
          <Text style={[styles.syncDesc, { color: theme.textMuted }]}>
            {Platform.OS === 'web'
              ? 'Datos en localStorage del navegador.'
              : 'Datos en SQLite del dispositivo.'}
            {supabaseReady
              ? ' El progreso se sincroniza con Supabase al abrir y al ir a segundo plano.'
              : storageMode === 'cloud'
                ? ' Modo nube legacy — añade variables Supabase para respaldo bidireccional.'
                : ' Añade credenciales Supabase para respaldo en la nube.'}
          </Text>
        </View>

        <Pressable
          style={[styles.actionBtn, { borderColor: theme.primary, opacity: syncing ? 0.6 : 1 }]}
          onPress={() => void handleSyncNow()}
          disabled={syncing}
        >
          <Text style={[styles.actionBtnText, { color: theme.primary }]}>
            {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionBtn, { borderColor: theme.textMuted, opacity: exporting ? 0.6 : 1 }]}
          onPress={() => void handleExport()}
          disabled={exporting}
        >
          <Text style={[styles.actionBtnText, { color: theme.text }]}>
            {exporting ? 'Exportando…' : 'Exportar progreso'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionBtn, { borderColor: theme.textMuted }]}
          onPress={() => void handleReplayTutorial()}
        >
          <Text style={[styles.actionBtnText, { color: theme.text }]}>Volver a ver el tutorial</Text>
        </Pressable>
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Skin Visual</Text>
        <Text style={[styles.sectionDesc, { color: theme.textMuted }]}>
          Elige la estética de tu árbol de habilidades
        </Text>

        {SKIN_IDS.map((skinId) => {
          const skin = themes[skinId];
          const isActive = user?.selectedSkin === skinId;

          return (
            <Pressable
              key={skinId}
              style={[
                styles.skinOption,
                {
                  borderColor: isActive ? theme.primary : theme.textMuted,
                  backgroundColor: skin.background,
                },
              ]}
              onPress={() => setSkin(skinId)}
            >
              <View style={styles.skinPreview}>
                <View style={[styles.previewDot, { backgroundColor: skin.primary }]} />
                <View style={[styles.previewDot, { backgroundColor: skin.secondary }]} />
                <View style={[styles.previewDot, { backgroundColor: skin.accent }]} />
              </View>
              <View style={styles.skinInfo}>
                <Text style={[styles.skinName, { color: skin.text }]}>{skin.name}</Text>
                {isActive && (
                  <Text style={[styles.activeBadge, { color: skin.primary }]}>Activa</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Horarios de Práctica</Text>
        <Text style={[styles.sectionDesc, { color: theme.textMuted }]}>
          Recordatorio diario según tu perfil de oxidación
        </Text>

        <View style={styles.reminderRow}>
          <Text style={[styles.reminderLabel, { color: theme.text }]}>Activar recordatorio</Text>
          <Switch
            value={user?.practiceReminderEnabled ?? false}
            onValueChange={(enabled) =>
              setPracticeReminder(enabled, reminderHour)
            }
            trackColor={{ false: theme.background, true: theme.primary }}
            disabled={Platform.OS === 'web'}
          />
        </View>

        {Platform.OS === 'web' && (
          <Text style={[styles.webNote, { color: theme.textMuted }]}>
            Notificaciones disponibles en Expo Go (móvil).
          </Text>
        )}

        <Text style={[styles.hourLabel, { color: theme.textMuted }]}>Hora del recordatorio</Text>
        <View style={styles.hourRow}>
          {[7, 9, 12, 18, 21].map((hour) => (
            <Pressable
              key={hour}
              style={[
                styles.hourChip,
                {
                  backgroundColor:
                    reminderHour === hour ? theme.primary : theme.background,
                  borderColor: theme.primary,
                },
              ]}
              onPress={() => {
                setReminderHour(hour);
                if (user?.practiceReminderEnabled) {
                  setPracticeReminder(true, hour);
                }
              }}
            >
              <Text
                style={{
                  color: reminderHour === hour ? '#fff' : theme.text,
                  fontWeight: '600',
                }}
              >
                {hour}:00
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Alertas de Enfriamiento</Text>
        <Text style={[styles.sectionDesc, { color: theme.textMuted }]}>
          Aviso cuando tus hábitos pasan a estado cooling o cold
        </Text>
        <View style={styles.reminderRow}>
          <Text style={[styles.reminderLabel, { color: theme.text }]}>
            Alertas de Enfriamiento
          </Text>
          <Switch
            value={coolingAlerts}
            onValueChange={(enabled) => {
              void handleCoolingToggle(enabled);
            }}
            trackColor={{ false: theme.background, true: theme.primary }}
            disabled={Platform.OS === 'web'}
          />
        </View>
        {Platform.OS === 'web' && (
          <Text style={[styles.webNote, { color: theme.textMuted }]}>
            Notificaciones disponibles en Expo Go (móvil).
          </Text>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Reglas de Oxidación</Text>
        <Text style={[styles.rule, { color: theme.textMuted }]}>
          Intelectual: 48h de gracia, -5% XP/día después
        </Text>
        <Text style={[styles.rule, { color: theme.textMuted }]}>
          Físico: 5 días de gracia, -2% XP/día, máx. 4 sesiones/semana
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    marginTop: 8,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: 16,
  },
  skinOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    marginBottom: 10,
  },
  skinPreview: {
    flexDirection: 'row',
    gap: 4,
    marginRight: 12,
  },
  previewDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  skinInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skinName: {
    fontSize: 15,
    fontWeight: '600',
  },
  activeBadge: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  viewOption: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    marginBottom: 10,
  },
  viewLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  viewDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  comingSoon: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  rule: {
    fontSize: 13,
    lineHeight: 22,
  },
  syncBadge: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  syncLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  syncDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  accountEmail: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  actionBtn: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reminderLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  webNote: {
    fontSize: 12,
    marginBottom: 12,
  },
  hourLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  hourRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hourChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
});
