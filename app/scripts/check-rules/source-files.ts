import { join, relative } from "node:path";

export type SourceFile = {
  path: string;
  language: "typescript" | "css" | "rust";
  text: string;
};

const LANGUAGE_BY_EXTENSION: Record<string, SourceFile["language"]> = {
  ".ts": "typescript",
  ".css": "css",
  ".rs": "rust",
};

function languageOf(path: string): SourceFile["language"] | undefined {
  const extension = path.slice(path.lastIndexOf("."));
  return LANGUAGE_BY_EXTENSION[extension];
}

async function trackedFiles(repositoryRoot: string): Promise<string[]> {
  const output =
    await Bun.$`git -C ${repositoryRoot} ls-files --cached --others --exclude-standard -- app installer/src`.text();
  return output.split("\n").filter((path) => path.length > 0);
}

/** Lee los archivos versionados de la app y del instalador que vigilan las reglas. */
export async function loadSourceFiles(repositoryRoot: string, cwd: string): Promise<SourceFile[]> {
  const files: SourceFile[] = [];
  for (const path of await trackedFiles(repositoryRoot)) {
    const language = languageOf(path);
    const absolutePath = join(repositoryRoot, path);
    const file = Bun.file(absolutePath);
    if (!language || !(await file.exists())) continue;
    files.push({ path: relative(cwd, absolutePath), language, text: await file.text() });
  }
  return files;
}
