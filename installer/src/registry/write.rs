use std::path::Path;

use windows::Win32::Foundation::ERROR_FILE_NOT_FOUND;
use windows::Win32::System::Registry::{HKEY, HKEY_CURRENT_USER, KEY_WRITE, REG_OPTION_NON_VOLATILE};
use windows::Win32::System::Registry::{RegCreateKeyExW, RegDeleteTreeW};
use windows::core::HSTRING;

use super::UninstallEntry;
use super::key::{Key, check, set_dword, set_string};
use crate::error::Result;

fn quoted(path: &Path) -> String {
    format!("\"{}\"", path.display())
}

fn create_key(key_path: &str) -> Result<Key> {
    let mut handle = HKEY::default();
    let status = unsafe {
        RegCreateKeyExW(
            HKEY_CURRENT_USER,
            &HSTRING::from(key_path),
            None,
            None,
            REG_OPTION_NON_VOLATILE,
            KEY_WRITE,
            None,
            &mut handle,
            None,
        )
    };
    check(status, "registrar la aplicación")?;
    Ok(Key(handle))
}

fn write_values(key: &Key, entry: &UninstallEntry) -> Result<()> {
    set_string(key, "DisplayName", entry.display_name)?;
    set_string(key, "DisplayVersion", entry.version)?;
    set_string(key, "Publisher", entry.publisher)?;
    set_string(key, "DisplayIcon", &format!("{},0", entry.app_exe.display()))?;
    set_string(key, "InstallLocation", &entry.install_dir.display().to_string())?;
    set_string(key, "UninstallString", &quoted(entry.uninstaller))?;
    set_string(
        key,
        "QuietUninstallString",
        &format!("{} --silent", quoted(entry.uninstaller)),
    )?;
    set_dword(key, "NoModify", 1)?;
    set_dword(key, "NoRepair", 1)?;
    set_dword(key, "EstimatedSize", entry.estimated_size_kb)
}

/// Registra (o actualiza) la app en "Aplicaciones instaladas" del usuario, en la clave `key_path`.
pub fn write(key_path: &str, entry: &UninstallEntry) -> Result<()> {
    let key = create_key(key_path)?;
    write_values(&key, entry)
}

/// Quita la clave `key_path` de "Aplicaciones instaladas" (no falla si ya no estaba).
pub fn remove(key_path: &str) -> Result<()> {
    let status = unsafe { RegDeleteTreeW(HKEY_CURRENT_USER, &HSTRING::from(key_path)) };
    if status == ERROR_FILE_NOT_FOUND {
        return Ok(());
    }
    check(status, "quitar la aplicación de la lista de programas")
}
