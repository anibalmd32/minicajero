import { type Pointer, ptr, read } from "bun:ffi";

const keepAlive: Buffer[] = [];

export function wide(text: string): Pointer {
  const buffer = Buffer.from(`${text}\0`, "utf16le");
  keepAlive.push(buffer);
  return ptr(buffer);
}

export function resourceId(id: number): Pointer {
  return id as unknown as Pointer;
}

export function resourceName(name: number | string): Pointer {
  return typeof name === "number" ? resourceId(name) : wide(name);
}

export function readResourceName(name: Pointer): number | string {
  const value = Number(name);
  if (value < 0x10000) return value;
  let text = "";
  for (let offset = 0; ; offset += 2) {
    const char = read.u16(name, offset);
    if (char === 0) return text;
    text += String.fromCharCode(char);
  }
}
