import type { Pointer } from "bun:ffi";
import { resolve } from "node:path";
import { groupIconDirectory, type IconImage, readIco } from "./exe-icon/ico";
import { fail, kernel32 } from "./exe-icon/kernel32";
import { type ExistingResource, listIconResources } from "./exe-icon/list-resources";
import { wide } from "./exe-icon/native-strings";
import { GROUP_ICON_ID, RT_GROUP_ICON, RT_ICON } from "./exe-icon/resource-types";
import { updateResource } from "./exe-icon/update-resource";

/**
 * Sustituye los iconos del exe compilado por los de `assets/minicajero.ico`.
 * `bun build --windows-icon` deja el grupo de iconos original de Bun (con nombre, una sola entrada y un
 * tamaño que no corresponde) y añade el nuestro con ID 0 sin usarlo, así que Windows reduce la imagen
 * de 256 px en vez de usar las de 16 y 32 px. Aquí se borran todos los iconos y grupos del exe y se
 * escribe un único grupo (ID 1) con todas las imágenes del ICO y sus tamaños reales.
 * Uso: bun scripts/set-exe-icon.ts <exe> [ico]
 */
function groupLanguage(existing: ExistingResource[]): number {
  return existing.find((resource) => resource.type === RT_GROUP_ICON)?.language ?? 0;
}

function replaceIcons(update: Pointer, existing: ExistingResource[], images: IconImage[]): void {
  const language = groupLanguage(existing);
  for (const resource of existing) updateResource(update, resource.type, resource.name, resource.language, null);
  for (const [index, image] of images.entries()) updateResource(update, RT_ICON, index + 1, language, image.data);
  updateResource(update, RT_GROUP_ICON, GROUP_ICON_ID, language, groupIconDirectory(images));
}

function setExeIcon(exePath: string, icoPath: string): void {
  const images = readIco(icoPath);
  const existing = listIconResources(exePath);
  const update = kernel32.symbols.BeginUpdateResourceW(wide(exePath), 0) as Pointer | null;
  if (!update) fail(`No se pudo abrir ${exePath} para escribir`);
  try {
    replaceIcons(update, existing, images);
  } catch (error) {
    kernel32.symbols.EndUpdateResourceW(update, 1);
    throw error;
  }
  if (!kernel32.symbols.EndUpdateResourceW(update, 0)) fail(`No se pudo guardar ${exePath}`);
  console.log(`Icono de ${exePath} actualizado (${images.length} imágenes)`);
}

const [exeArg, icoArg] = process.argv.slice(2);
if (!exeArg) throw new Error("Uso: bun scripts/set-exe-icon.ts <exe> [ico]");
if (process.platform !== "win32") throw new Error("Este paso solo puede ejecutarse en Windows");
setExeIcon(resolve(exeArg), resolve(icoArg ?? resolve(import.meta.dir, "..", "assets", "minicajero.ico")));
