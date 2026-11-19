import { hashPassword } from "../src/lib/password";
import { MASTER_RESET_KEY_PATTERN } from "../src/modules/auth/master-reset-key";

/**
 * Genera el hash de una clave maestra de reinicio nueva. Imprime las dos líneas que van en `app/.env.local`
 * (archivo que no se sube al repositorio). Uso: bun scripts/hash-master-key.ts <clave>
 */
const key = process.argv[2]?.trim() ?? "";
if (!MASTER_RESET_KEY_PATTERN.test(key)) {
  console.error("La clave debe tener entre 6 y 12 dígitos. Uso: bun scripts/hash-master-key.ts <clave>");
  process.exit(64);
}
const { hash, salt } = hashPassword(key);
console.log(`MINICAJERO_MASTER_KEY_HASH=${hash}\nMINICAJERO_MASTER_KEY_SALT=${salt}`);
