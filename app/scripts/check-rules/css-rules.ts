import { createLineIndex } from "./line-index";
import type { RuleViolation } from "./rule-violation";
import type { SourceFile } from "./source-files";

function skipString(text: string, start: number): number {
  const quote = text[start];
  let index = start + 1;
  while (index < text.length && text[index] !== quote) {
    index += text[index] === "\\" ? 2 : 1;
  }
  return index + 1;
}

/** Devuelve el desplazamiento de cada comentario CSS, ignorando los que aparecen dentro de cadenas. */
export function findCssComments(text: string): number[] {
  const offsets: number[] = [];
  let index = 0;
  while (index < text.length) {
    const character = text[index];
    if (character === '"' || character === "'") {
      index = skipString(text, index);
    } else if (text.startsWith("/*", index)) {
      offsets.push(index);
      const end = text.indexOf("*/", index + 2);
      index = end === -1 ? text.length : end + 2;
    } else {
      index++;
    }
  }
  return offsets;
}

/** Marca los comentarios de un archivo CSS. */
export function checkCss(file: SourceFile): RuleViolation[] {
  const lineOf = createLineIndex(file.text);
  return findCssComments(file.text).map((offset) => ({
    file: file.path,
    line: lineOf(offset),
    rule: "no-comments",
    detail: "comentario CSS",
  }));
}
