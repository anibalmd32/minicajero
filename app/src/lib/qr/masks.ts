/** Máscara de datos (0 a 7). */
export type MaskPattern = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const MASK_PATTERNS: readonly MaskPattern[] = [0, 1, 2, 3, 4, 5, 6, 7];

export const MASK_CONDITIONS: Record<MaskPattern, (row: number, column: number) => boolean> = {
  0: (row, column) => (row + column) % 2 === 0,
  1: (row) => row % 2 === 0,
  2: (_row, column) => column % 3 === 0,
  3: (row, column) => (row + column) % 3 === 0,
  4: (row, column) => (Math.floor(row / 2) + Math.floor(column / 3)) % 2 === 0,
  5: (row, column) => ((row * column) % 2) + ((row * column) % 3) === 0,
  6: (row, column) => (((row * column) % 2) + ((row * column) % 3)) % 2 === 0,
  7: (row, column) => (((row + column) % 2) + ((row * column) % 3)) % 2 === 0,
};
