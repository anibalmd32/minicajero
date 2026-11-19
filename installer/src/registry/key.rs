use windows::Win32::Foundation::{ERROR_SUCCESS, WIN32_ERROR};
use windows::Win32::System::Registry::{HKEY, REG_DWORD, REG_SZ, RegCloseKey, RegSetValueExW};
use windows::core::HSTRING;

use crate::error::{Error, Result};

pub(super) struct Key(pub(super) HKEY);

impl Drop for Key {
    fn drop(&mut self) {
        let _ = unsafe { RegCloseKey(self.0) };
    }
}

pub(super) fn check(status: WIN32_ERROR, action: &str) -> Result<()> {
    if status == ERROR_SUCCESS {
        Ok(())
    } else {
        Err(Error::with_cause(
            format!("No se pudo {action} en el registro de Windows"),
            windows::core::Error::from_hresult(status.to_hresult()),
        ))
    }
}

fn wide_bytes(text: &str) -> Vec<u8> {
    text.encode_utf16().chain([0]).flat_map(u16::to_le_bytes).collect()
}

pub(super) fn set_string(key: &Key, name: &str, value: &str) -> Result<()> {
    let status = unsafe { RegSetValueExW(key.0, &HSTRING::from(name), None, REG_SZ, Some(&wide_bytes(value))) };
    check(status, "registrar la aplicación")
}

pub(super) fn set_dword(key: &Key, name: &str, value: u32) -> Result<()> {
    let status = unsafe { RegSetValueExW(key.0, &HSTRING::from(name), None, REG_DWORD, Some(&value.to_le_bytes())) };
    check(status, "registrar la aplicación")
}
