use std::time::Duration;

use windows::Win32::Foundation::{CloseHandle, HANDLE, WAIT_OBJECT_0};
use windows::Win32::System::Threading::{PROCESS_NAME_WIN32, QueryFullProcessImageNameW, WaitForSingleObject};
use windows::core::PWSTR;

/// Handle de proceso que se cierra al soltarlo.
pub struct Process(pub(super) HANDLE);

impl Drop for Process {
    fn drop(&mut self) {
        let _ = unsafe { CloseHandle(self.0) };
    }
}

impl Process {
    /// Espera a que termine; `true` si terminó dentro del plazo.
    pub fn wait(&self, timeout: Duration) -> bool {
        let millis = u32::try_from(timeout.as_millis()).unwrap_or(u32::MAX);
        let event = unsafe { WaitForSingleObject(self.0, millis) };
        event == WAIT_OBJECT_0
    }

    pub(super) fn image_path(&self) -> Option<String> {
        let mut buffer = vec![0u16; 32 * 1024];
        let mut length = buffer.len() as u32;
        unsafe { QueryFullProcessImageNameW(self.0, PROCESS_NAME_WIN32, PWSTR(buffer.as_mut_ptr()), &mut length) }
            .ok()?;
        Some(String::from_utf16_lossy(&buffer[..length as usize]))
    }
}
