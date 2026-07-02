import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  LinearGradient,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { hexToHsl, hslToHex } from '@/src/utils/nodeColors';
import type { NenDestelloPattern } from '@/src/config/nenFirmas';
import type { RoutineIntensity } from '@/src/utils/nodeIntensity';
import type { XpFeedbackEventType } from '@/src/utils/xpFeedback';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Gris neutro hacia el que converge el aura al enfriarse. */
const DECAY_NEUTRAL = '#6a7588';
const MIN_SATURATION = 20;

export const ORB_VISUAL_SIZE = 58;
const CX = ORB_VISUAL_SIZE / 2;
const CY = ORB_VISUAL_SIZE / 2;
const ORB_INNER_R = 19;
const TICKS = 12;

/** Mezcla HSL del color de vertiente hacia gris neutro según frescura (1 = pleno). */
function adjustColorForFreshness(hex: string, freshness: number): string {
  const source = hexToHsl(hex);
  const neutral = hexToHsl(DECAY_NEUTRAL);
  const fade = 1 - Math.min(1, Math.max(0, freshness));

  const h = source.h + (neutral.h - source.h) * fade * 0.4;
  const s = source.s + (neutral.s - source.s) * fade;
  const l = source.l + (neutral.l - source.l) * fade * 0.3;

  return hslToHex(h, Math.max(MIN_SATURATION, s), l);
}

interface OrbVisualProps {
  rune: string;
  borderColor: string;
  glowColor: string;
  accentSecondary: string;
  /** Menú abierto o arrastre — realce de interacción, no rutina. */
  isActive: boolean;
  isGuide: boolean;
  isShadow?: boolean;
  isWildcard?: boolean;
  /** Activo en la rutina del usuario (brillo pleno) vs pausado/inactivo (tenue). */
  routineIntensity?: RoutineIntensity;
  unlocked: boolean;
  decayRatio?: number;
  /** Vista lejana: círculo simple sin SVG, runas ni resplandor. */
  simplified?: boolean;
  /** Incrementar para disparar destello al registrar XP. */
  xpFlashTick?: number;
  /** Tipo de feedback visual asociado al destello. */
  xpFlashKind?: XpFeedbackEventType;
  /** Color Hatsu cuando el nodo está en estado fresh (check activo). */
  hatsuAuraColor?: string;
  destelloPattern?: NenDestelloPattern;
  auraPulseMs?: number;
  /** Relleno del núcleo del orbe (p. ej. nodos madre). */
  coreFill?: string;
}

