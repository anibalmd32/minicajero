import { at } from "./checked";
import { generatorPolynomial, reedSolomonRemainder } from "./reed-solomon";
import { blockLayout, type ErrorCorrectionLevel } from "./tables";

const MODE_BYTE = 0b0100;
const MODE_ECI = 0b0111;
const ECI_UTF8 = 26;
const PAD_BYTES = [0xec, 0x11] as const;

class BitBuffer {
  readonly bits: number[] = [];

  append(value: number, length: number): void {
    for (let bit = length - 1; bit >= 0; bit--) this.bits.push((value >>> bit) & 1);
  }
}

function characterCountBits(version: number): number {
  return version <= 9 ? 8 : 16;
}

function needsUtf8Eci(bytes: Uint8Array): boolean {
  return bytes.some((byte) => byte >= 0x80);
}

/** Bits que ocupa el segmento de `bytes` en modo byte (con cabecera ECI UTF-8 si hay caracteres no ASCII). */
export function segmentBitLength(bytes: Uint8Array, version: number): number {
  const eciBits = needsUtf8Eci(bytes) ? 12 : 0;
  return eciBits + 4 + characterCountBits(version) + bytes.length * 8;
}

/** Indica si `bytes` caben en una versión y nivel dados. */
export function fitsIn(bytes: Uint8Array, version: number, level: ErrorCorrectionLevel): boolean {
  if (bytes.length >= 1 << characterCountBits(version)) return false;
  return segmentBitLength(bytes, version) <= blockLayout(version, level).dataCodewords * 8;
}

function dataCodewords(bytes: Uint8Array, version: number, level: ErrorCorrectionLevel): Uint8Array {
  const capacityBits = blockLayout(version, level).dataCodewords * 8;
  const buffer = new BitBuffer();
  if (needsUtf8Eci(bytes)) {
    buffer.append(MODE_ECI, 4);
    buffer.append(ECI_UTF8, 8);
  }
  buffer.append(MODE_BYTE, 4);
  buffer.append(bytes.length, characterCountBits(version));
  for (const byte of bytes) buffer.append(byte, 8);
  buffer.append(0, Math.min(4, capacityBits - buffer.bits.length));
  buffer.append(0, (8 - (buffer.bits.length % 8)) % 8);
  for (let index = 0; buffer.bits.length < capacityBits; index++) buffer.append(at(PAD_BYTES, index % 2), 8);

  const codewords = new Uint8Array(capacityBits / 8);
  buffer.bits.forEach((bit, index) => {
    codewords[index >>> 3] = at(codewords, index >>> 3) | (bit << (7 - (index & 7)));
  });
  return codewords;
}

/** Secuencia final de codewords (datos y corrección, intercalados por bloques) para colocar en la matriz. */
export function encodeCodewords(bytes: Uint8Array, version: number, level: ErrorCorrectionLevel): Uint8Array {
  const { totalCodewords, blockCount, eccPerBlock } = blockLayout(version, level);
  const data = dataCodewords(bytes, version, level);
  const shortBlockCount = blockCount - (totalCodewords % blockCount);
  const shortBlockLength = Math.floor(totalCodewords / blockCount);
  const generator = generatorPolynomial(eccPerBlock);

  const dataBlocks: Uint8Array[] = [];
  const eccBlocks: Uint8Array[] = [];
  let offset = 0;
  for (let block = 0; block < blockCount; block++) {
    const dataLength = shortBlockLength - eccPerBlock + (block < shortBlockCount ? 0 : 1);
    const blockData = data.subarray(offset, offset + dataLength);
    offset += dataLength;
    dataBlocks.push(blockData);
    eccBlocks.push(reedSolomonRemainder(blockData, generator));
  }

  const result = new Uint8Array(totalCodewords);
  let position = 0;
  const longestData = shortBlockLength - eccPerBlock + 1;
  for (let index = 0; index < longestData; index++) {
    for (const block of dataBlocks) if (index < block.length) result[position++] = at(block, index);
  }
  for (let index = 0; index < eccPerBlock; index++) {
    for (const block of eccBlocks) result[position++] = at(block, index);
  }
  return result;
}
