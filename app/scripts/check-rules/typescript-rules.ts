import { parseSync, Visitor } from "oxc-parser";
import { createLineIndex } from "./line-index";
import { MAX_FUNCTION_LINES, type RuleViolation } from "./rule-violation";
import type { SourceFile } from "./source-files";

type Span = { start: number; end: number };
type Comment = Span & { type: "Line" | "Block"; value: string };

const TOOL_DIRECTIVE = /@ts-|biome-ignore/;

function isAllowedComment(comment: Comment): boolean {
  const isJsDoc = comment.type === "Block" && comment.value.startsWith("*");
  return isJsDoc || TOOL_DIRECTIVE.test(comment.value);
}

function commentViolations(file: SourceFile, comments: Comment[], lineOf: (offset: number) => number): RuleViolation[] {
  return comments
    .filter((comment) => !isAllowedComment(comment))
    .map((comment) => ({
      file: file.path,
      line: lineOf(comment.start),
      rule: "no-comments",
      detail: comment.value.trim().slice(0, 60),
    }));
}

function functionViolations(file: SourceFile, program: unknown, lineOf: (offset: number) => number): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const check = (node: Span) => {
    const lines = lineOf(node.end) - lineOf(node.start) + 1;
    if (lines <= MAX_FUNCTION_LINES) return;
    violations.push({
      file: file.path,
      line: lineOf(node.start),
      rule: "max-function-lines",
      detail: `${lines} líneas (máximo ${MAX_FUNCTION_LINES})`,
    });
  };
  new Visitor({ FunctionDeclaration: check, FunctionExpression: check, ArrowFunctionExpression: check }).visit(
    program as Parameters<Visitor["visit"]>[0],
  );
  return violations;
}

/** Revisa comentarios y longitud de funciones de un archivo TypeScript. */
export function checkTypeScript(file: SourceFile): RuleViolation[] {
  const { program, comments } = parseSync(file.path, file.text);
  const lineOf = createLineIndex(file.text);
  return [...commentViolations(file, comments, lineOf), ...functionViolations(file, program, lineOf)];
}
