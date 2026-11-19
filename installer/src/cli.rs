use std::ffi::{OsStr, OsString};
use std::path::{Path, PathBuf};

/// Qué hace esta ejecución.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Mode {
    #[default]
    Install,
    Uninstall,
}

/// Opciones de la línea de órdenes.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Options {
    pub mode: Mode,
    pub silent: bool,
    pub delete_data: bool,
    pub install_dir: Option<PathBuf>,
}

/// Uso admitido, para el mensaje de error de argumentos.
pub const USAGE: &str = "Uso: MiniCajero-Setup.exe [--silent] [--install-dir <carpeta>]\n     MiniCajero-Setup.exe --uninstall [--silent] [--delete-data] [--install-dir <carpeta>]";

/// Interpreta los argumentos. Un ejecutable llamado `uninstall.exe` desinstala aunque no reciba `--uninstall`.
pub fn parse<I>(args: I, executable: &Path) -> Result<Options, String>
where
    I: IntoIterator<Item = OsString>,
{
    let mut options = Options {
        mode: if is_uninstaller_name(executable) {
            Mode::Uninstall
        } else {
            Mode::Install
        },
        ..Options::default()
    };
    let mut args = args.into_iter();
    while let Some(arg) = args.next() {
        match arg.to_string_lossy().to_ascii_lowercase().as_str() {
            "--uninstall" => options.mode = Mode::Uninstall,
            "--silent" => options.silent = true,
            "--delete-data" => options.delete_data = true,
            "--install-dir" => options.install_dir = Some(PathBuf::from(required_value(&mut args, "--install-dir")?)),
            _ => return Err(format!("Argumento desconocido: {}\n\n{USAGE}", arg.display())),
        }
    }
    if options.delete_data && options.mode == Mode::Install {
        return Err(format!("--delete-data solo se usa con --uninstall\n\n{USAGE}"));
    }
    Ok(options)
}

fn required_value(args: &mut impl Iterator<Item = OsString>, name: &str) -> Result<OsString, String> {
    args.next()
        .filter(|value| !value.is_empty())
        .ok_or_else(|| format!("Falta el valor de {name}\n\n{USAGE}"))
}

fn is_uninstaller_name(executable: &Path) -> bool {
    executable
        .file_stem()
        .and_then(OsStr::to_str)
        .is_some_and(|stem| stem.eq_ignore_ascii_case("uninstall"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse_args(args: &[&str], executable: &str) -> Result<Options, String> {
        parse(args.iter().map(OsString::from), Path::new(executable))
    }

    #[test]
    fn sin_argumentos_instala() {
        assert_eq!(
            parse_args(&[], r"C:\Descargas\MiniCajero-Setup.exe"),
            Ok(Options::default())
        );
    }

    #[test]
    fn uninstall_exe_desinstala() {
        let options = parse_args(&[], r"C:\Programs\MiniCajero\Uninstall.EXE").unwrap();
        assert_eq!(options.mode, Mode::Uninstall);
    }

    #[test]
    fn opciones_de_desinstalacion_silenciosa() {
        let options = parse_args(
            &[
                "--uninstall",
                "--SILENT",
                "--delete-data",
                "--install-dir",
                r"D:\prueba",
            ],
            "setup.exe",
        )
        .unwrap();
        assert_eq!(
            options,
            Options {
                mode: Mode::Uninstall,
                silent: true,
                delete_data: true,
                install_dir: Some(PathBuf::from(r"D:\prueba")),
            }
        );
    }

    #[test]
    fn rechaza_argumentos_invalidos() {
        assert!(parse_args(&["--borrar"], "setup.exe").unwrap_err().contains("--borrar"));
        assert!(
            parse_args(&["--install-dir"], "setup.exe")
                .unwrap_err()
                .contains("Falta el valor")
        );
        assert!(parse_args(&["--after-pid", "42"], "setup.exe").is_err());
        assert!(parse_args(&["--delete-data"], "setup.exe").is_err());
    }
}
