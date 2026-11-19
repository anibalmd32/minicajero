use std::env;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

use windows::Win32::System::Threading::CREATE_NO_WINDOW;

const SELF_DELETE_ATTEMPTS: u32 = 600;

/// Un ejecutable no puede borrarse mientras corre, y programar su borrado (`MoveFileExW` al reiniciar)
/// exige permisos de administrador. Se deja un `cmd` sin ventana (`CREATE_NO_WINDOW`) que reintenta
/// borrar `uninstall.exe` hasta que este proceso termina y luego quita la carpeta si quedó vacía.
pub(super) fn delete_after_exit(uninstaller: &Path, install_dir: &Path) {
    let system_root = env::var_os("SystemRoot").map_or_else(|| PathBuf::from(r"C:\Windows"), PathBuf::from);
    let _ = Command::new(system_root.join("System32").join("cmd.exe"))
        .raw_arg(self_delete_script(uninstaller, install_dir))
        .current_dir(env::temp_dir())
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .creation_flags(CREATE_NO_WINDOW.0)
        .spawn();
}

fn self_delete_script(file: &Path, dir: &Path) -> String {
    let file = file.display();
    let dir = dir.display();
    format!(
        "/d /q /c \"(for /l %n in (1,1,{SELF_DELETE_ATTEMPTS}) do @if exist \"{file}\" (ping -n 2 127.0.0.1 >nul & del /f /q \"{file}\" >nul 2>&1)) & rd \"{dir}\" >nul 2>&1\""
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn el_borrado_diferido_reintenta_y_quita_la_carpeta() {
        let script = self_delete_script(
            Path::new(r"C:\Users\Ana María\Programs\MiniCajero\uninstall.exe"),
            Path::new(r"C:\Users\Ana María\Programs\MiniCajero"),
        );
        assert!(script.starts_with("/d /q /c \"(for /l %n in (1,1,600) do @if exist "));
        assert!(script.contains(r#"del /f /q "C:\Users\Ana María\Programs\MiniCajero\uninstall.exe""#));
        assert!(script.ends_with(r#") & rd "C:\Users\Ana María\Programs\MiniCajero" >nul 2>&1""#));
    }
}
