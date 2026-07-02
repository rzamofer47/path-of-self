import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { CANVAS_HEIGHT, CANVAS_WIDTH, SPACE_BG, SPACE_CENTER } from '@/src/utils/treeLayout';

export function TreeSpaceBackground() {
  const cx = CANVAS_WIDTH / 2;
  const cy = CANVAS_HEIGHT / 2;

  return (
    <Svg
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        <RadialGradient
          id="spaceDepth"
          cx={cx}
          cy={cy}
          rx={CANVAS_WIDTH * 0.55}
          ry={CANVAS_HEIGHT * 0.55}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0%" stopColor={SPACE_CENTER} stopOpacity="1" />
          <Stop offset="42%" stopColor="#0a0d12" stopOpacity="1" />
          <Stop offset="100%" stopColor={SPACE_BG} stopOpacity="1" />
        </RadialGradient>
        <RadialGradient id="centerHalo" cx={cx} cy={cy} rx="420" ry="420" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#1a2540" stopOpacity="0.22" />
          <Stop offset="100%" stopColor={SPACE_BG} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <Rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="url(#spaceDepth)" />
      <Circle cx={cx} cy={cy} r={420} fill="url(#centerHalo)" />

      {Array.from({ length: 140 }).map((_, i) => {
        const x = ((i * 7919) % 997) / 997 * CANVAS_WIDTH;
        const y = ((i * 6271) % 983) / 983 * CANVAS_HEIGHT;
        const dist = Math.hypot(x - cx, y - cy) / (CANVAS_WIDTH * 0.5);
        const fade = Math.max(0.04, 0.22 - dist * 0.18);

        return (
          <Circle
            key={`star-${i}`}
            cx={x}
            cy={y}
            r={i % 13 === 0 ? 1.2 : i % 5 === 0 ? 0.7 : 0.35}
            fill={i % 9 === 0 ? '#c9d4e8' : '#8899aa'}
            opacity={fade * (0.5 + (i % 5) * 0.12)}
          />
        );
      })}
    </Svg>
  );
}
