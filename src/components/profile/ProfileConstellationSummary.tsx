import { StyleSheet, View } from 'react-native';

import { AppTheme, MacroArea, SkillNode, User } from '@/src/types';
import { averageDecayRatioForArea } from '@/src/utils/decayRatio';
import { ROOT_BASE_HUE } from '@/src/utils/nodeColors';

interface ProfileConstellationSummaryProps {
  nodes: SkillNode[];
  user: User;
  theme: AppTheme;
}

const AREAS: MacroArea[] = ['physical', 'intellectual', 'mental_emotional', 'productive'];

function hslFromRatio(hue: number, ratio: number): string {
  const saturation = 20 + ratio * 44;
  const lightness = 28 + ratio * 18;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function ProfileConstellationSummary({
  nodes,
  user,
  theme,
}: ProfileConstellationSummaryProps) {
  return (
    <View style={[styles.container, { backgroundColor: theme.background, borderColor: theme.primary }]}>
      {AREAS.map((area) => {
        const ratio = averageDecayRatioForArea(nodes, user, area);
        const hue = ROOT_BASE_HUE[area];
        const color = hslFromRatio(hue, ratio);

        return (
          <View key={area} style={styles.item}>
            <View
              style={[
                styles.orb,
                {
                  backgroundColor: color,
                  shadowColor: color,
                  opacity: 0.35 + ratio * 0.65,
                },
              ]}
            />
            <View style={[styles.glow, { backgroundColor: color, opacity: ratio * 0.25 }]} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
  },
  orb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 1,
  },
  glow: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
});
