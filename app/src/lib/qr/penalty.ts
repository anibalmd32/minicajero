import { at } from "./checked";

type Modules = readonly (readonly boolean[])[];

const PENALTY_RUN = 3;
const PENALTY_BLOCK = 3;
const PENALTY_FINDER_LIKE = 40;
const PENALTY_BALANCE = 10;
const FINDER_LIKE_PATTERNS = [
  [true, false, true, true, true, false, true, false, false, false, false],
  [false, false, false, false, true, false, true, true, true, false, true],
] as const;

function rowsAndColumns(modules: Modules): (readonly boolean[])[] {
  const columns = modules.map((_, column) => modules.map((row) => at(row, column)));
  return [...modules, ...columns];
}

function runPenalty(line: readonly boolean[]): number {
  let penalty = 0;
  let runLength = 1;
  for (let index = 1; index <= line.length; index++) {
    if (index < line.length && line[index] === line[index - 1]) {
      runLength++;
      continue;
    }
    if (runLength >= 5) penalty += PENALTY_RUN + runLength - 5;
    runLength = 1;
  }
  return penalty;
}

function finderLikePenalty(line: readonly boolean[]): number {
  const moduleAt = (index: number) => index >= 0 && index < line.length && at(line, index);
  let penalty = 0;
  for (const pattern of FINDER_LIKE_PATTERNS) {
    for (let start = -4; start + pattern.length <= line.length + 4; start++) {
      if (pattern.every((isDark, offset) => moduleAt(start + offset) === isDark)) penalty += PENALTY_FINDER_LIKE;
    }
  }
  return penalty;
}

function isUniformBlock(modules: Modules, row: number, column: number): boolean {
  const upper = at(modules, row);
  const lower = at(modules, row + 1);
  const color = at(upper, column);
  return color === at(upper, column + 1) && color === at(lower, column) && color === at(lower, column + 1);
}

function blockPenalty(modules: Modules): number {
  let penalty = 0;
  for (let row = 0; row + 1 < modules.length; row++) {
    for (let column = 0; column + 1 < modules.length; column++) {
      if (isUniformBlock(modules, row, column)) penalty += PENALTY_BLOCK;
    }
  }
  return penalty;
}

function balancePenalty(modules: Modules): number {
  const total = modules.length * modules.length;
  const dark = modules.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  const deviationSteps = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
  return Math.max(0, deviationSteps) * PENALTY_BALANCE;
}

/** Penalización estándar de una matriz terminada (reglas N1 a N4 de ISO/IEC 18004, el exterior cuenta como claro); menor es mejor. */
export function penaltyScore(modules: Modules): number {
  const linePenalty = rowsAndColumns(modules).reduce(
    (sum, line) => sum + runPenalty(line) + finderLikePenalty(line),
    0,
  );
  return linePenalty + blockPenalty(modules) + balancePenalty(modules);
}
