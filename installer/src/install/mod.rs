mod copy_failure;
mod launch;
mod steps;

use std::env;
use std::path::PathBuf;

pub use launch::launch;

use crate::cli::Options;
use crate::dialogs;
use crate::error::{Context, Result};
use crate::paths::{self, Layout, ShortcutPaths};
use crate::payload::APP_NAME;
use crate::registry;
use steps::install;

/// Resultado de una ejecución.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Outcome {
    Done,
    Cancelled,
}

struct Plan {
    layout: Layout,
    shortcuts: ShortcutPaths,
    registry_key: String,
    installer: PathBuf,
}

impl Plan {
    fn new(options: &Options) -> Result<Self> {
        Ok(Self {
            layout: Layout::new(paths::install_dir(options.install_dir.as_deref())?),
            shortcuts: paths::shortcut_paths()?,
            registry_key: registry::app_key(),
            installer: env::current_exe().context("No se pudo localizar el instalador")?,
        })
    }

    fn install(&self) -> Result<()> {
        install(&self.layout, &self.shortcuts, &self.registry_key, &self.installer)
    }
}

fn progress_instruction(updating: bool) -> String {
    if updating {
        format!("Actualizando {APP_NAME}…")
    } else {
        format!("Instalando {APP_NAME}…")
    }
}

fn open_after_install(layout: &Layout) {
    if let Err(error) = launch(layout) {
        dialogs::error(
            &format!("No se pudo abrir {APP_NAME}."),
            "Ábrelo desde el acceso directo del Escritorio.",
            &error.to_string(),
        );
    }
}

/// Instala o actualiza MiniCajero, con diálogos salvo en modo silencioso.
pub fn run(options: &Options) -> Result<Outcome> {
    let plan = Plan::new(options)?;
    let updating = plan.layout.app_exe().exists();

    if options.silent {
        plan.install()?;
        return Ok(Outcome::Done);
    }
    if !dialogs::welcome(updating) {
        return Ok(Outcome::Cancelled);
    }
    dialogs::with_progress(&progress_instruction(updating), || plan.install())?;
    if dialogs::installed(updating) {
        open_after_install(&plan.layout);
    }
    Ok(Outcome::Done)
}
