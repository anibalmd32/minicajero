import { dlopen, FFIType } from "bun:ffi";

export const kernel32 = dlopen("kernel32.dll", {
  LoadLibraryExW: { args: [FFIType.ptr, FFIType.ptr, FFIType.u32], returns: FFIType.ptr },
  FreeLibrary: { args: [FFIType.ptr], returns: FFIType.i32 },
  EnumResourceNamesW: { args: [FFIType.ptr, FFIType.ptr, FFIType.function, FFIType.ptr], returns: FFIType.i32 },
  EnumResourceLanguagesW: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.function, FFIType.ptr],
    returns: FFIType.i32,
  },
  BeginUpdateResourceW: { args: [FFIType.ptr, FFIType.i32], returns: FFIType.ptr },
  UpdateResourceW: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.u16, FFIType.ptr, FFIType.u32],
    returns: FFIType.i32,
  },
  EndUpdateResourceW: { args: [FFIType.ptr, FFIType.i32], returns: FFIType.i32 },
  GetLastError: { args: [], returns: FFIType.u32 },
});

export function fail(action: string): never {
  throw new Error(`${action} (error de Windows ${kernel32.symbols.GetLastError()})`);
}
