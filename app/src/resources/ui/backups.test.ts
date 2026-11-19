import { describe, expect, test } from "bun:test";
import { backupFileUrl, formatFileSize } from "./backups";

describe("respaldos en la UI", () => {
  test("formatea tamaños de archivo", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1536)).toBe("1,5 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5 MB");
    expect(formatFileSize(-1)).toBe("—");
  });

  test("codifica el nombre en la URL de descarga", () => {
    expect(backupFileUrl("minicajero-2026-10-29-1130.db")).toBe("/api/v1/backup/files/minicajero-2026-10-29-1130.db");
  });
});
