import { at } from "./checked";

const PRIMITIVE_POLYNOMIAL = 0x11d;

function gfMultiply(a: number, b: number): number {
  let product = 0;
  for (let bit = 7; bit >= 0; bit--) {
    product = (product << 1) ^ ((product >>> 7) * PRIMITIVE_POLYNOMIAL);
    product ^= ((b >>> bit) & 1) * a;
  }
  return product;
}

/** Polinomio generador de grado `degree` (coeficientes de mayor a menor grado, sin el término líder). */
export function generatorPolynomial(degree: number): Uint8Array {
  const coefficients = new Uint8Array(degree);
  coefficients[degree - 1] = 1;
  let root = 1;
  for (let step = 0; step < degree; step++) {
    for (let index = 0; index < degree; index++) {
      coefficients[index] = gfMultiply(at(coefficients, index), root);
      if (index + 1 < degree) coefficients[index] = at(coefficients, index) ^ at(coefficients, index + 1);
    }
    root = gfMultiply(root, 0x02);
  }
  return coefficients;
}

/** Codewords de corrección Reed-Solomon de `data` para el polinomio generador `generator`. */
export function reedSolomonRemainder(data: Uint8Array, generator: Uint8Array): Uint8Array {
  const remainder = new Uint8Array(generator.length);
  for (const byte of data) {
    const factor = byte ^ at(remainder, 0);
    remainder.copyWithin(0, 1);
    remainder[remainder.length - 1] = 0;
    for (let index = 0; index < generator.length; index++)
      remainder[index] = at(remainder, index) ^ gfMultiply(at(generator, index), factor);
  }
  return remainder;
}
