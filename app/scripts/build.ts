type TargetName = "windows" | "linux" | "mac";

type BuildTarget = {
  bunTarget: string;
  outfile: string;
  extraArgs: string[];
  postBuild: string[][];
};

const WINDOWS_EXE = "dist/minicajero.exe";

const TARGETS: Record<TargetName, BuildTarget> = {
  windows: {
    bunTarget: "bun-windows-x64",
    outfile: WINDOWS_EXE,
    extraArgs: [
      "--windows-hide-console",
      "--windows-title=MiniCajero",
      "--windows-description=Facturación local",
      "--windows-icon=assets/minicajero.ico",
    ],
    postBuild: [
      ["bun", "scripts/set-exe-icon.ts", WINDOWS_EXE],
      ["bun", "scripts/set-gui-subsystem.ts", WINDOWS_EXE],
    ],
  },
  linux: { bunTarget: "bun-linux-x64", outfile: "dist/minicajero-linux", extraArgs: [], postBuild: [] },
  mac: { bunTarget: "bun-darwin-arm64", outfile: "dist/minicajero-macos", extraArgs: [], postBuild: [] },
};

const MASTER_KEY_VARIABLES = ["MINICAJERO_MASTER_KEY_HASH", "MINICAJERO_MASTER_KEY_SALT"] as const;

function isTargetName(value: string): value is TargetName {
  return value in TARGETS;
}

/** Fija en el binario el hash de la clave maestra (vacío si no está configurado) para que no dependa del entorno. */
function masterKeyDefines(): string[] {
  return MASTER_KEY_VARIABLES.flatMap((name) => [
    "--define",
    `process.env.${name}=${JSON.stringify(process.env[name] ?? "")}`,
  ]);
}

function hasMasterKey(): boolean {
  return MASTER_KEY_VARIABLES.every((name) => (process.env[name] ?? "") !== "");
}

async function run(command: string[]): Promise<void> {
  const exitCode = await Bun.spawn(command, { stdout: "inherit", stderr: "inherit" }).exited;
  if (exitCode !== 0) process.exit(exitCode);
}

function compileCommand(target: BuildTarget): string[] {
  return [
    "bun",
    "build",
    "./index.ts",
    "--compile",
    "--minify",
    "--no-compile-autoload-dotenv",
    "--no-compile-autoload-bunfig",
    `--target=${target.bunTarget}`,
    ...target.extraArgs,
    ...masterKeyDefines(),
    "--outfile",
    target.outfile,
  ];
}

const targetName = process.argv[2] ?? "windows";
if (!isTargetName(targetName)) {
  console.error(`Destino desconocido: ${targetName}. Usa windows, linux o mac.`);
  process.exit(64);
}
if (!hasMasterKey()) {
  console.warn("Aviso: no hay clave maestra en .env.local; la recuperación del acceso quedará desactivada.");
}
const target = TARGETS[targetName];
await run(compileCommand(target));
for (const command of target.postBuild) await run(command);
