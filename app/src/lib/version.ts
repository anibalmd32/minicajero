import packageJson from "../../package.json";

/** Identificador con el que la API se presenta en `/api/v1/health` (para reconocer una instancia ya abierta). */
export const APP_ID = "minicajero";

/** Nombre visible de la aplicación. */
export const APP_NAME = "MiniCajero";

/** Versión de la aplicación (la de `package.json`). */
export const APP_VERSION: string = packageJson.version;
