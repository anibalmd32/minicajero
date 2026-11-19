/** Devuelve el elemento con ese `id` o lanza un error claro si la página no lo tiene. */
export function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Falta el elemento #${id} en la página`);
  return element as T;
}
