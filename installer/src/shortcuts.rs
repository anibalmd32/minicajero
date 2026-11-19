use std::fs;
use std::path::Path;

use windows::Win32::System::Com::{
    CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED, CoCreateInstance, CoInitializeEx, CoUninitialize, IPersistFile,
};
use windows::Win32::UI::Shell::{IShellLinkW, ShellLink};
use windows::core::{HSTRING, Interface};

use crate::error::{Context, Result};
use crate::files;

/// Datos de un acceso directo.
pub struct Shortcut<'a> {
    pub target: &'a Path,
    pub working_dir: &'a Path,
    pub description: &'a str,
    pub icon: &'a Path,
}

struct ComApartment {
    initialized: bool,
}

impl ComApartment {
    fn enter() -> Self {
        let initialized = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) }.is_ok();
        Self { initialized }
    }
}

impl Drop for ComApartment {
    fn drop(&mut self) {
        if self.initialized {
            unsafe { CoUninitialize() };
        }
    }
}

/// Crea (o reemplaza) el acceso directo `path` con la interfaz COM `IShellLinkW`, sin lanzar procesos.
pub fn create(path: &Path, shortcut: &Shortcut) -> Result<()> {
    let failure = format!("No se pudo crear el acceso directo {}", path.display());
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).context(failure.clone())?;
    }
    let _apartment = ComApartment::enter();
    unsafe {
        let link: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER).context(failure.clone())?;
        link.SetPath(&HSTRING::from(shortcut.target)).context(failure.clone())?;
        link.SetWorkingDirectory(&HSTRING::from(shortcut.working_dir))
            .context(failure.clone())?;
        link.SetDescription(&HSTRING::from(shortcut.description))
            .context(failure.clone())?;
        link.SetIconLocation(&HSTRING::from(shortcut.icon), 0)
            .context(failure.clone())?;
        let file: IPersistFile = link.cast().context(failure.clone())?;
        file.Save(&HSTRING::from(path), true).context(failure)?;
    }
    Ok(())
}

/// Ruta a la que apunta un acceso directo.
#[cfg(test)]
pub fn target_of(path: &Path) -> Result<std::path::PathBuf> {
    let failure = format!("No se pudo leer el acceso directo {}", path.display());
    let _apartment = ComApartment::enter();
    unsafe {
        let link: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER).context(failure.clone())?;
        let file: IPersistFile = link.cast().context(failure.clone())?;
        file.Load(&HSTRING::from(path), Default::default())
            .context(failure.clone())?;
        let mut buffer = vec![0u16; 32 * 1024];
        link.GetPath(&mut buffer, std::ptr::null_mut(), 0).context(failure)?;
        let length = buffer.iter().position(|&unit| unit == 0).unwrap_or(buffer.len());
        Ok(std::path::PathBuf::from(String::from_utf16_lossy(&buffer[..length])))
    }
}

/// Borra el acceso directo si existe.
pub fn remove(path: &Path) -> Result<()> {
    files::remove_file_if_exists(path).context(format!("No se pudo borrar el acceso directo {}", path.display()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn crea_lee_y_borra_un_acceso_directo() {
        let dir = files::tests::temp_dir("atajo");
        let target = std::env::current_exe().unwrap();
        let path = dir.join("sub").join("Prueba.lnk");
        let shortcut = Shortcut {
            target: &target,
            working_dir: &dir,
            description: "Prueba de acceso directo",
            icon: &target,
        };
        create(&path, &shortcut).unwrap();
        assert!(crate::paths::same_path(&target_of(&path).unwrap(), &target));
        remove(&path).unwrap();
        assert!(!path.exists());
        remove(&path).unwrap();
        fs::remove_dir_all(dir).unwrap();
    }
}
