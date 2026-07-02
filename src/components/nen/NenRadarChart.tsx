import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  FeGaussianBlur,
  Filter,
  G,
  Line,
  Path,
  Polygon,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import {
  NEN_PALETA,
  NEN_AXIS_LABELS,
  NenAxisId,
  NenProfile,
  getDominantNenAxis,
} from '@/src/config/nenConfig';

const DEFAULT_SIZE = 248;
const AXIS_COUNT = 6;

interface ChartLayout {
  size: number;
  cx: number;
  cy: number;
  maxR: number;
  labelR: number;
  svgSize: number;
}

function buildChartLayout(size: number, showLabels: boolean): ChartLayout {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * (84 / DEFAULT_SIZE);
  const labelR = maxR + size * (42 / DEFAULT_SIZE);
  const labelPad = showLabels ? Math.round(size * 0.13) : 0;
  const svgSize = size + labelPad * 2;
  return { size, cx: cx + labelPad, cy: cy + labelPad, maxR, labelR, svgSize };
}

export function getNenRadarFootprintSize(chartSize: number, showLabels = true): number {
  const labelPad = showLabels ? Math.round(chartSize * 0.13) : 0;
  return chartSize + labelPad * 2;
}

const GRID_STROKE = 'rgba(200, 220, 255, 0.15)';
const SPOKE_STROKE = 'rgba(200, 220, 255, 0.18)';
const EDGE_STROKE_MUTED = 'rgba(145, 155, 170, 0.55)';
const VERTEX_FILL_MUTED = 'rgba(150, 160, 175, 0.85)';
const DOMINANT_GLOW = '#f0abfc';

const GRID_RING_COUNT = 6;
/** Niveles 1/6 … 6/6 — Gen 6 (exterior) = Hito Crítico. */
const GRID_LEVELS = Array.from({ length: GRID_RING_COUNT }, (_, index) => (index + 1) / GRID_RING_COUNT);
const GRID_STROKE_CRITICAL = 'rgba(212, 175, 55, 0.42)';
const GRID_STROKE_DEFAULT = GRID_STROKE;
const FLOW_DURATION_MS = 880;

const AXIS_ORDER: NenAxisId[] = [
  'intensification',
  'manipulation',
  'emission',
  'materialization',
  'transformation',
  'specialization',
];

const AXIS_LABEL_UPPER: Record<NenAxisId, string> = {
  intensification: 'INTENSIFICACIÓN',
  emission: 'EMISIÓN',
  specialization: 'ESPECIALIZACIÓN',
  materialization: 'MATERIALIZACIÓN',
  manipulation: 'MANIPULACIÓN',
  transformation: 'TRANSFORMACIÓN',
};

const HATSU_SIGIL_PATHS: Record<NenAxisId, string> = {
  intensification: 'M0,-14 L0,14 M-10,-4 L10,-4 M-7,8 L7,8',
  emission: 'M-14,0 L14,0 M6,-10 L14,0 L6,10 M-6,-10 L-14,0 L-6,10',
  manipulation: 'M0,-12 A12,12 0 1,1 0,12 A12,12 0 1,1 0,-12 M0,-6 A6,6 0 1,0 0,6 A6,6 0 1,0 0,-6',
  materialization: 'M-10,-10 L10,-10 L14,0 L10,10 L-10,10 L-14,0 Z M-5,-5 L5,5 M5,-5 L-5,5',
  specialization: 'M0,-14 L12,7 L-12,7 Z M0,-6 L0,6',
  transformation: 'M-12,-4 Q0,-16 12,-4 Q4,0 12,4 Q0,16 -12,4 Q-4,0 -12,-4',
};

function axisAngle(index: number): number {
  return -Math.PI / 2 + (index * 2 * Math.PI) / AXIS_COUNT;
}

