import { CANVAS_HEIGHT, CANVAS_WIDTH } from '@/src/utils/treeLayout';

/** Escala mínima: encuadra el mapa 2400×2400 con un margen. */
export const CANVAS_ZOOM = {
  MAX: 2,
  STEP: 1.22,
  /** Por debajo de este valor → vista lejana (LOD simplificado). */
  DETAIL_THRESHOLD: 0.45,
  FIT_PADDING: 0.96,
} as const;

export function computeFitScale(
  viewportWidth: number,
  viewportHeight: number,
  canvasWidth = CANVAS_WIDTH,
  canvasHeight = CANVAS_HEIGHT
): number {
  if (viewportWidth <= 0 || viewportHeight <= 0) return 0.18;
  const fit = Math.min(viewportWidth / canvasWidth, viewportHeight / canvasHeight);
  return fit * CANVAS_ZOOM.FIT_PADDING;
}

export function clampZoom(
  scale: number,
  minScale: number,
  maxScale = CANVAS_ZOOM.MAX
): number {
  return Math.min(maxScale, Math.max(minScale, scale));
}

export function isDetailZoom(scale: number): boolean {
  return scale >= CANVAS_ZOOM.DETAIL_THRESHOLD;
}

/** Centra el lienzo escalado dentro del viewport. */
export function centerCanvasTranslation(
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
  canvasWidth = CANVAS_WIDTH,
  canvasHeight = CANVAS_HEIGHT
): { x: number; y: number } {
  return {
    x: (viewportWidth - canvasWidth * scale) / 2,
    y: (viewportHeight - canvasHeight * scale) / 2,
  };
}

/**
 * Ajusta traslación al cambiar escala manteniendo fijo un punto del lienzo bajo el foco.
 */
export function zoomAroundPoint(
  currentScale: number,
  nextScale: number,
  translateX: number,
  translateY: number,
  focalX: number,
  focalY: number
): { x: number; y: number } {
  const canvasX = (focalX - translateX) / currentScale;
  const canvasY = (focalY - translateY) / currentScale;
  return {
    x: focalX - canvasX * nextScale,
    y: focalY - canvasY * nextScale,
  };
}
