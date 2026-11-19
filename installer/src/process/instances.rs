use std::path::Path;

use windows::Win32::System::Threading::{
    OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_SYNCHRONIZE, PROCESS_TERMINATE,
};

use super::handle::Process;
use super::snapshot::process_ids_named;
use crate::paths;

fn open(pid: u32) -> Option<Process> {
    let access = PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_SYNCHRONIZE | PROCESS_TERMINATE;
    unsafe { OpenProcess(access, false, pid) }.ok().map(Process)
}

/// Procesos en ejecución cuyo ejecutable es exactamente `executable`.
pub fn running_instances(executable: &Path) -> Vec<Process> {
    let Some(file_name) = executable.file_name().map(|name| name.to_string_lossy().to_lowercase()) else {
        return Vec::new();
    };
    let target = paths::comparable(executable);
    process_ids_named(&file_name)
        .into_iter()
        .filter_map(open)
        .filter(|process| {
            process
                .image_path()
                .is_some_and(|image| paths::comparable(Path::new(&image)) == target)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn encuentra_el_proceso_actual_por_su_ruta() {
        let current = std::env::current_exe().unwrap();
        let found = running_instances(&current);
        assert!(!found.is_empty());
        assert!(!found[0].wait(Duration::ZERO));
    }

    #[test]
    fn otra_ruta_con_el_mismo_nombre_no_cuenta() {
        let current = std::env::current_exe().unwrap();
        let elsewhere = std::env::temp_dir()
            .join("otra-carpeta")
            .join(current.file_name().unwrap());
        assert!(running_instances(&elsewhere).is_empty());
    }
}
