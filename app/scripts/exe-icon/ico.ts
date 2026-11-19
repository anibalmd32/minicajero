import { readFileSync } from "node:fs";

export interface IconImage {
  header: Buffer;
  data: Buffer;
}

export function readIco(path: string): IconImage[] {
  const ico = readFileSync(path);
  if (ico.readUInt16LE(2) !== 1) throw new Error(`${path} no es un archivo .ico`);
  const images: IconImage[] = [];
  for (let index = 0; index < ico.readUInt16LE(4); index++) {
    const entry = ico.subarray(6 + 16 * index, 6 + 16 * (index + 1));
    const size = entry.readUInt32LE(8);
    const offset = entry.readUInt32LE(12);
    images.push({ header: entry.subarray(0, 12), data: ico.subarray(offset, offset + size) });
  }
  return images;
}

export function groupIconDirectory(images: IconImage[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = images.map((image, index) => {
    const entry = Buffer.alloc(14);
    image.header.copy(entry, 0);
    entry.writeUInt16LE(index + 1, 12);
    return entry;
  });
  return Buffer.concat([header, ...entries]);
}
