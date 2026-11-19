import { at } from "./checked";
import { formatBits, isBitSet, versionBits } from "./format-bits";
import { alignmentCenters, formatBitCells, versionBitCells } from "./function-cells";
import { MASK_CONDITIONS, MASK_PATTERNS, type MaskPattern } from "./masks";
import { penaltyScore } from "./penalty";
import { type ErrorCorrectionLevel, FORMAT_BITS, symbolSize } from "./tables";

export { MASK_PATTERNS, type MaskPattern } from "./masks";
export { penaltyScore } from "./penalty";

/** Matriz de módulos en construcción: `dark[fila][columna]` y qué módulos pertenecen a patrones fijos. */
export class QrGrid {
  readonly size: number;
  readonly dark: boolean[][];
  readonly reserved: boolean[][];

  constructor(readonly version: number) {
    this.size = symbolSize(version);
    this.dark = Array.from({ length: this.size }, () => Array<boolean>(this.size).fill(false));
    this.reserved = Array.from({ length: this.size }, () => Array<boolean>(this.size).fill(false));
    this.drawFunctionPatterns();
  }

  private setFunction(row: number, column: number, isDark: boolean): void {
    at(this.dark, row)[column] = isDark;
    at(this.reserved, row)[column] = true;
  }

  private isReserved(row: number, column: number): boolean {
    return at(at(this.reserved, row), column);
  }

  private flip(row: number, column: number): void {
    const line = at(this.dark, row);
    line[column] = !at(line, column);
  }

  private drawFunctionPatterns(): void {
    for (let index = 0; index < this.size; index++) {
      this.setFunction(6, index, index % 2 === 0);
      this.setFunction(index, 6, index % 2 === 0);
    }
    this.drawFinder(3, 3);
    this.drawFinder(3, this.size - 4);
    this.drawFinder(this.size - 4, 3);
    this.drawAlignmentPatterns();
    this.drawFormatBits(0, 0);
    this.drawVersionBits();
  }

  private drawAlignmentPatterns(): void {
    for (const [row, column] of alignmentCenters(this.version)) this.drawAlignment(row, column);
  }

  private drawFinder(centerRow: number, centerColumn: number): void {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const row = centerRow + dy;
        const column = centerColumn + dx;
        if (row < 0 || row >= this.size || column < 0 || column >= this.size) continue;
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        this.setFunction(row, column, distance !== 2 && distance !== 4);
      }
    }
  }

  private drawAlignment(centerRow: number, centerColumn: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunction(centerRow + dy, centerColumn + dx, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  /** Escribe la información de formato (nivel y máscara) en sus dos copias y el módulo oscuro fijo. */
  private drawFormatBits(levelBits: number, mask: number): void {
    const bits = formatBits(levelBits, mask);
    for (const { row, column, bit } of formatBitCells(this.size)) this.setFunction(row, column, isBitSet(bits, bit));
    this.setFunction(this.size - 8, 8, true);
  }

  private drawVersionBits(): void {
    if (this.version < 7) return;
    const bits = versionBits(this.version);
    for (const { row, column, bit } of versionBitCells(this.size)) this.setFunction(row, column, isBitSet(bits, bit));
  }

  /** Coloca los codewords en zigzag de dos columnas, desde abajo a la derecha, saltando la columna de temporización. */
  placeCodewords(codewords: Uint8Array): void {
    const totalBits = codewords.length * 8;
    let bitIndex = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      const upward = ((right + 1) & 2) === 0;
      for (let step = 0; step < this.size; step++) {
        const row = upward ? this.size - 1 - step : step;
        for (let offset = 0; offset < 2; offset++) {
          const column = right - offset;
          if (this.isReserved(row, column) || bitIndex >= totalBits) continue;
          at(this.dark, row)[column] = ((at(codewords, bitIndex >>> 3) >>> (7 - (bitIndex & 7))) & 1) === 1;
          bitIndex++;
        }
      }
    }
  }

  private applyMask(mask: MaskPattern): void {
    const condition = MASK_CONDITIONS[mask];
    for (let row = 0; row < this.size; row++) {
      for (let column = 0; column < this.size; column++) {
        if (!this.isReserved(row, column) && condition(row, column)) this.flip(row, column);
      }
    }
  }

  /** Aplica la máscara indicada o, si no se indica, la de menor penalización, y escribe su información de formato. */
  finish(level: ErrorCorrectionLevel, mask?: MaskPattern): MaskPattern {
    const chosen = mask ?? this.bestMask(level);
    this.applyMask(chosen);
    this.drawFormatBits(FORMAT_BITS[level], chosen);
    return chosen;
  }

  private bestMask(level: ErrorCorrectionLevel): MaskPattern {
    let best: MaskPattern = 0;
    let bestPenalty = Infinity;
    for (const mask of MASK_PATTERNS) {
      this.applyMask(mask);
      this.drawFormatBits(FORMAT_BITS[level], mask);
      const penalty = penaltyScore(this.dark);
      if (penalty < bestPenalty) {
        best = mask;
        bestPenalty = penalty;
      }
      this.applyMask(mask);
    }
    return best;
  }
}
