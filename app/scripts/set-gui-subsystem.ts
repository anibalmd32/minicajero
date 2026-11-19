import { closeSync, openSync, readSync, writeSync } from "node:fs";

/**
 * Marca un ejecutable de Windows como aplicación gráfica (subsistema GUI) para que al abrirlo no aparezca
 * ni parpadee una ventana de consola. `bun build --windows-hide-console` solo la oculta después de crearla.
 * Uso: bun scripts/set-gui-subsystem.ts <ejecutable.exe>
 */
const PE_HEADER_OFFSET_POSITION = 0x3c;
const SUBSYSTEM_OFFSET_IN_OPTIONAL_HEADER = 68;
const COFF_HEADER_SIZE = 24;
const SUBSYSTEM_WINDOWS_GUI = 2;
const SUBSYSTEM_WINDOWS_CONSOLE = 3;

const path = process.argv[2];
if (!path) {
  console.error("Uso: bun scripts/set-gui-subsystem.ts <ejecutable.exe>");
  process.exit(1);
}

const file = openSync(path, "r+");
try {
  const header = Buffer.alloc(4096);
  readSync(file, header, 0, header.length, 0);
  const peOffset = header.readUInt32LE(PE_HEADER_OFFSET_POSITION);
  if (header.toString("latin1", peOffset, peOffset + 4) !== "PE\0\0")
    throw new Error(`${path} no es un ejecutable de Windows`);
  const subsystemOffset = peOffset + COFF_HEADER_SIZE + SUBSYSTEM_OFFSET_IN_OPTIONAL_HEADER;
  const current = header.readUInt16LE(subsystemOffset);
  if (current !== SUBSYSTEM_WINDOWS_CONSOLE && current !== SUBSYSTEM_WINDOWS_GUI) {
    throw new Error(`Subsistema inesperado (${current}) en ${path}`);
  }
  const value = Buffer.alloc(2);
  value.writeUInt16LE(SUBSYSTEM_WINDOWS_GUI);
  writeSync(file, value, 0, value.length, subsystemOffset);
  console.log(`${path}: subsistema GUI`);
} finally {
  closeSync(file);
}
