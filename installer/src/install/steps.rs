use std::fs::{self, File};
use std::io::{self, Write};
use std::path::Path;

use super::copy_failure::copy_failure;
use crate::error::{Context, Result};
use crate::files;
use crate::paths::{self, Layout, ShortcutPaths};
use crate::payload::{APP_EXE, APP_NAME, PUBLISHER, VERSION};
use crate::process;
use crate::registry::{self, UninstallEntry};
use crate::shortcuts::{self, Shortcut};

pub(super) fn install(layout: &Layout, shortcuts: &ShortcutPaths, registry_key: &str, installer: &Path) -> Result<()> {
    let dir = &layout.install_dir;
    fs::create_dir_all(dir).context(format!("No se pudo crear la carpeta de instalación {}", dir.display()))?;
    process::close_app(layout)?;
    files::replace_atomically(&layout.app_exe(), |file| file.write_all(APP_EXE))
        .map_err(|err| copy_failure(&err, APP_NAME, dir))?;
    copy_uninstaller(installer, &layout.uninstaller())?;
    create_shortcuts(layout, shortcuts)?;
    register(layout, registry_key)
}

fn register(layout: &Layout, registry_key: &str) -> Result<()> {
    registry::write(
        registry_key,
        &UninstallEntry {
            display_name: APP_NAME,
            version: VERSION,
            publisher: PUBLISHER,
            install_dir: &layout.install_dir,
            app_exe: &layout.app_exe(),
            uninstaller: &layout.uninstaller(),
            estimated_size_kb: estimated_size_kb(layout),
        },
    )
}

fn copy_uninstaller(installer: &Path, uninstaller: &Path) -> Result<()> {
    if paths::same_path(installer, uninstaller) {
        return Ok(());
    }
    files::replace_atomically(uninstaller, |file| {
        io::copy(&mut File::open(installer)?, file).map(drop)
    })
    .map_err(|err| copy_failure(&err, "el desinstalador", uninstaller.parent().unwrap_or(uninstaller)))
}

fn create_shortcuts(layout: &Layout, shortcuts: &ShortcutPaths) -> Result<()> {
    let app_exe = layout.app_exe();
    let shortcut = Shortcut {
        target: &app_exe,
        working_dir: &layout.install_dir,
        description: "Abrir MiniCajero",
        icon: &app_exe,
    };
    shortcuts
        .all()
        .into_iter()
        .try_for_each(|path| shortcuts::create(path, &shortcut))
}

fn estimated_size_kb(layout: &Layout) -> u32 {
    let bytes: u64 = [layout.app_exe(), layout.uninstaller()]
        .iter()
        .filter_map(|path| fs::metadata(path).ok())
        .map(|metadata| metadata.len())
        .sum();
    u32::try_from(bytes.div_ceil(1024)).unwrap_or(u32::MAX)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn el_desinstalador_es_una_copia_del_instalador() {
        let dir = files::tests::temp_dir("copia");
        let installer = dir.join("setup.exe");
        fs::write(&installer, b"instalador").unwrap();
        let layout = Layout::new(dir.join("app"));
        fs::create_dir_all(&layout.install_dir).unwrap();
        copy_uninstaller(&installer, &layout.uninstaller()).unwrap();
        assert_eq!(fs::read(layout.uninstaller()).unwrap(), b"instalador");
        copy_uninstaller(&layout.uninstaller(), &layout.uninstaller()).unwrap();
        assert_eq!(estimated_size_kb(&layout), 1);
        fs::remove_dir_all(dir).unwrap();
    }
}
