/** ¿El bit `bit` de `bits` vale 1? */
export function isBitSet(bits: number, bit: number): boolean {
  return ((bits >>> bit) & 1) === 1;
}

/** Información de formato de 15 bits (nivel y máscara, BCH(15,5) con la máscara 0x5412). */
export function formatBits(levelBits: number, mask: number): number {
  const data = (levelBits << 3) | mask;
  let remainder = data;
  for (let step = 0; step < 10; step++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  return ((data << 10) | remainder) ^ 0x5412;
}

/** Información de versión de 18 bits (BCH(18,6)); solo se usa desde la versión 7. */
export function versionBits(version: number): number {
  let remainder = version;
  for (let step = 0; step < 12; step++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
  return (version << 12) | remainder;
}
