import { CANVAS_HEIGHT, CANVAS_WIDTH } from '@/src/utils/treeLayout';

/** Máximo bitmap SVG — Android crashea si supera ~100 MB (2400×2400×density). */
export const CANVAS_SVG_RASTER_MAX = 480;

export interface CanvasSvgRasterLayout {
  rasterWidth: number;
  rasterHeight: number;
}

/** SVG de conexiones: bitmap pequeño, viewBox lienzo completo, escala visual vía wrapper. */
export interface ConnectionSvgLayout {
  rasterWidth: number;
  rasterHeight: number;
  viewBox: string;
  /** Multiplicador de trazo en unidades viewBox. */
  strokeScale: number;
  /** Escala del contenedor para cubrir 2400×2400 sin bitmap gigante. */
  wrapScale: number;
}

export function buildFullCanvasConnectionLayout(): ConnectionSvgLayout {
  const rasterWidth = CANVAS_SVG_RASTER_MAX;
  const rasterHeight = CANVAS_SVG_RASTER_MAX;
  const wrapScale = CANVAS_WIDTH / rasterWidth;

  return {
    rasterWidth,
    rasterHeight,
    viewBox: `0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`,
    strokeScale: 1,
    wrapScale,
  };
}

/** @deprecated Usar buildFullCanvasConnectionLayout */
export function buildCanvasSvgRasterLayout(
  viewportWidth: number,
  viewportHeight: number
): CanvasSvgRasterLayout {
  return {
    rasterWidth: Math.max(1, Math.min(CANVAS_SVG_RASTER_MAX, Math.round(viewportWidth))),
    rasterHeight: Math.max(1, Math.min(CANVAS_SVG_RASTER_MAX, Math.round(viewportHeight))),
  };
}

/** ¿El centro del nodo cae dentro del viewport visible (con margen)? */
export function isNodeInViewport(
  node: { posX: number; posY: number },
  translateX: number,
  translateY: number,
  scale: number,
  viewportWidth: number,
  viewportHeight: number,
  orbSize = 50,
  padding = 160
): boolean {
  const cx = node.posX + orbSize / 2;
  const cy = node.posY + orbSize / 2;
  const sx = cx * scale + translateX;
  const sy = cy * scale + translateY;
  return (
    sx >= -padding &&
    sx <= viewportWidth + padding &&
    sy >= -padding &&
    sy <= viewportHeight + padding
  );
}
