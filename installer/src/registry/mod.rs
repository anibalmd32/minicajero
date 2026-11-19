mod key;
mod read;
#[cfg(test)]
pub mod tests;
mod write;

use std::env;
use std::path::Path;

pub use read::read_string;
pub use write::{remove, write};

/// Variable de entorno que cambia la clave (bajo `HKEY_CURRENT_USER`) donde se registra la app (para pruebas).
const KEY_ENV: &str = "MINICAJERO_REGISTRY_KEY";

const DEFAULT_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Uninstall\MiniCajero";

/// Datos que aparecen en "Aplicaciones instaladas".
pub struct UninstallEntry<'a> {
    pub display_name: &'a str,
    pub version: &'a str,
    pub publisher: &'a str,
    pub install_dir: &'a Path,
    pub app_exe: &'a Path,
    pub uninstaller: &'a Path,
    pub estimated_size_kb: u32,
}

/// Clave del registro de la app bajo `HKEY_CURRENT_USER`: la de `MINICAJERO_REGISTRY_KEY` o la de "Aplicaciones instaladas".
pub fn app_key() -> String {
    env::var(KEY_ENV)
        .ok()
        .map(|value| value.trim().trim_matches('\\').to_owned())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| DEFAULT_KEY.to_owned())
}
