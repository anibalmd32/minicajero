use std::path::{Path, PathBuf};

const APP_EXE: &str = "minicajero.exe";
const UNINSTALLER_EXE: &str = "uninstall.exe";
const DATA_DIR: &str = "data";
const PORT_FILE: &str = "puerto.txt";

/// Archivos de una instalación a partir de su carpeta.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Layout {
    pub install_dir: PathBuf,
}

impl Layout {
    pub fn new(install_dir: PathBuf) -> Self {
        Self { install_dir }
    }

    pub fn app_exe(&self) -> PathBuf {
        self.install_dir.join(APP_EXE)
    }

    pub fn uninstaller(&self) -> PathBuf {
        self.install_dir.join(UNINSTALLER_EXE)
    }

    pub fn data_dir(&self) -> PathBuf {
        self.install_dir.join(DATA_DIR)
    }

    pub fn port_file(&self) -> PathBuf {
        self.data_dir().join(PORT_FILE)
    }
}

/// Dónde van los accesos directos.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ShortcutPaths {
    pub desktop: PathBuf,
    pub start_menu: PathBuf,
}

impl ShortcutPaths {
    pub fn all(&self) -> [&Path; 2] {
        [&self.desktop, &self.start_menu]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn archivos_de_la_instalacion() {
        let layout = Layout::new(PathBuf::from(r"C:\Apps\MiniCajero"));
        assert_eq!(layout.app_exe(), Path::new(r"C:\Apps\MiniCajero\minicajero.exe"));
        assert_eq!(layout.uninstaller(), Path::new(r"C:\Apps\MiniCajero\uninstall.exe"));
        assert_eq!(layout.port_file(), Path::new(r"C:\Apps\MiniCajero\data\puerto.txt"));
    }
}
