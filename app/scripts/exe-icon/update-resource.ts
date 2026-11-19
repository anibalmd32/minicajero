import { type Pointer, ptr } from "bun:ffi";
import { fail, kernel32 } from "./kernel32";
import { resourceId, resourceName } from "./native-strings";

export function updateResource(
  update: Pointer,
  type: number,
  name: number | string,
  language: number,
  data: Buffer | null,
): void {
  const ok = kernel32.symbols.UpdateResourceW(
    update,
    resourceId(type),
    resourceName(name),
    language,
    data ? ptr(data) : null,
    data?.length ?? 0,
  );
  if (!ok) fail(`No se pudo actualizar el recurso ${type}/${name}`);
}
