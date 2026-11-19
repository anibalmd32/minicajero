use std::fs;
use std::path::Path;

use super::target::Target;
use crate::error::{Context, Result};
use crate::files;
use crate::paths::{self, Layout};
use crate::process;
use crate::registry;
use crate::shortcuts;

/// ¿La entrada de "Aplicaciones instaladas" (y con ella los accesos directos) es de esta carpeta? Si apunta
/// a otra instalación, no se toca.
fn is_registered_here(registry_key: &str, layout: &Layout) -> bool {
    registry::read_string(registry_key, "InstallLocation")
        .is_none_or(|location| paths::same_path(Path::new(&location), &layout.install_dir))
}

fn delete_data(layout: &Layout) -> Result<()> {
    fs::remove_dir_all(layout.data_dir())
        .context(format!(
            "No se pudieron borrar los datos en {}",
            layout.data_dir().display()
        ))
        .map_err(|error| error.suggest("Cierra los programas que usen tus datos e inténtalo de nuevo."))
}

fn delete_program_files(target: &Target) -> Result<()> {
    let layout = target.layout;
    files::remove_file_if_exists(&layout.app_exe())
        .context(format!("No se pudo borrar {}", layout.app_exe().display()))?;
    files::remove_file_if_exists(&files::temporary_path(&layout.app_exe())).ok();
    files::remove_file_if_exists(&files::temporary_path(&layout.uninstaller())).ok();
    if !target.keep_uninstaller {
        files::remove_file_if_exists(&layout.uninstaller()).context("No se pudo borrar el desinstalador")?;
        files::remove_dir_if_empty(&layout.install_dir);
    }
    Ok(())
}

/// Quita la instalación. Lo que puede fallar por archivos en uso va antes que la entrada del registro:
/// si algo falla, la app sigue en "Aplicaciones instaladas" y se puede reintentar.
pub(super) fn uninstall(target: &Target) -> Result<()> {
    let layout = target.layout;
    process::close_app(layout)?;
    if target.delete_data && layout.data_dir().exists() {
        delete_data(layout)?;
    }
    let registered_here = is_registered_here(target.registry_key, layout);
    if registered_here {
        target.shortcuts.all().into_iter().try_for_each(shortcuts::remove)?;
    }
    delete_program_files(target)?;
    if registered_here {
        registry::remove(target.registry_key)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::super::test_fixture::Installed;
    use std::fs::OpenOptions;
    use std::os::windows::fs::OpenOptionsExt;
    use std::path::Path;

    #[test]
    fn conserva_los_datos_por_defecto() {
        let installed = Installed::new("conservar");
        installed.uninstall(false, false).unwrap();
        assert!(!installed.layout.app_exe().exists());
        assert!(!installed.layout.uninstaller().exists());
        assert!(installed.shortcuts.all().iter().all(|path| !path.exists()));
        assert!(installed.layout.data_dir().join("minicajero.db").exists());
        assert!(!installed.is_registered());
    }

    #[test]
    fn borra_los_datos_si_se_pide() {
        let installed = Installed::new("borrar-datos");
        installed.uninstall(true, false).unwrap();
        assert!(!installed.layout.install_dir.exists());
        assert!(!installed.is_registered());
    }

    #[test]
    fn el_desinstalador_en_uso_se_deja_para_despues() {
        let installed = Installed::new("en-uso");
        installed.uninstall(true, true).unwrap();
        assert!(!installed.layout.app_exe().exists());
        assert!(installed.layout.uninstaller().exists());
        assert!(!installed.is_registered());
    }

    #[test]
    fn si_no_se_pueden_borrar_los_datos_sigue_registrada() {
        let installed = Installed::new("datos-en-uso");
        let database = installed.layout.data_dir().join("minicajero.db");
        let open = OpenOptions::new().read(true).share_mode(0).open(&database).unwrap();
        assert!(installed.uninstall(true, false).is_err());
        assert!(installed.is_registered());
        assert!(installed.layout.app_exe().exists());
        assert!(installed.shortcuts.all().iter().all(|path| path.exists()));
        drop(open);
    }

    #[test]
    fn no_toca_la_entrada_ni_los_accesos_de_otra_instalacion() {
        let installed = Installed::new("otra-instalacion");
        installed.key.register(Path::new(r"C:\Otra\MiniCajero"));
        installed.uninstall(false, false).unwrap();
        assert!(!installed.layout.app_exe().exists());
        assert!(installed.is_registered());
        assert!(installed.shortcuts.all().iter().all(|path| path.exists()));
    }
}
