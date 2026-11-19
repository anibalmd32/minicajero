use windows::Win32::Foundation::ERROR_SUCCESS;
use windows::Win32::System::Registry::{HKEY_CURRENT_USER, REG_VALUE_TYPE, RRF_RT_REG_SZ, RegGetValueW};
use windows::core::HSTRING;

fn value_size(key: &HSTRING, value: &HSTRING) -> Option<u32> {
    let mut size = 0u32;
    let mut kind = REG_VALUE_TYPE::default();
    let status = unsafe {
        RegGetValueW(
            HKEY_CURRENT_USER,
            key,
            value,
            RRF_RT_REG_SZ,
            Some(&mut kind),
            None,
            Some(&mut size),
        )
    };
    (status == ERROR_SUCCESS).then_some(size)
}

fn fill_buffer(key: &HSTRING, value: &HSTRING, buffer: &mut [u16], mut size: u32) -> bool {
    let status = unsafe {
        RegGetValueW(
            HKEY_CURRENT_USER,
            key,
            value,
            RRF_RT_REG_SZ,
            None,
            Some(buffer.as_mut_ptr().cast()),
            Some(&mut size),
        )
    };
    status == ERROR_SUCCESS
}

/// Lee un valor de texto de la clave `key_path`; `None` si no existe.
pub fn read_string(key_path: &str, name: &str) -> Option<String> {
    let key = HSTRING::from(key_path);
    let value = HSTRING::from(name);
    let size = value_size(&key, &value)?;
    let mut buffer = vec![0u16; (size as usize).div_ceil(2)];
    if !fill_buffer(&key, &value, &mut buffer, size) {
        return None;
    }
    let length = buffer.iter().position(|&unit| unit == 0).unwrap_or(buffer.len());
    Some(String::from_utf16_lossy(&buffer[..length]))
}
