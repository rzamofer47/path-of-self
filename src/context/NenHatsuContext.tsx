import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { NenAxisId, NEN_AXIS_LABELS } from '@/src/config/nenConfig';
import { getNenFirma, NenDestelloPattern, NenFirma } from '@/src/config/nenFirmas';
import { getNenDominante } from '@/src/utils/nenDominante';

const COLOR_LERP_MS = 3000;

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function lerpColor(from: string, to: string, t: number): string {
  const [r1, g1, b1] = parseHex(from);
  const [r2, g2, b2] = parseHex(to);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
  const r = mix(r1, r2);
  const g = mix(g1, g2);
  const b = mix(b1, b2);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

interface NenHatsuContextValue {
  dominantAxis: NenAxisId;
  firma: NenFirma;
  auraColor: string;
  destelloPattern: NenDestelloPattern;
  pulseMs: number;
  hatsuLabel: string;
  refreshDominant: () => Promise<void>;
}

const NenHatsuContext = createContext<NenHatsuContextValue | null>(null);

export function NenHatsuProvider({
  children,
  profileTick = 0,
}: {
  children: React.ReactNode;
  profileTick?: number;
}) {
  const [dominantAxis, setDominantAxis] = useState<NenAxisId>('intensification');
  const [displayColor, setDisplayColor] = useState(getNenFirma('intensification').colorAura);
  const targetColorRef = useRef(displayColor);
  const frameRef = useRef<number | null>(null);
  const displayColorRef = useRef(displayColor);
  displayColorRef.current = displayColor;

  const applyTargetColor = useCallback((target: string) => {
    targetColorRef.current = target;
    const startColor = displayColorRef.current;
    const start = performance.now();

    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / COLOR_LERP_MS);
      setDisplayColor(lerpColor(startColor, target, progress));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
  }, []);

  const refreshDominant = useCallback(async () => {
    const axis = await getNenDominante();
    setDominantAxis(axis);
    applyTargetColor(getNenFirma(axis).colorAura);
  }, [applyTargetColor]);

  useEffect(() => {
    void refreshDominant();
  }, [profileTick, refreshDominant]);

  useEffect(
    () => () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    },
    []
  );

  const firma = useMemo(() => getNenFirma(dominantAxis), [dominantAxis]);

  const value = useMemo(
    () => ({
      dominantAxis,
      firma,
      auraColor: displayColor,
      destelloPattern: firma.patternDestello,
      pulseMs: firma.velocidadPulso,
      hatsuLabel: `HATSU: ${NEN_AXIS_LABELS[dominantAxis].toUpperCase()}`,
      refreshDominant,
    }),
    [dominantAxis, displayColor, firma, refreshDominant]
  );

  return <NenHatsuContext.Provider value={value}>{children}</NenHatsuContext.Provider>;
}

export function useNenHatsu(): NenHatsuContextValue {
  const ctx = useContext(NenHatsuContext);
  if (!ctx) {
    const fallback = getNenFirma('intensification');
    return {
      dominantAxis: 'intensification',
      firma: fallback,
      auraColor: fallback.colorAura,
      destelloPattern: fallback.patternDestello,
      pulseMs: fallback.velocidadPulso,
      hatsuLabel: 'HATSU: INTENSIFICACIÓN',
      refreshDominant: async () => {},
    };
  }
  return ctx;
}
