import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { type ChromePage, openChromePage } from "./chrome";

/**
 * Genera `assets/minicajero.ico` a partir de `assets/minicajero.svg`: Chrome headless rasteriza el logo
 * con fondo transparente en cada tamaño y las imágenes se empaquetan como entradas PNG del ICO.
 * Las entradas van de mayor a menor, de modo que quien solo lea la primera imagen parta de la de 256 px.
 * En el exe de la app el grupo de iconos lo reescribe `scripts/set-exe-icon.ts` tras `bun build`.
 * Uso: bun scripts/generate-icon.ts [--png-dir=<carpeta>] (guarda además cada PNG para revisarlo).
 */
const SIZES = [256, 128, 64, 48, 40, 32, 24, 20, 16];
const ASSETS_DIR = resolve(import.meta.dir, "..", "assets");
const SOURCE = join(ASSETS_DIR, "minicajero.svg");
const OUTPUT = join(ASSETS_DIR, "minicajero.ico");
const VIEWPORT = 256;
const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };

const pngDir = process.argv.find((arg) => arg.startsWith("--png-dir="))?.slice("--png-dir=".length);

function logoPage(svg: string, size: number): string {
  const logo = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const html = `<!doctype html><html><body style="margin:0;background:transparent"><img src="${logo}" width="${size}" height="${size}" style="display:block"></body></html>`;
  return `data:text/html;base64,${Buffer.from(html).toString("base64")}`;
}

async function renderPng(page: ChromePage, svg: string, size: number): Promise<Buffer> {
  await page.send("Page.navigate", { url: logoPage(svg, size) });
  await page.send("Runtime.evaluate", {
    expression:
      "new Promise((done) => (document.readyState === 'complete' ? done() : addEventListener('load', done))).then(() => document.images[0].decode())",
    awaitPromise: true,
  });
  const shot = await page.send("Page.captureScreenshot", {
    format: "png",
    clip: { x: 0, y: 0, width: size, height: size, scale: 1 },
  });
  return Buffer.from(shot.data, "base64");
}

function encodeIco(images: Array<{ size: number; png: Buffer }>): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries: Buffer[] = [];
  let offset = 6 + 16 * images.length;
  for (const { size, png } of images) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}

const svg = readFileSync(SOURCE, "utf8");
const page = await openChromePage();
const images: Array<{ size: number; png: Buffer }> = [];
try {
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: VIEWPORT,
    height: VIEWPORT,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page.send("Emulation.setDefaultBackgroundColorOverride", { color: TRANSPARENT });
  for (const size of SIZES) images.push({ size, png: await renderPng(page, svg, size) });
} finally {
  await page.close();
}

if (page.errors.length > 0) throw new Error(`Chrome informó errores al dibujar el logo: ${page.errors.join("; ")}`);
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, encodeIco(images));
if (pngDir) {
  mkdirSync(pngDir, { recursive: true });
  for (const { size, png } of images) writeFileSync(join(pngDir, `minicajero-${size}.png`), png);
}
console.log(`Icono generado en ${OUTPUT} (${SIZES.join(", ")} px)`);