export function OrbVisual({
  rune,
  borderColor,
  glowColor,
  accentSecondary,
  isActive,
  isGuide,
  isShadow = false,
  isWildcard = false,
  routineIntensity = 'active',
  unlocked,
  decayRatio = 1,
  simplified = false,
  xpFlashTick = 0,
  xpFlashKind = 'levelUp',
  hatsuAuraColor,
  destelloPattern = 'cruz',
  auraPulseMs,
  coreFill,
}: OrbVisualProps) {
  const ratio = Math.min(1, Math.max(0, decayRatio));
  const routineActive = routineIntensity === 'active';
  const shadowBorder = '#525a68';
  const shadowGlow = '#343a46';
  const shadowAccent = '#3d4452';
  const adjustedGlow = useMemo(
    () =>
      isShadow
        ? shadowGlow
        : hatsuAuraColor ?? adjustColorForFreshness(glowColor, ratio),
    [isShadow, glowColor, ratio, hatsuAuraColor]
  );
  const adjustedBorder = useMemo(
    () =>
      isShadow
        ? shadowBorder
        : hatsuAuraColor ?? adjustColorForFreshness(borderColor, ratio),
    [isShadow, borderColor, ratio, hatsuAuraColor]
  );
  const adjustedAccent = useMemo(
    () => (isShadow ? shadowAccent : adjustColorForFreshness(accentSecondary, ratio)),
    [isShadow, accentSecondary, ratio]
  );

  const rayLen = useSharedValue(0);
  const rayOpacity = useSharedValue(0);
  const pulseRadius = useSharedValue(ORB_INNER_R);
  const pulseOpacity = useSharedValue(0);
  const auraPulseOpacity = useSharedValue(0.16);

  useEffect(() => {
    if (!hatsuAuraColor || !auraPulseMs) return;
    auraPulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.34, { duration: auraPulseMs / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.12, { duration: auraPulseMs / 2, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [hatsuAuraColor, auraPulseMs, auraPulseOpacity]);

  useEffect(() => {
    if (xpFlashTick <= 0) return;

    if (xpFlashKind === 'generationComplete' || destelloPattern === 'onda') {
      pulseRadius.value = ORB_INNER_R;
      pulseOpacity.value = 0.85;
      pulseRadius.value = withSequence(
        withTiming(ORB_INNER_R + 18, { duration: 420, easing: Easing.out(Easing.quad) }),
        withTiming(ORB_INNER_R + 24, { duration: 180, easing: Easing.in(Easing.quad) })
      );
      pulseOpacity.value = withSequence(
        withTiming(0.85, { duration: 80 }),
        withTiming(0, { duration: 520, easing: Easing.in(Easing.quad) })
      );
      return;
    }

    if (xpFlashKind !== 'levelUp' && destelloPattern !== 'flash') return;

    if (destelloPattern === 'flash') {
      pulseOpacity.value = 0.55;
      pulseOpacity.value = withSequence(
        withTiming(0.55, { duration: 60 }),
        withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) })
      );
      return;
    }

    if (destelloPattern === 'cristal') {
      rayLen.value = 0;
      rayOpacity.value = 0.85;
      rayLen.value = withSequence(
        withTiming(13, { duration: 130, easing: Easing.out(Easing.quad) }),
        withTiming(5, { duration: 180, easing: Easing.in(Easing.quad) })
      );
      rayOpacity.value = withSequence(
        withTiming(0.85, { duration: 80 }),
        withTiming(0, { duration: 230, easing: Easing.in(Easing.quad) })
      );
      return;
    }

    if (destelloPattern === 'espiral') {
      pulseRadius.value = ORB_INNER_R;
      pulseOpacity.value = 0.7;
      pulseRadius.value = withTiming(ORB_INNER_R + 16, {
        duration: 360,
        easing: Easing.out(Easing.cubic),
      });
      pulseOpacity.value = withTiming(0, { duration: 360, easing: Easing.in(Easing.quad) });
      return;
    }

    if (xpFlashKind !== 'levelUp') return;

    rayLen.value = 0;
    rayOpacity.value = 0.9;
    rayLen.value = withSequence(
      withTiming(11, { duration: 110, easing: Easing.out(Easing.quad) }),
      withTiming(4, { duration: 170, easing: Easing.in(Easing.quad) })
    );
    rayOpacity.value = withSequence(
      withTiming(0.9, { duration: 70 }),
      withTiming(0, { duration: 210, easing: Easing.in(Easing.quad) })
    );
  }, [xpFlashTick, xpFlashKind, destelloPattern, rayLen, rayOpacity, pulseRadius, pulseOpacity]);

  const auraPulseProps = useAnimatedProps(() => ({
    fillOpacity: auraPulseOpacity.value,
  }));

  const pulseProps = useAnimatedProps(() => ({
    r: pulseRadius.value,
    strokeOpacity: pulseOpacity.value,
  }));

  const rayNorthProps = useAnimatedProps(() => ({
    x2: CX,
    y2: CY - rayLen.value,
    strokeOpacity: rayOpacity.value,
  }));
  const raySouthProps = useAnimatedProps(() => ({
    x2: CX,
    y2: CY + rayLen.value,
    strokeOpacity: rayOpacity.value,
  }));
  const rayEastProps = useAnimatedProps(() => ({
    x2: CX + rayLen.value,
    y2: CY,
    strokeOpacity: rayOpacity.value,
  }));
  const rayWestProps = useAnimatedProps(() => ({
    x2: CX - rayLen.value,
    y2: CY,
    strokeOpacity: rayOpacity.value,
  }));

  if (simplified) {
    const dotColor = isShadow ? shadowBorder : adjustedBorder;
    return (
      <View style={styles.simpleDotWrap} pointerEvents="none">
        <View
          style={[
            styles.simpleDot,
            {
              backgroundColor: dotColor,
              opacity: isShadow ? 0.55 : routineActive ? 0.92 : 0.72,
              borderColor: isShadow ? '#3a4048' : adjustedAccent,
            },
          ]}
          pointerEvents="none"
        />
      </View>
    );
  }

  const gradId = `orb-border-${rune}-${adjustedBorder.replace('#', '')}`;
  const innerId = `orb-inner-${rune}`;
  const neonId = `orb-neon-${rune}-${adjustedGlow.replace('#', '')}`;
  const clipId = `orb-clip-${rune}`;

  const opacity = isShadow
    ? isActive
      ? 0.72
      : 0.38
    : routineActive
      ? unlocked
        ? 0.92
        : 0.85
      : isWildcard
        ? 0.58
        : 0.4;

  const ringStroke = isShadow ? '#5a6270' : routineActive || ratio >= 0.3 ? adjustedBorder : '#6a7588';
  const innerNeonActive = routineActive && !isShadow;

  return (
    <View style={[styles.wrap, { opacity }]} pointerEvents="none">
      <Svg
        width={ORB_VISUAL_SIZE}
        height={ORB_VISUAL_SIZE}
        pointerEvents="none"
        style={styles.svg}
      >
        <Defs>
          <ClipPath id={clipId}>
            <Circle cx={CX} cy={CY} r={ORB_INNER_R} />
          </ClipPath>
          <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={adjustedGlow} stopOpacity="1" />
            <Stop offset="50%" stopColor={adjustedBorder} stopOpacity="1" />
            <Stop offset="100%" stopColor={adjustedAccent} stopOpacity="0.9" />
          </LinearGradient>
          <RadialGradient id={innerId} cx="50%" cy="45%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="#141a24" stopOpacity="1" />
            <Stop offset="100%" stopColor="#06080c" stopOpacity="1" />
          </RadialGradient>
          <RadialGradient id={neonId} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={adjustedGlow} stopOpacity="0.55" />
            <Stop offset="45%" stopColor={adjustedGlow} stopOpacity="0.22" />
            <Stop offset="78%" stopColor={adjustedBorder} stopOpacity="0.08" />
            <Stop offset="100%" stopColor={adjustedBorder} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <Circle
          cx={CX}
          cy={CY}
          r={27}
          fill="none"
          stroke={ringStroke}
          strokeWidth={0.7}
          strokeOpacity={isShadow ? 0.28 : innerNeonActive ? 0.35 : 0.2}
          strokeDasharray={isShadow ? '3 5' : '2 4'}
        />

        {Array.from({ length: TICKS }).map((_, i) => {
          const angle = (i * 2 * Math.PI) / TICKS - Math.PI / 2;
          const r1 = 23.5;
          const r2 = 26.5;
          return (
            <Line
              key={`tick-${i}`}
              x1={CX + r1 * Math.cos(angle)}
              y1={CY + r1 * Math.sin(angle)}
              x2={CX + r2 * Math.cos(angle)}
              y2={CY + r2 * Math.sin(angle)}
              stroke={ringStroke}
              strokeWidth={0.65}
              strokeOpacity={isShadow ? 0.22 : innerNeonActive ? 0.4 : 0.15}
              strokeLinecap="round"
            />
          );
        })}

        <Circle
          cx={CX}
          cy={CY}
          r={20}
          fill={`url(#${innerId})`}
          stroke={`url(#${gradId})`}
          strokeWidth={isShadow ? 2 : isGuide || isActive ? 2.8 : 2.2}
          strokeOpacity={isShadow ? 0.55 : 1}
        />

        <G clipPath={`url(#${clipId})`}>
          {innerNeonActive && (
            <>
              <Circle cx={CX} cy={CY} r={ORB_INNER_R} fill={`url(#${neonId})`} />
              <AnimatedCircle
                cx={CX}
                cy={CY}
                r={ORB_INNER_R * 0.72}
                fill={adjustedGlow}
                animatedProps={hatsuAuraColor ? auraPulseProps : undefined}
              />
              <Circle cx={CX} cy={CY} r={ORB_INNER_R * 0.35} fill={adjustedGlow} fillOpacity={0.16} />
            </>
          )}

          {(xpFlashKind === 'levelUp' || destelloPattern === 'cristal') && xpFlashTick > 0 && (
            <G>
              {[0, 90, 180, 270].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);
                const props =
                  deg === 0
                    ? rayNorthProps
                    : deg === 180
                      ? raySouthProps
                      : deg === 90
                        ? rayEastProps
                        : rayWestProps;
                return (
                  <AnimatedLine
                    key={`ray-${deg}`}
                    x1={CX}
                    y1={CY}
                    x2={CX + cos * 4}
                    y2={CY + sin * 4}
                    stroke={adjustedGlow}
                    strokeWidth={destelloPattern === 'cristal' ? 1.6 : 2}
                    strokeLinecap="round"
                    animatedProps={props}
                  />
                );
              })}
            </G>
          )}

          {(xpFlashKind === 'generationComplete' || destelloPattern === 'onda') && xpFlashTick > 0 && (
            <AnimatedCircle
              cx={CX}
              cy={CY}
              r={ORB_INNER_R}
              fill="none"
              stroke={adjustedGlow}
              strokeWidth={2.5}
              animatedProps={pulseProps}
            />
          )}
        </G>

        <Circle
          cx={CX}
          cy={CY}
          r={16.5}
          fill={coreFill ?? (isShadow ? '#0a0c10' : '#06080c')}
          fillOpacity={isShadow ? 0.92 : innerNeonActive ? 0.78 : 0.85}
        />

        <G opacity={isShadow ? 0.14 : innerNeonActive ? 0.25 : 0.1}>
          {[0, 90, 180, 270].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <Circle
                key={`rune-dot-${deg}`}
                cx={CX + 18 * Math.cos(rad)}
                cy={CY + 18 * Math.sin(rad)}
                r={0.9}
                fill={adjustedBorder}
              />
            );
          })}
        </G>

        <SvgText
          x={CX}
          y={CY + 6}
          fill={adjustedBorder}
          fontSize={17}
          fontWeight="700"
          textAnchor="middle"
          opacity={isShadow ? 0.45 : 1}
        >
          {rune}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: ORB_VISUAL_SIZE,
    height: ORB_VISUAL_SIZE,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    elevation: 0,
  },
  svg: {
    backgroundColor: 'transparent',
  },
  simpleDotWrap: {
    width: ORB_VISUAL_SIZE,
    height: ORB_VISUAL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    elevation: 0,
  },
  simpleDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
});
