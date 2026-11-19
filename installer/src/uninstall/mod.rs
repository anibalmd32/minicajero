mod remove;
mod self_delete;
mod target;
#[cfg(test)]
mod test_fixture;

use std::env;
use std::path::{Path, PathBuf};

use crate::cli::Options;
use crate::dialogs::{self, DataChoice};
use crate::error::{Context, Error, Result};
use crate::install::Outcome;
use crate::paths::{self, Layout};
use crate::payload::APP_NAME;
use crate::registry;
use remove::uninstall;
use self_delete::delete_after_exit;
use target::Target;

fn install_dir(options: &Options, current: &Path) -> Result<PathBuf> {
    if options.install_dir.is_none()
        && is_named_uninstaller(current)
        && let Some(dir) = current.parent()
    {
        return Ok(dir.to_path_buf());
    }
    paths::install_dir(options.install_dir.as_deref())
}

fn is_named_uninstaller(current: &Path) -> bool {
    current
        .file_name()
        .is_some_and(|name| name.to_string_lossy().eq_ignore_ascii_case("uninstall.exe"))
}

/// Evita borrar una carpeta cualquiera: solo se desinstala donde hay una instalación de MiniCajero.
fn ensure_installed(layout: &Layout) -> Result<()> {
    if layout.app_exe().is_file() || layout.uninstaller().is_file() {
        return Ok(());
    }
    Err(Error::new(format!(
        "No se encontró una instalación de {APP_NAME} en {}",
        layout.install_dir.display()
    )))
}

/// Si se borran los datos; `None` si el usuario cancela.
fn choose_delete_data(options: &Options, layout: &Layout) -> Option<bool> {
    if options.silent {
        return Some(options.delete_data);
    }
    if !dialogs::confirm_uninstall() {
        return None;
    }
    match layout.data_dir().exists().then(dialogs::ask_delete_data) {
        Some(DataChoice::Cancel) => None,
        Some(DataChoice::Delete) => Some(true),
        Some(DataChoice::Keep) | None => Some(false),
    }
}

/// Desinstala MiniCajero, con diálogos salvo en modo silencioso.
pub fn run(options: &Options) -> Result<Outcome> {
    let current = env::current_exe().context("No se pudo localizar el desinstalador")?;
    let layout = Layout::new(install_dir(options, &current)?);
    ensure_installed(&layout)?;
    let shortcuts = paths::shortcut_paths()?;
    let registry_key = registry::app_key();
    let runs_from_install_dir = paths::same_path(&current, &layout.uninstaller());
    let Some(delete_data) = choose_delete_data(options, &layout) else {
        return Ok(Outcome::Cancelled);
    };
    let target = Target {
        layout: &layout,
        shortcuts: &shortcuts,
        registry_key: &registry_key,
        delete_data,
        keep_uninstaller: runs_from_install_dir,
    };

    if options.silent {
        uninstall(&target)?;
    } else {
        dialogs::with_progress(&format!("Desinstalando {APP_NAME}…"), || uninstall(&target))?;
        dialogs::uninstalled(!delete_data && layout.data_dir().exists());
    }
    if runs_from_install_dir {
        delete_after_exit(&current, &layout.install_dir);
    }
    Ok(Outcome::Done)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::files;
    use std::fs;

    #[test]
    fn rechaza_carpetas_sin_instalacion() {
        let dir = files::tests::temp_dir("sin-instalacion");
        fs::create_dir_all(dir.join("data")).unwrap();
        let error = ensure_installed(&Layout::new(dir.clone())).unwrap_err().to_string();
        assert!(error.starts_with("No se encontró una instalación de MiniCajero en "));
        fs::write(dir.join("uninstall.exe"), b"desinstalador").unwrap();
        assert!(ensure_installed(&Layout::new(dir.clone())).is_ok());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn el_desinstalador_usa_su_propia_carpeta() {
        let options = Options::default();
        let current = Path::new(r"C:\Apps\MiniCajero\uninstall.exe");
        assert_eq!(
            install_dir(&options, current).unwrap(),
            Path::new(r"C:\Apps\MiniCajero")
        );
    }
}
