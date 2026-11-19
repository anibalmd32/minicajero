use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;

use windows::Win32::Foundation::{HWND, LPARAM, S_FALSE, S_OK, WPARAM};
use windows::Win32::UI::Controls::{
    TASKDIALOG_NOTIFICATIONS, TDF_CALLBACK_TIMER, TDF_SHOW_MARQUEE_PROGRESS_BAR, TDM_CLICK_BUTTON, TDM_ENABLE_BUTTON,
    TDM_SET_PROGRESS_BAR_MARQUEE, TDN_BUTTON_CLICKED, TDN_CREATED, TDN_TIMER,
};
use windows::Win32::UI::WindowsAndMessaging::{SendMessageW, SetForegroundWindow};
use windows::core::HRESULT;

use super::show::show;
use super::spec::{Dialog, PRIMARY};

pub(super) struct Progress {
    done: AtomicBool,
}

fn send(hwnd: HWND, message: i32, wparam: usize, lparam: isize) {
    unsafe { SendMessageW(hwnd, message as u32, Some(WPARAM(wparam)), Some(LPARAM(lparam))) };
}

/// Trae cada diálogo al frente al crearse y, en la ventana de progreso, la cierra cuando el trabajo termina.
pub(super) unsafe extern "system" fn dialog_callback(
    hwnd: HWND,
    notification: TASKDIALOG_NOTIFICATIONS,
    _wparam: WPARAM,
    _lparam: LPARAM,
    data: isize,
) -> HRESULT {
    if notification == TDN_CREATED {
        let _ = unsafe { SetForegroundWindow(hwnd) };
    }
    let Some(progress) = (unsafe { (data as *const Progress).as_ref() }) else {
        return S_OK;
    };
    let done = progress.done.load(Ordering::Acquire);
    match notification {
        TDN_CREATED => {
            send(hwnd, TDM_SET_PROGRESS_BAR_MARQUEE.0, 1, 30);
            send(hwnd, TDM_ENABLE_BUTTON.0, PRIMARY as usize, 0);
        }
        TDN_TIMER if done => {
            send(hwnd, TDM_ENABLE_BUTTON.0, PRIMARY as usize, 1);
            send(hwnd, TDM_CLICK_BUTTON.0, PRIMARY as usize, 0);
        }
        TDN_BUTTON_CLICKED if !done => return S_FALSE,
        _ => {}
    }
    S_OK
}

fn show_progress_dialog(instruction: &str, progress: &Progress) {
    show(
        &Dialog {
            instruction,
            content: "Un momento, por favor.",
            buttons: &[(PRIMARY, "Cerrar")],
            default_button: PRIMARY,
            ..Dialog::default()
        },
        TDF_SHOW_MARQUEE_PROGRESS_BAR | TDF_CALLBACK_TIMER,
        Some(progress),
    );
}

/// Ejecuta `work` en segundo plano mostrando una ventana de progreso que se cierra sola al terminar.
pub fn with_progress<T: Send>(instruction: &str, work: impl FnOnce() -> T + Send) -> T {
    let progress = Progress {
        done: AtomicBool::new(false),
    };
    thread::scope(|scope| {
        let worker = scope.spawn(|| {
            let result = work();
            progress.done.store(true, Ordering::Release);
            result
        });
        show_progress_dialog(instruction, &progress);
        worker.join().unwrap_or_else(|panic| std::panic::resume_unwind(panic))
    })
}
