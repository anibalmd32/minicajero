use std::fs;
use std::path::PathBuf;

use super::remove::uninstall;
use super::target::Target;
use crate::error::Result;
use crate::files;
use crate::paths::{Layout, ShortcutPaths};
use crate::registry::{self, tests::TempKey};

pub(super) struct Installed {
    root: PathBuf,
    pub(super) layout: Layout,
    pub(super) shortcuts: ShortcutPaths,
    pub(super) key: TempKey,
}

impl Installed {
    pub(super) fn new(name: &str) -> Self {
        let root = files::tests::temp_dir(name);
        let layout = Layout::new(root.join("MiniCajero"));
        fs::create_dir_all(layout.data_dir()).unwrap();
        fs::write(layout.app_exe(), b"app").unwrap();
        fs::write(layout.uninstaller(), b"desinstalador").unwrap();
        fs::write(layout.data_dir().join("minicajero.db"), b"datos").unwrap();
        let shortcuts = ShortcutPaths {
            desktop: root.join("Escritorio.lnk"),
            start_menu: root.join("Inicio.lnk"),
        };
        for path in shortcuts.all() {
            fs::write(path, b"lnk").unwrap();
        }
        let key = TempKey::new();
        key.register(&layout.install_dir);
        Self {
            root,
            layout,
            shortcuts,
            key,
        }
    }

    pub(super) fn uninstall(&self, delete_data: bool, keep_uninstaller: bool) -> Result<()> {
        uninstall(&Target {
            layout: &self.layout,
            shortcuts: &self.shortcuts,
            registry_key: &self.key.0,
            delete_data,
            keep_uninstaller,
        })
    }

    pub(super) fn is_registered(&self) -> bool {
        registry::read_string(&self.key.0, "DisplayName").is_some()
    }
}

impl Drop for Installed {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.root);
    }
}
