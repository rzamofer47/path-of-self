import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DECAY_CATEGORIA_ORDER,
  DECAY_CATEGORIAS,
  DecayCategoria,
  DEFAULT_DECAY_CATEGORIA,
} from '@/src/config/nenDecayConfig';
import { AppTheme } from '@/src/types';

interface DecayCategoryPickerProps {
  theme: AppTheme;
  value: DecayCategoria | null;
  onChange: (value: DecayCategoria) => void;
  accentColor?: string;
  compact?: boolean;
}

export function DecayCategoryPicker({
  theme,
  value,
  onChange,
  accentColor,
  compact = false,
}: DecayCategoryPickerProps) {
  const selected = value ?? DEFAULT_DECAY_CATEGORIA;
  const accent = accentColor ?? theme.primary;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: theme.textMuted }]}>
        ¿Qué tipo de habilidad es esta?
      </Text>
      {DECAY_CATEGORIA_ORDER.map((categoria) => {
        const def = DECAY_CATEGORIAS[categoria];
        const isSelected = selected === categoria;
        return (
          <Pressable
            key={categoria}
            style={[
              styles.option,
              compact && styles.optionCompact,
              {
                borderColor: isSelected ? accent : 'rgba(255,255,255,0.12)',
                backgroundColor: isSelected ? `${accent}22` : 'rgba(255,255,255,0.03)',
              },
            ]}
            onPress={() => onChange(categoria)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
          >
            <View style={[styles.radio, { borderColor: isSelected ? accent : theme.textMuted }]}>
              {isSelected ? <View style={[styles.radioDot, { backgroundColor: accent }]} /> : null}
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, { color: theme.text }]}>{def.label}</Text>
              <Text style={[styles.optionDesc, { color: theme.textMuted }]}>{def.descripcion}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    marginTop: 4,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionCompact: {
    paddingVertical: 6,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 10,
    lineHeight: 13,
  },
});

export { DEFAULT_DECAY_CATEGORIA };
