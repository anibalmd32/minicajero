const SYSTEMS: readonly [RegExp, string][] = [
  [/android/i, "Android"],
  [/iphone/i, "iPhone"],
  [/ipad/i, "iPad"],
  [/windows/i, "Windows"],
  [/mac os x|macintosh/i, "Mac"],
  [/linux/i, "Linux"],
];

const BROWSERS: readonly [RegExp, string][] = [
  [/samsungbrowser/i, "Samsung Internet"],
  [/edga?\//i, "Edge"],
  [/opr\/|opera/i, "Opera"],
  [/firefox|fxios/i, "Firefox"],
  [/crios|chrome\//i, "Chrome"],
  [/safari/i, "Safari"],
];

function firstMatch(text: string, table: readonly [RegExp, string][]): string | null {
  return table.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

/** Nombre corto del dispositivo a partir de su user-agent (`Android · Chrome`); "Teléfono" si no se reconoce. */
export function describeDevice(userAgent: string | null | undefined): string {
  const text = userAgent ?? "";
  const parts = [firstMatch(text, SYSTEMS), firstMatch(text, BROWSERS)].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(" · ") : "Teléfono";
}
