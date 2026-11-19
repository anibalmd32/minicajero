use std::env;
use std::path::{Path, PathBuf};

use windows::Win32::System::Com::CoTaskMemFree;
use windows::Win32::UI::Shell::{
    FOLDERID_Desktop, FOLDERID_Programs, FOLDERID_UserProgramFiles, KF_FLAG_CREATE, SHGetKnownFolderPath,
};
use windows::core::GUID;

use super::layout::ShortcutPaths;
use crate::error::{Context, Result};

/// Variable de entorno que cambia la carpeta de instalación (para pruebas).
const INSTALL_DIR_ENV: &str = "MINICAJERO_INSTALL_DIR";

/// Variable de entorno que redirige los accesos directos a otra carpeta (para pruebas).
const SHORTCUT_DIR_ENV: &str = "MINICAJERO_SHORTCUT_DIR";

const INSTALL_FOLDER_NAME: &str = "MiniCajero";
const SHORTCUT_FILE: &str = "MiniCajero.lnk";

/// Carpeta de instalación: la indicada, `MINICAJERO_INSTALL_DIR` o `%LOCALAPPDATA%\Programs\MiniCajero`.
pub fn install_dir(explicit: Option<&Path>) -> Result<PathBuf> {
    let chosen = match explicit.map(Path::to_path_buf).or_else(|| env_path(INSTALL_DIR_ENV)) {
        Some(path) => path,
        None => known_folder(&FOLDERID_UserProgramFiles)?.join(INSTALL_FOLDER_NAME),
    };
    std::path::absolute(&chosen).context(format!("La carpeta de instalación no es válida: {}", chosen.display()))
}

/// Accesos directos del Escritorio y del menú Inicio del usuario, o en `MINICAJERO_SHORTCUT_DIR` si está definida.
pub fn shortcut_paths() -> Result<ShortcutPaths> {
    if let Some(base) = env_path(SHORTCUT_DIR_ENV) {
        return Ok(test_shortcut_paths(&base));
    }
    Ok(ShortcutPaths {
        desktop: known_folder(&FOLDERID_Desktop)?.join(SHORTCUT_FILE),
        start_menu: known_folder(&FOLDERID_Programs)?.join(SHORTCUT_FILE),
    })
}

fn test_shortcut_paths(base: &Path) -> ShortcutPaths {
    ShortcutPaths {
        desktop: base.join("Escritorio").join(SHORTCUT_FILE),
        start_menu: base.join("Menu Inicio").join(SHORTCUT_FILE),
    }
}

fn env_path(name: &str) -> Option<PathBuf> {
    env::var_os(name)
        .filter(|value| !value.to_string_lossy().trim().is_empty())
        .map(PathBuf::from)
}

fn known_folder(id: &GUID) -> Result<PathBuf> {
    let raw =
        unsafe { SHGetKnownFolderPath(id, KF_FLAG_CREATE, None) }.context("No se encontró una carpeta del sistema")?;
    let path = unsafe { raw.to_hstring() };
    unsafe { CoTaskMemFree(Some(raw.0 as *const _)) };
    Ok(PathBuf::from(path.to_os_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accesos_directos_de_prueba_no_chocan() {
        let paths = test_shortcut_paths(Path::new(r"C:\tmp\atajos"));
        assert_ne!(paths.desktop, paths.start_menu);
        assert!(
            paths
                .all()
                .iter()
                .all(|path| path.file_name().unwrap() == SHORTCUT_FILE)
        );
    }

    #[test]
    fn carpetas_conocidas_del_usuario() {
        assert!(known_folder(&FOLDERID_UserProgramFiles).unwrap().is_absolute());
        assert!(known_folder(&FOLDERID_Desktop).unwrap().is_absolute());
    }
}
