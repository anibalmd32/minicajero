/** Deja solo los dígitos de un texto. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Quita los ceros a la izquierda, conservando al menos un dígito. */
export function withoutLeadingZeros(digits: string): string {
  return digits.replace(/^0+(?=\d)/, "");
}
