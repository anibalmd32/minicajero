import { at } from "./checked";

export type Modules = readonly (readonly boolean[])[];

export function picture(modules: Modules): string[] {
  return modules.map((row) => row.map((isDark) => (isDark ? "#" : ".")).join(""));
}

export function moduleAt(modules: Modules, row: number, column: number): boolean {
  return at(at(modules, row), column);
}

function formatPosition(index: number): [number, number] {
  if (index <= 5) return [index, 8];
  if (index === 6) return [7, 8];
  if (index === 7) return [8, 8];
  if (index === 8) return [8, 7];
  return [8, 14 - index];
}

export function readFormat(modules: Modules): number {
  let bits = 0;
  for (let index = 0; index < 15; index++) {
    const [row, column] = formatPosition(index);
    if (moduleAt(modules, row, column)) bits |= 1 << index;
  }
  return bits ^ 0x5412;
}
