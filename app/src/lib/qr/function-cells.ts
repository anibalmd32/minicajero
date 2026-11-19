import { alignmentPositions } from "./tables";

/** Módulo que lleva el bit `bit` de la información de formato o de versión. */
export interface BitCell {
  row: number;
  column: number;
  bit: number;
}

/** Posiciones de las dos copias de los 15 bits de formato. */
export function formatBitCells(size: number): BitCell[] {
  const cells: BitCell[] = [];
  for (let bit = 0; bit <= 5; bit++) cells.push({ row: bit, column: 8, bit });
  cells.push({ row: 7, column: 8, bit: 6 }, { row: 8, column: 8, bit: 7 }, { row: 8, column: 7, bit: 8 });
  for (let bit = 9; bit < 15; bit++) cells.push({ row: 8, column: 14 - bit, bit });
  for (let bit = 0; bit < 8; bit++) cells.push({ row: 8, column: size - 1 - bit, bit });
  for (let bit = 8; bit < 15; bit++) cells.push({ row: size - 15 + bit, column: 8, bit });
  return cells;
}

/** Posiciones de las dos copias de los 18 bits de versión. */
export function versionBitCells(size: number): BitCell[] {
  const cells: BitCell[] = [];
  for (let bit = 0; bit < 18; bit++) {
    const near = Math.floor(bit / 3);
    const far = size - 11 + (bit % 3);
    cells.push({ row: near, column: far, bit }, { row: far, column: near, bit });
  }
  return cells;
}

/** Centros de los patrones de alineación que no solapan con un patrón de posición. */
export function alignmentCenters(version: number): [number, number][] {
  const positions = alignmentPositions(version);
  const last = positions.length - 1;
  const centers: [number, number][] = [];
  positions.forEach((row, rowIndex) => {
    positions.forEach((column, columnIndex) => {
      const overlapsFinder =
        (rowIndex === 0 && columnIndex === 0) ||
        (rowIndex === 0 && columnIndex === last) ||
        (rowIndex === last && columnIndex === 0);
      if (!overlapsFinder) centers.push([row, column]);
    });
  });
  return centers;
}
