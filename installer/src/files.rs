use std::ffi::OsString;
use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::thread;
use std::time::Duration;

const ATTEMPTS: u32 = 20;
const RETRY_DELAY: Duration = Duration::from_millis(250);

/// Escribe `target` sin dejarlo a medias: vuelca el contenido a un archivo temporal en la misma carpeta y
/// luego lo renombra sobre el destino (reintenta un rato si otro proceso aún lo tiene abierto).
pub fn replace_atomically(target: &Path, write: impl FnOnce(&mut File) -> io::Result<()>) -> io::Result<()> {
    let temporary = temporary_path(target);
    let written = File::create(&temporary).and_then(|mut file| {
        write(&mut file)?;
        file.flush()?;
        file.sync_all()
    });
    let result = written.and_then(|()| retry(|| fs::rename(&temporary, target)));
    if result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    result
}

/// Borra el archivo si existe (reintenta si está en uso un momento).
pub fn remove_file_if_exists(path: &Path) -> io::Result<()> {
    retry(|| match fs::remove_file(path) {
        Err(err) if err.kind() == io::ErrorKind::NotFound => Ok(()),
        other => other,
    })
}

/// Borra la carpeta solo si existe y está vacía.
pub fn remove_dir_if_empty(path: &Path) {
    let _ = fs::remove_dir(path);
}

/// Archivo temporal que usa `replace_atomically` para `target`.
pub fn temporary_path(target: &Path) -> PathBuf {
    let mut name = target.file_name().map(OsString::from).unwrap_or_default();
    name.push(".nuevo");
    target.with_file_name(name)
}

fn retry<T>(mut operation: impl FnMut() -> io::Result<T>) -> io::Result<T> {
    let mut attempt = 1;
    loop {
        match operation() {
            Err(err) if attempt < ATTEMPTS && is_transient(&err) => {
                attempt += 1;
                thread::sleep(RETRY_DELAY);
            }
            other => return other,
        }
    }
}

fn is_transient(err: &io::Error) -> bool {
    const ERROR_ACCESS_DENIED: i32 = 5;
    const ERROR_SHARING_VIOLATION: i32 = 32;
    const ERROR_LOCK_VIOLATION: i32 = 33;
    matches!(
        err.raw_os_error(),
        Some(ERROR_ACCESS_DENIED | ERROR_SHARING_VIOLATION | ERROR_LOCK_VIOLATION)
    )
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};

    /// Carpeta temporal vacía y única para una prueba.
    pub fn temp_dir(name: &str) -> PathBuf {
        static COUNTER: AtomicU32 = AtomicU32::new(0);
        let dir = std::env::temp_dir().join(format!(
            "lb-setup-{name}-{}-{}",
            std::process::id(),
            COUNTER.fetch_add(1, Ordering::Relaxed)
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn crea_y_reemplaza_sin_dejar_temporales() {
        let dir = temp_dir("reemplazo");
        let target = dir.join("app.exe");
        replace_atomically(&target, |file| file.write_all(b"v1")).unwrap();
        replace_atomically(&target, |file| file.write_all(b"v2")).unwrap();
        assert_eq!(fs::read(&target).unwrap(), b"v2");
        assert!(!temporary_path(&target).exists());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn si_falla_la_escritura_conserva_el_original() {
        let dir = temp_dir("fallo");
        let target = dir.join("app.exe");
        fs::write(&target, b"original").unwrap();
        let result = replace_atomically(&target, |file| {
            file.write_all(b"a medias")?;
            Err(io::Error::other("sin espacio"))
        });
        assert!(result.is_err());
        assert_eq!(fs::read(&target).unwrap(), b"original");
        assert!(!temporary_path(&target).exists());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn borrar_lo_que_no_existe_no_falla() {
        let dir = temp_dir("borrar");
        remove_file_if_exists(&dir.join("nada.exe")).unwrap();
        remove_dir_if_empty(&dir);
        assert!(!dir.exists());
    }
}
