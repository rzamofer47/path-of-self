import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  DecayCategoryPicker,
  DEFAULT_DECAY_CATEGORIA,
} from '@/src/components/nen/DecayCategoryPicker';
import { DecayCategoria } from '@/src/types';
import { AppTheme } from '@/src/types';
import { MENU_ROW_HEIGHT } from './NodeRadialMenu';

interface WildcardSelectionPanelProps {
  accentColor: string;
  theme: AppTheme;
  onSave: (name: string, decayCategoria: DecayCategoria) => void;
  onCancel: () => void;
}

export function WildcardSelectionPanel({
  accentColor,
  theme,
  onSave,
  onCancel,
}: WildcardSelectionPanelProps) {
  const [value, setValue] = useState('');
  const [decayCategoria, setDecayCategoria] = useState<DecayCategoria | null>(null);

  const handleSave = () => {
    onSave(value, decayCategoria ?? DEFAULT_DECAY_CATEGORIA);
  };

  return (
    <View style={styles.panel} pointerEvents="auto">
      <Text style={[styles.title, { color: accentColor }]}>Elige tu disciplina</Text>
      <Text style={[styles.hint, { color: theme.textMuted }]}>
        Ej.: Karate, Guitarra, Meditación…
      </Text>
      <TextInput
        style={[styles.input, { color: theme.text, borderColor: accentColor }]}
        placeholder="Nombre personalizado"
        placeholderTextColor={theme.textMuted}
        value={value}
        onChangeText={setValue}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleSave}
      />
      <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
        <DecayCategoryPicker
          theme={theme}
          value={decayCategoria}
          onChange={setDecayCategoria}
          accentColor={accentColor}
          compact
        />
      </ScrollView>
      <View style={styles.actions}>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Text style={[styles.cancel, { color: theme.textMuted }]}>Cancelar</Text>
        </Pressable>
        <Pressable
          style={[styles.saveBtn, { backgroundColor: accentColor }]}
          onPress={handleSave}
        >
          <Text style={styles.saveText}>Forjar camino</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: 280,
    maxHeight: 420,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(6, 8, 12, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 39, 0.45)',
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 4,
    textAlign: 'center',
  },
  hint: {
    fontSize: 9,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#030508',
    marginBottom: 8,
  },
  pickerScroll: {
    maxHeight: 220,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancel: {
    fontSize: 11,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  saveText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
  },
});

export const WILDCARD_PANEL_HEIGHT = MENU_ROW_HEIGHT + 280;
