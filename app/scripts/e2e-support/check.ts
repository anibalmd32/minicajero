let failures = 0;

/** Anota una comprobación: imprime `OK` o `FALLA` (con el detalle) y cuenta los fallos. */
export function check(condition: boolean, label: string, detail?: unknown): void {
  if (!condition) failures++;
  console.log(
    `${condition ? "OK  " : "FALLA"} ${label}${!condition && detail !== undefined ? ` → ${JSON.stringify(detail)}` : ""}`,
  );
}

/** Imprime el resumen y termina el proceso con 0 si todo salió bien. */
export function finish(): never {
  console.log(failures === 0 ? "\nTodo correcto" : `\n${failures} comprobaciones fallaron`);
  process.exit(failures === 0 ? 0 : 1);
}
