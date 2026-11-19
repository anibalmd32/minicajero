/** Opciones de dibujo del QR en SVG. */
export interface QrSvgOptions {
  /** Margen claro alrededor, en módulos. Por defecto 4 (el mínimo que exige el estándar). */
  margin?: number;
  /** Texto alternativo para lectores de pantalla. */
  title?: string;
}

const DEFAULT_MARGIN = 4;

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function darkPath(modules: readonly (readonly boolean[])[], margin: number): string {
  const parts: string[] = [];
  modules.forEach((row, rowIndex) => {
    for (let column = 0; column < row.length; column++) {
      if (!row[column]) continue;
      const start = column;
      while (column + 1 < row.length && row[column + 1]) column++;
      const length = column - start + 1;
      parts.push(`M${start + margin} ${rowIndex + margin}h${length}v1h-${length}z`);
    }
  });
  return parts.join("");
}

/** Dibuja una matriz de módulos como SVG escalable: fondo blanco, módulos negros y bordes nítidos. */
export function matrixToSvg(modules: readonly (readonly boolean[])[], options: QrSvgOptions = {}): string {
  const margin = options.margin ?? DEFAULT_MARGIN;
  if (!Number.isInteger(margin) || margin < 0) throw new RangeError(`Margen de QR no válido: ${margin}`);
  const side = modules.length + margin * 2;
  const accessibility = options.title ? ` role="img" aria-label="${escapeXml(options.title)}"` : ` aria-hidden="true"`;
  const title = options.title ? `<title>${escapeXml(options.title)}</title>` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges"${accessibility}>` +
    `${title}<rect width="${side}" height="${side}" fill="#fff"/>` +
    `<path fill="#000" d="${darkPath(modules, margin)}"/></svg>`
  );
}
