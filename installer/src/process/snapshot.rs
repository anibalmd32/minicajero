use windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, PROCESSENTRY32W, Process32FirstW, Process32NextW, TH32CS_SNAPPROCESS,
};

use super::handle::Process;

fn entry_file_name(entry: &PROCESSENTRY32W) -> String {
    let length = entry
        .szExeFile
        .iter()
        .position(|&unit| unit == 0)
        .unwrap_or(entry.szExeFile.len());
    String::from_utf16_lossy(&entry.szExeFile[..length]).to_lowercase()
}

pub(super) fn process_ids_named(file_name: &str) -> Vec<u32> {
    let Ok(snapshot) = (unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) }) else {
        return Vec::new();
    };
    let snapshot = Process(snapshot);
    let mut entry = PROCESSENTRY32W {
        dwSize: size_of::<PROCESSENTRY32W>() as u32,
        ..Default::default()
    };
    let mut ids = Vec::new();
    let mut found = unsafe { Process32FirstW(snapshot.0, &mut entry) }.is_ok();
    while found {
        if entry_file_name(&entry) == file_name {
            ids.push(entry.th32ProcessID);
        }
        found = unsafe { Process32NextW(snapshot.0, &mut entry) }.is_ok();
    }
    ids
}
