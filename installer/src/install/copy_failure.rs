use std::io;
use std::path::Path;

use crate::error::Error;

const ERROR_ACCESS_DENIED: i32 = 5;
const ERROR_SHARING_VIOLATION: i32 = 32;
const ERROR_LOCK_VIOLATION: i32 = 33;
const ERROR_HANDLE_DISK_FULL: i32 = 39;
const ERROR_DISK_FULL: i32 = 112;

/// Mensaje para el usuario cuando no se puede escribir `what` en `dir`, según la causa.
pub(super) fn copy_failure(err: &io::Error, what: &str, dir: &Path) -> Error {
    let action = match err.raw_os_error() {
        Some(ERROR_ACCESS_DENIED | ERROR_SHARING_VIOLATION | ERROR_LOCK_VIOLATION) => {
            "Cierra MiniCajero e inténtalo de nuevo."
        }
        Some(ERROR_HANDLE_DISK_FULL | ERROR_DISK_FULL) => "Libera espacio en el disco e inténtalo de nuevo.",
        _ => "Reinicia el equipo e inténtalo de nuevo.",
    };
    Error::with_cause(format!("No se pudo copiar {what} en {}", dir.display()), err).suggest(action)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::payload::APP_NAME;

    #[test]
    fn el_error_de_copia_explica_la_causa() {
        let dir = Path::new(r"C:\Apps\MiniCajero");
        let locked = copy_failure(&io::Error::from_raw_os_error(32), APP_NAME, dir);
        assert!(
            locked
                .to_string()
                .starts_with(r"No se pudo copiar MiniCajero en C:\Apps\MiniCajero")
        );
        assert_eq!(locked.action(), "Cierra MiniCajero e inténtalo de nuevo.");
        let denied = copy_failure(&io::Error::from_raw_os_error(5), APP_NAME, dir);
        assert_eq!(denied.action(), "Cierra MiniCajero e inténtalo de nuevo.");
        let full = copy_failure(&io::Error::from_raw_os_error(112), APP_NAME, dir);
        assert_eq!(full.action(), "Libera espacio en el disco e inténtalo de nuevo.");
        let other = copy_failure(&io::Error::other("raro"), APP_NAME, dir);
        assert_eq!(other.action(), "Reinicia el equipo e inténtalo de nuevo.");
    }
}
