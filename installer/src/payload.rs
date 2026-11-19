/// Binario de MiniCajero incrustado en el instalador.
#[cfg(not(test))]
pub static APP_EXE: &[u8] = include_bytes!(env!("MINICAJERO_APP_EXE_PATH"));

#[cfg(test)]
pub static APP_EXE: &[u8] = b"MZ";

/// Versión de la aplicación (la de `app/package.json`).
pub const VERSION: &str = env!("MINICAJERO_VERSION");

/// Nombre visible de la aplicación.
pub const APP_NAME: &str = "MiniCajero";

/// Editor que aparece en "Aplicaciones instaladas".
pub const PUBLISHER: &str = "MiniCajero";
