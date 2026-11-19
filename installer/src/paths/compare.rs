use std::fs;
use std::path::Path;

/// Forma de una ruta apta para comparar con otra (resuelta, sin prefijo `\\?\` y en minúsculas).
pub fn comparable(path: &Path) -> String {
    let resolved = fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());
    let text = resolved.to_string_lossy();
    text.strip_prefix(r"\\?\").unwrap_or(&text).to_lowercase()
}

/// ¿Las dos rutas apuntan al mismo sitio?
pub fn same_path(a: &Path, b: &Path) -> bool {
    comparable(a) == comparable(b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compara_rutas_sin_importar_mayusculas_ni_prefijo() {
        assert!(same_path(
            Path::new(r"C:\NoExiste\App.EXE"),
            Path::new(r"c:\noexiste\app.exe")
        ));
        assert!(same_path(
            Path::new(r"\\?\C:\NoExiste\a.exe"),
            Path::new(r"C:\NoExiste\a.exe")
        ));
        assert!(!same_path(
            Path::new(r"C:\NoExiste\a.exe"),
            Path::new(r"C:\NoExiste\b.exe")
        ));
    }
}