function polarPoint(layout: ChartLayout, index: number, radius: number) {
  const angle = axisAngle(index);
  return {
    x: layout.cx + radius * Math.cos(angle),
    y: layout.cy + radius * Math.sin(angle),
  };
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function profileToRatios(profile: NenProfile): number[] {
  return AXIS_ORDER.map((axisId) => clampRatio(profile[axisId] / 100));
}

function buildPolygonPoints(layout: ChartLayout, ratios: number[]): string {
  return ratios
    .map((ratio, index) => {
      const point = polarPoint(layout, index, layout.maxR * ratio);
      return `${point.x},${point.y}`;
    })
    .join(' ');
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface NenRadarChartProps {
  profile: NenProfile;
  accentColor?: string;
  glowColor?: string;
  size?: number;
  showLabels?: boolean;
  celebratingAxis?: NenAxisId | null;
  celebrationTick?: number;
  hatsuLabel?: string;
  /** Ejes con decay activo o enfriamiento — trazo más apagado en esos vértices. */
  coolingAxes?: Partial<Record<NenAxisId, boolean>>;
}

export function NenRadarChart({
  profile,
  accentColor: _accentColor,
  glowColor = DOMINANT_GLOW,
  size = DEFAULT_SIZE,
  showLabels = true,
  celebratingAxis = null,
  celebrationTick = 0,
  hatsuLabel,
  coolingAxes,
}: NenRadarChartProps) {
  const layout = useMemo(() => buildChartLayout(size, showLabels), [size, showLabels]);
  const targetRatios = useMemo(() => profileToRatios(profile), [profile]);
  const [displayRatios, setDisplayRatios] = useState<number[]>(targetRatios);
  const displayRatiosRef = useRef(displayRatios);
  displayRatiosRef.current = displayRatios;

  const [celebrationLabelOpacity, setCelebrationLabelOpacity] = useState(0);

  useEffect(() => {
    if (!celebratingAxis || !celebrationTick) return;
    setCelebrationLabelOpacity(1);
    const fade = setTimeout(() => setCelebrationLabelOpacity(0), 1800);
    return () => clearTimeout(fade);
  }, [celebratingAxis, celebrationTick]);

  useEffect(() => {
    const from = displayRatiosRef.current;
    const to = targetRatios;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / FLOW_DURATION_MS);
      const eased = easeInOutCubic(progress);
      setDisplayRatios(from.map((value, index) => value + (to[index] - value) * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [targetRatios]);

  const dominant = getDominantNenAxis(profile);
  const dominantPaleta = NEN_PALETA[dominant];
  const auraFill = dominantPaleta.colorGlow;
  const auraStroke = dominantPaleta.color;
  const auraGlow = dominantPaleta.colorGlow;
  const polygonPoints = buildPolygonPoints(layout, displayRatios);
  const vertexPoints = displayRatios.map((ratio, index) =>
    polarPoint(layout, index, layout.maxR * ratio)
  );
  const celebratingIndex =
    celebratingAxis != null ? AXIS_ORDER.indexOf(celebratingAxis) : -1;
  const celebrationPoint =
    celebratingIndex >= 0 ? vertexPoints[celebratingIndex] : null;
  const labelFontSize = size >= 320 ? 10 : 5.5;
  const dominantLabelFontSize = size >= 320 ? 11 : 6;

  return (
    <View style={[styles.wrap, { width: layout.svgSize, height: layout.svgSize }]} pointerEvents="none">
      <Svg width={layout.svgSize} height={layout.svgSize} viewBox={`0 0 ${layout.svgSize} ${layout.svgSize}`}>
        <Defs>
          <Filter id="nenStrokeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <FeGaussianBlur in="SourceGraphic" stdDeviation="2.2" />
          </Filter>
          <Filter id="nenDominantLabelGlow" x="-50%" y="-50%" width="200%" height="200%">
            <FeGaussianBlur in="SourceGraphic" stdDeviation="1.1" />
          </Filter>
        </Defs>

        {GRID_LEVELS.map((level) => {
          const isCriticalRing = level >= 1 - 1e-6;
          const points = AXIS_ORDER.map((_, index) => polarPoint(layout, index, layout.maxR * level))
            .map((p) => `${p.x},${p.y}`)
            .join(' ');
          return (
            <Polygon
              key={`grid-${level}`}
              points={points}
              fill="none"
              stroke={isCriticalRing ? GRID_STROKE_CRITICAL : GRID_STROKE_DEFAULT}
              strokeWidth={isCriticalRing ? 1.1 : 0.75}
            />
          );
        })}

        {AXIS_ORDER.map((axisId, index) => {
          const outer = polarPoint(layout, index, layout.maxR);
          return (
            <Line
              key={`spoke-${axisId}`}
              x1={layout.cx}
              y1={layout.cy}
              x2={outer.x}
              y2={outer.y}
              stroke={SPOKE_STROKE}
              strokeWidth={0.65}
            />
          );
        })}

        <Polygon
          points={polygonPoints}
          fill={auraFill}
          stroke="none"
        />

        <Polygon
          points={polygonPoints}
          fill="none"
          stroke={auraGlow}
          strokeWidth={4}
          strokeOpacity={0.14}
          filter="url(#nenStrokeGlow)"
        />

        <Polygon
          points={polygonPoints}
          fill="none"
          stroke={auraStroke}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {displayRatios.map((ratio, index) => {
          const axisId = AXIS_ORDER[index];
          if (!coolingAxes?.[axisId]) return null;
          const nextIndex = (index + 1) % AXIS_COUNT;
          const p1 = polarPoint(layout, index, layout.maxR * ratio);
          const p2 = polarPoint(layout, nextIndex, layout.maxR * displayRatios[nextIndex]);
          return (
            <Line
              key={`cool-edge-${axisId}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={EDGE_STROKE_MUTED}
              strokeWidth={2.6}
              strokeLinecap="round"
            />
          );
        })}

        {vertexPoints.map((point, index) => {
          const axisId = AXIS_ORDER[index];
          const isCooling = Boolean(coolingAxes?.[axisId]);
          return (
          <Circle
            key={`vertex-${axisId}`}
            cx={point.x}
            cy={point.y}
            r={index === celebratingIndex && celebrationTick ? 8 : 3.5}
            fill={
              index === celebratingIndex && celebrationTick
                ? glowColor
                : isCooling
                  ? VERTEX_FILL_MUTED
                  : auraStroke
            }
            stroke="#0a0e14"
            strokeWidth={1}
            opacity={index === celebratingIndex && celebrationTick ? 0.95 : 1}
          />
        );
        })}

        {celebrationPoint && celebrationTick ? (
          <>
            <Circle
              cx={celebrationPoint.x}
              cy={celebrationPoint.y}
              r={18}
              fill="none"
              stroke={glowColor}
              strokeWidth={2}
              opacity={0.55}
            />
            <Circle
              cx={celebrationPoint.x}
              cy={celebrationPoint.y}
              r={32}
              fill="none"
              stroke={glowColor}
              strokeWidth={1.2}
              opacity={0.28}
            />
          </>
        ) : null}

        <G opacity={0.3} transform={`translate(${layout.cx}, ${layout.cy})`}>
          <Path
            d={HATSU_SIGIL_PATHS[dominant]}
            fill="none"
            stroke={glowColor}
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>

        <Circle cx={layout.cx} cy={layout.cy} r={2} fill={auraStroke} opacity={0.45} />

        {showLabels &&
          AXIS_ORDER.map((axisId, index) => {
            const labelPoint = polarPoint(layout, index, layout.labelR);
            const isDominant = axisId === dominant;
            const axisColor = NEN_PALETA[axisId].colorText;
            return (
              <SvgText
                key={`label-${axisId}`}
                x={labelPoint.x}
                y={labelPoint.y}
                fill={isDominant ? axisColor : `${axisColor}CC`}
                fontSize={isDominant ? dominantLabelFontSize : labelFontSize}
                fontWeight={isDominant ? '800' : '600'}
                letterSpacing={0.5}
                textAnchor="middle"
                alignmentBaseline="middle"
                opacity={isDominant ? 1 : 0.88}
                filter={isDominant ? 'url(#nenDominantLabelGlow)' : undefined}
              >
                {AXIS_LABEL_UPPER[axisId]}
              </SvgText>
            );
          })}
      </Svg>
      {hatsuLabel ? (
        <View pointerEvents="none" style={[styles.hatsuLabelWrap, { top: layout.cy + layout.maxR * 0.42 }]}>
          <Text style={styles.hatsuLabelText}>{hatsuLabel}</Text>
        </View>
      ) : null}
      {celebratingAxis && celebrationLabelOpacity > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.celebrationLabel,
            {
              opacity: celebrationLabelOpacity,
              top: layout.cy - size * 0.22,
            },
          ]}
        >
          <Text style={styles.celebrationLabelText}>
            {AXIS_LABEL_UPPER[celebratingAxis]} ▲
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  celebrationLabelText: {
    color: '#f5e6ff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.2,
    textShadowColor: '#c084fc',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  hatsuLabelWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hatsuLabelText: {
    color: 'rgba(220, 230, 255, 0.72)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
});

export { NEN_AXIS_LABELS, getDominantNenAxis };
