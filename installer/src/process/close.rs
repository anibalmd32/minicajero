use std::fs;
use std::thread;
use std::time::{Duration, Instant};

use windows::Win32::System::Threading::TerminateProcess;

use super::handle::Process;
use super::instances::running_instances;
use crate::error::{Error, Result};
use crate::http;
use crate::paths::Layout;

const GRACEFUL_TIMEOUT: Duration = Duration::from_secs(15);
const TERMINATE_TIMEOUT: Duration = Duration::from_secs(5);

fn wait_all(processes: &[Process], timeout: Duration) -> bool {
    let deadline = Instant::now() + timeout;
    processes
        .iter()
        .all(|process| process.wait(deadline.saturating_duration_since(Instant::now())))
}

fn request_graceful_shutdown(layout: &Layout) {
    let Some(port) = fs::read_to_string(layout.port_file())
        .ok()
        .as_deref()
        .and_then(http::parse_port)
    else {
        return;
    };
    if http::is_minicajero(port) {
        let _ = http::request_shutdown(port);
    }
}

fn terminate_all(processes: &[Process]) {
    for process in processes {
        let _ = unsafe { TerminateProcess(process.0, 1) };
    }
}

fn still_open_error() -> Error {
    Error::new("MiniCajero sigue abierto y no se pudo cerrar automáticamente")
        .suggest("Cierra MiniCajero e inténtalo de nuevo.")
}

/// Cierra MiniCajero si se está ejecutando desde la carpeta de instalación: primero le pide que se
/// cierre por HTTP (así cierra la base de datos con orden) y, si no termina a tiempo, lo finaliza.
pub fn close_app(layout: &Layout) -> Result<()> {
    let instances = running_instances(&layout.app_exe());
    if instances.is_empty() {
        return Ok(());
    }
    request_graceful_shutdown(layout);
    if wait_all(&instances, GRACEFUL_TIMEOUT) {
        return Ok(());
    }
    terminate_all(&instances);
    if wait_all(&instances, TERMINATE_TIMEOUT) {
        thread::sleep(Duration::from_millis(300));
        return Ok(());
    }
    Err(still_open_error())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sin_app_abierta_no_hace_nada() {
        let layout = Layout::new(crate::files::tests::temp_dir("sin-app"));
        assert!(close_app(&layout).is_ok());
    }
}
