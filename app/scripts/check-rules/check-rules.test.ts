import { describe, expect, test } from "bun:test";
import { findCssComments } from "./css-rules";
import { checkFileLength, countLines } from "./file-length";
import { createLineIndex } from "./line-index";
import { MAX_FILE_LINES, MAX_FUNCTION_LINES } from "./rule-violation";
import { checkTypeScript } from "./typescript-rules";

const typescriptFile = (text: string) => ({ path: "sample.ts", language: "typescript" as const, text });

describe("countLines", () => {
  test("ignora el salto de línea final", () => {
    expect(countLines("a\nb\n")).toBe(2);
    expect(countLines("a\nb")).toBe(2);
    expect(countLines("")).toBe(0);
  });
});

describe("checkFileLength", () => {
  test("acepta el máximo y marca una línea más", () => {
    expect(checkFileLength(typescriptFile("x\n".repeat(MAX_FILE_LINES)))).toEqual([]);
    expect(checkFileLength(typescriptFile("x\n".repeat(MAX_FILE_LINES + 1)))[0]?.rule).toBe("max-file-lines");
  });
});

describe("createLineIndex", () => {
  test("traduce desplazamientos a líneas", () => {
    const lineOf = createLineIndex("ab\ncd\nef");
    expect([lineOf(0), lineOf(2), lineOf(3), lineOf(7)]).toEqual([1, 1, 2, 3]);
  });
});

describe("checkTypeScript", () => {
  test("marca comentarios de línea y de bloque, no JSDoc ni directivas", () => {
    const text = "/** doc */\nconst a = 1; // nota\n/* bloque */\n// @ts-expect-error\nconst url = `//x`;\n";
    const lines = checkTypeScript(typescriptFile(text)).map((violation) => violation.line);
    expect(lines).toEqual([2, 3]);
  });

  test("marca funciones demasiado largas", () => {
    const body = "  x();\n".repeat(MAX_FUNCTION_LINES - 1);
    const violations = checkTypeScript(typescriptFile(`function largo() {\n${body}}\n`));
    expect(violations.map((violation) => violation.rule)).toEqual(["max-function-lines"]);
    expect(
      checkTypeScript(typescriptFile(`function corto() {\n${"  x();\n".repeat(MAX_FUNCTION_LINES - 2)}}\n`)),
    ).toEqual([]);
  });
});

describe("findCssComments", () => {
  test("encuentra comentarios fuera de cadenas", () => {
    expect(findCssComments('a { content: "/* no */"; } /* sí */')).toEqual([27]);
  });
});
