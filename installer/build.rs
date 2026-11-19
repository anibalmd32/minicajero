use std::env;
use std::fs;
use std::path::{Path, PathBuf};

const APP_EXE_ENV: &str = "MINICAJERO_APP_EXE";

fn main() {
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR"));
    let app_dir = manifest_dir.join("..").join("app");
    let app_exe = app_executable(&app_dir);
    let version = app_version(&app_dir.join("package.json"));
    let icon = app_dir.join("assets").join("minicajero.ico");
    let manifest = manifest_dir.join("resources").join("setup.manifest");
    require_file(&icon, "falta el icono: genéralo con `cd app && bun run icon`");

    println!("cargo:rerun-if-env-changed={APP_EXE_ENV}");
    println!("cargo:rerun-if-changed={}", app_exe.display());
    println!("cargo:rerun-if-changed={}", app_dir.join("package.json").display());
    println!("cargo:rerun-if-changed={}", icon.display());
    println!("cargo:rerun-if-changed={}", manifest.display());
    println!("cargo:rustc-env=MINICAJERO_APP_EXE_PATH={}", app_exe.display());
    println!("cargo:rustc-env=MINICAJERO_VERSION={version}");

    let out_dir = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR"));
    let rc_path = out_dir.join("setup.rc");
    fs::write(&rc_path, resource_script(&icon, &manifest, &version)).expect("no se pudo escribir setup.rc");
    embed_resource::compile_for_everything(&rc_path, embed_resource::NONE)
        .manifest_required()
        .expect("no se pudieron compilar los recursos (icono y manifiesto) del instalador");
}

fn app_executable(app_dir: &Path) -> PathBuf {
    let path = env::var_os(APP_EXE_ENV)
        .map(PathBuf::from)
        .unwrap_or_else(|| app_dir.join("dist").join("minicajero.exe"));
    require_file(
        &path,
        "falta el binario de la app: compílalo primero con `cd app && bun run build` (o usa installer/build.ps1)",
    );
    fs::canonicalize(&path).unwrap_or(path)
}

fn require_file(path: &Path, hint: &str) {
    if !path.is_file() {
        panic!("\n\nNo se encontró {}: {hint}\n", path.display());
    }
}

fn app_version(package_json: &Path) -> String {
    let text = fs::read_to_string(package_json).expect("no se pudo leer app/package.json");
    let after_key = text
        .split_once("\"version\"")
        .map(|(_, rest)| rest)
        .expect("app/package.json no tiene \"version\"");
    let after_colon = after_key
        .trim_start()
        .strip_prefix(':')
        .expect("\"version\" mal formado");
    let quoted = after_colon
        .trim_start()
        .strip_prefix('"')
        .expect("\"version\" debe ser un texto");
    let version = quoted.split('"').next().unwrap_or_default().to_owned();
    assert!(!version.is_empty(), "\"version\" de app/package.json está vacía");
    version
}

fn numeric_version(version: &str) -> String {
    let mut parts: Vec<String> = version
        .split(['.', '-', '+'])
        .take(4)
        .map(|part| part.chars().take_while(char::is_ascii_digit).collect::<String>())
        .map(|digits| if digits.is_empty() { "0".to_owned() } else { digits })
        .collect();
    parts.resize(4, "0".to_owned());
    parts.join(",")
}

fn rc_path(path: &Path) -> String {
    let text = path.display().to_string();
    text.strip_prefix(r"\\?\").unwrap_or(&text).replace('\\', "/")
}

fn resource_script(icon: &Path, manifest: &Path, version: &str) -> String {
    let numeric = numeric_version(version);
    format!(
        r#"1 ICON "{icon}"
1 24 "{manifest}"
1 VERSIONINFO
FILEVERSION {numeric}
PRODUCTVERSION {numeric}
FILEOS 0x40004
FILETYPE 0x1
BEGIN
  BLOCK "StringFileInfo"
  BEGIN
    BLOCK "0c0a04b0"
    BEGIN
      VALUE "CompanyName", "MiniCajero"
      VALUE "FileDescription", "Instalador de MiniCajero"
      VALUE "FileVersion", "{version}"
      VALUE "InternalName", "MiniCajero-Setup"
      VALUE "OriginalFilename", "MiniCajero-Setup.exe"
      VALUE "ProductName", "MiniCajero"
      VALUE "ProductVersion", "{version}"
    END
  END
  BLOCK "VarFileInfo"
  BEGIN
    VALUE "Translation", 0x0c0a, 1200
  END
END
"#,
        icon = rc_path(icon),
        manifest = rc_path(manifest),
    )
}
