use std::io;
use std::os::windows::process::CommandExt;
use std::process::{Command, Stdio};

use windows::Win32::System::Threading::{CREATE_NEW_PROCESS_GROUP, DETACHED_PROCESS};

use crate::paths::Layout;

/// Abre la app instalada como proceso independiente, sin consola.
pub fn launch(layout: &Layout) -> io::Result<()> {
    Command::new(layout.app_exe())
        .current_dir(&layout.install_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .creation_flags(DETACHED_PROCESS.0 | CREATE_NEW_PROCESS_GROUP.0)
        .spawn()
        .map(drop)
}
