import type { Migration } from "./migrator";
import { initialSchema } from "./schema/initial-schema";
import { addInvoiceVoidReason, authSchema, paymentsWithoutIdReuse } from "./schema/later-migrations";
import { addCustomerSearchKeys, addInventorySupport, addSearchText } from "./schema/search-migrations";

/** Migraciones de la aplicación, en orden. Se definen en código para que viajen dentro del binario compilado. Nunca editar una ya publicada: añadir una nueva. */
export const migrations: readonly Migration[] = [
  { version: 1, name: "esquema_inicial", up: initialSchema },
  { version: 2, name: "clientes_claves_busqueda", up: addCustomerSearchKeys },
  { version: 3, name: "inventario_busqueda_movimientos_stock_bajo", up: addInventorySupport },
  { version: 4, name: "texto_busqueda_normalizado", up: addSearchText },
  { version: 5, name: "facturas_motivo_anulacion", up: addInvoiceVoidReason },
  { version: 6, name: "abonos_sin_reutilizar_ids", up: paymentsWithoutIdReuse },
  { version: 7, name: "acceso_usuario_sesiones", up: authSchema },
];
