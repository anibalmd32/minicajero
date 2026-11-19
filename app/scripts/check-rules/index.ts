import { resolve } from "node:path";
import { checkCss } from "./css-rules";
import { checkFileLength } from "./file-length";
import type { RuleViolation } from "./rule-violation";
import { loadSourceFiles, type SourceFile } from "./source-files";
import { checkTypeScript } from "./typescript-rules";

function checkFile(file: SourceFile): RuleViolation[] {
  const lengthViolations = checkFileLength(file);
  if (file.language === "typescript") return [...lengthViolations, ...checkTypeScript(file)];
  if (file.language === "css") return [...lengthViolations, ...checkCss(file)];
  return lengthViolations;
}

function report(violations: RuleViolation[], fileCount: number): void {
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line}  ${violation.rule}  ${violation.detail}`);
  }
  const summary = `${fileCount} archivos revisados, ${violations.length} infracciones`;
  if (violations.length > 0) console.error(`\n${summary}`);
  else console.log(summary);
}

const repositoryRoot = resolve(import.meta.dir, "../../..");
const files = await loadSourceFiles(repositoryRoot, process.cwd());
const violations = files.flatMap(checkFile);
report(violations, files.length);
process.exit(violations.length > 0 ? 1 : 0);
