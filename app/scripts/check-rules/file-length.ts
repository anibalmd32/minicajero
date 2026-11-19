import { MAX_FILE_LINES, type RuleViolation } from "./rule-violation";
import type { SourceFile } from "./source-files";

/** Cuenta las líneas de un texto sin contar el salto de línea final. */
export function countLines(text: string): number {
  if (text.length === 0) return 0;
  const lines = text.split("\n").length;
  return text.endsWith("\n") ? lines - 1 : lines;
}

/** Marca el archivo si supera el máximo de líneas permitido. */
export function checkFileLength(file: SourceFile): RuleViolation[] {
  const lines = countLines(file.text);
  if (lines <= MAX_FILE_LINES) return [];
  return [{ file: file.path, line: 1, rule: "max-file-lines", detail: `${lines} líneas (máximo ${MAX_FILE_LINES})` }];
}
