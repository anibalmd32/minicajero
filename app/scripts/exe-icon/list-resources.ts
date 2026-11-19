import { FFIType, JSCallback, type Pointer } from "bun:ffi";
import { fail, kernel32 } from "./kernel32";
import { readResourceName, resourceId, wide } from "./native-strings";
import { RT_GROUP_ICON, RT_ICON } from "./resource-types";

const LOAD_LIBRARY_AS_DATAFILE = 0x2;

export interface ExistingResource {
  type: number;
  name: number | string;
  language: number;
}

function openAsDataFile(exePath: string): Pointer {
  const module = kernel32.symbols.LoadLibraryExW(wide(exePath), null, LOAD_LIBRARY_AS_DATAFILE) as Pointer | null;
  if (!module) fail(`No se pudo abrir ${exePath}`);
  return module;
}

function languageCollector(found: ExistingResource[], current: { type: number; name: number | string }) {
  return new JSCallback(
    (_module: Pointer, _type: Pointer, _name: Pointer, language: number) => {
      found.push({ type: current.type, name: current.name, language });
      return 1;
    },
    { args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.u16, FFIType.ptr], returns: FFIType.i32 },
  );
}

function nameCollector(module: Pointer, current: { type: number; name: number | string }, onLanguage: JSCallback) {
  return new JSCallback(
    (_module: Pointer, _type: Pointer, name: Pointer) => {
      current.name = readResourceName(name);
      kernel32.symbols.EnumResourceLanguagesW(module, resourceId(current.type), name, onLanguage, null);
      return 1;
    },
    { args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr], returns: FFIType.i32 },
  );
}

export function listIconResources(exePath: string): ExistingResource[] {
  const module = openAsDataFile(exePath);
  const found: ExistingResource[] = [];
  const current: { type: number; name: number | string } = { type: 0, name: 0 };
  const onLanguage = languageCollector(found, current);
  const onName = nameCollector(module, current, onLanguage);
  try {
    for (const type of [RT_GROUP_ICON, RT_ICON]) {
      current.type = type;
      kernel32.symbols.EnumResourceNamesW(module, resourceId(type), onName, null);
    }
  } finally {
    kernel32.symbols.FreeLibrary(module);
    onName.close();
    onLanguage.close();
  }
  return found;
}
