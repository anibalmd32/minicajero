use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, Ordering};

use windows::Win32::System::Registry::{HKEY_CURRENT_USER, RegDeleteKeyW};
use windows::core::HSTRING;

use super::{UninstallEntry, read_string, remove, write};

const TEST_ROOT: &str = r"Software\MiniCajeroPruebasUnitarias";

/// Clave de registro única para una prueba, ajena a la clave real de la app. Se borra al soltarla.
pub struct TempKey(pub String);

impl TempKey {
    pub fn new() -> Self {
        static COUNTER: AtomicU32 = AtomicU32::new(0);
        Self(format!(
            r"{TEST_ROOT}\{}-{}",
            std::process::id(),
            COUNTER.fetch_add(1, Ordering::Relaxed)
        ))
    }

    /// Registra en esta clave una instalación de prueba en `dir`.
    pub fn register(&self, dir: &Path) {
        write(
            &self.0,
            &UninstallEntry {
                display_name: "MiniCajero",
                version: "9.8.7",
                publisher: "Pruebas",
                install_dir: dir,
                app_exe: &dir.join("minicajero.exe"),
                uninstaller: &dir.join("uninstall.exe"),
                estimated_size_kb: 1234,
            },
        )
        .unwrap();
    }
}

impl Drop for TempKey {
    fn drop(&mut self) {
        let _ = remove(&self.0);
        let _ = unsafe { RegDeleteKeyW(HKEY_CURRENT_USER, &HSTRING::from(TEST_ROOT)) };
    }
}

#[test]
fn registra_lee_y_quita_la_entrada() {
    let key = TempKey::new();
    key.register(&PathBuf::from(r"C:\Prueba MiniCajero"));
    assert_eq!(read_string(&key.0, "DisplayVersion").as_deref(), Some("9.8.7"));
    assert_eq!(
        read_string(&key.0, "UninstallString").as_deref(),
        Some(r#""C:\Prueba MiniCajero\uninstall.exe""#)
    );
    assert_eq!(
        read_string(&key.0, "DisplayIcon").as_deref(),
        Some(r"C:\Prueba MiniCajero\minicajero.exe,0")
    );
    remove(&key.0).unwrap();
    assert_eq!(read_string(&key.0, "DisplayName"), None);
    remove(&key.0).unwrap();
}
