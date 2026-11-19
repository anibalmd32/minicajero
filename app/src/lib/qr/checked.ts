/** Elemento de `items` en `index`; lanza `RangeError` si no existe (en un QR bien formado nunca ocurre). */
export function at<T>(items: ArrayLike<T>, index: number): T {
  const item = items[index];
  if (item === undefined) throw new RangeError(`Posición fuera de rango: ${index}`);
  return item;
}
