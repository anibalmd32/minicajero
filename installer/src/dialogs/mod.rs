mod progress;
mod show;
mod spec;

use windows::Win32::UI::Controls::{TASKDIALOG_FLAGS, TDF_VERIFICATION_FLAG_CHECKED};
use windows::Win32::UI::WindowsAndMessaging::IDCANCEL;

pub use progress::with_progress;
use show::show;
use spec::{Dialog, Icon, PRIMARY, SECONDARY};

use crate::payload::APP_NAME;

/// Bienvenida. `true` si el usuario elige instalar (o actualizar).
pub fn welcome(updating: bool) -> bool {
    let (instruction, content, action) = if updating {
        (
            format!("Actualizar {APP_NAME}"),
            "Tus datos se mantienen.",
            "Actualizar",
        )
    } else {
        (format!("Instalar {APP_NAME}"), "", "Instalar")
    };
    let answer = show(
        &Dialog {
            instruction: &instruction,
            content,
            buttons: &[(PRIMARY, action), (IDCANCEL.0, "Cancelar")],
            default_button: PRIMARY,
            ..Dialog::default()
        },
        TASKDIALOG_FLAGS(0),
        None,
    );
    answer.button == PRIMARY
}

/// Final de la instalación. `true` si el usuario quiere abrir la app ahora.
pub fn installed(updated: bool) -> bool {
    let instruction = if updated {
        format!("¡Listo! {APP_NAME} está actualizado.")
    } else {
        format!("¡Listo! {APP_NAME} ya está instalado.")
    };
    let answer = show(
        &Dialog {
            instruction: &instruction,
            buttons: &[(PRIMARY, "Finalizar")],
            default_button: PRIMARY,
            verification: Some(&format!("Abrir {APP_NAME} ahora")),
            ..Dialog::default()
        },
        TDF_VERIFICATION_FLAG_CHECKED,
        None,
    );
    answer.button == PRIMARY && answer.verified
}

/// Confirmación de la desinstalación.
pub fn confirm_uninstall() -> bool {
    let answer = show(
        &Dialog {
            instruction: &format!("¿Desinstalar {APP_NAME}?"),
            buttons: &[(PRIMARY, "Desinstalar"), (IDCANCEL.0, "Cancelar")],
            default_button: IDCANCEL.0,
            ..Dialog::default()
        },
        TASKDIALOG_FLAGS(0),
        None,
    );
    answer.button == PRIMARY
}

/// Qué hacer con los datos al desinstalar.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DataChoice {
    Keep,
    Delete,
    Cancel,
}

/// Pregunta si borrar también los datos. La opción por defecto es conservarlos.
pub fn ask_delete_data() -> DataChoice {
    let answer = show(
        &Dialog {
            instruction: "¿Borrar también tus datos?",
            content: "Facturas, clientes e inventario. No podrás recuperarlos.",
            icon: Icon::Warning,
            buttons: &[
                (PRIMARY, "No, conservarlos"),
                (SECONDARY, "Sí, borrarlos"),
                (IDCANCEL.0, "Cancelar"),
            ],
            default_button: PRIMARY,
            command_links: true,
            ..Dialog::default()
        },
        TASKDIALOG_FLAGS(0),
        None,
    );
    match answer.button {
        PRIMARY => DataChoice::Keep,
        SECONDARY => DataChoice::Delete,
        _ => DataChoice::Cancel,
    }
}

/// Final de la desinstalación.
pub fn uninstalled(kept_data: bool) {
    show(
        &Dialog {
            instruction: &format!("{APP_NAME} se desinstaló."),
            content: if kept_data {
                "Tus datos quedan guardados por si vuelves a instalarlo."
            } else {
                ""
            },
            buttons: &[(PRIMARY, "Cerrar")],
            default_button: PRIMARY,
            ..Dialog::default()
        },
        TASKDIALOG_FLAGS(0),
        None,
    );
}

/// Muestra un error: qué pasó, qué puede hacer el usuario y, plegado bajo "Ver detalles", la causa técnica.
pub fn error(instruction: &str, action: &str, details: &str) {
    show(
        &Dialog {
            instruction,
            content: action,
            details,
            icon: Icon::Error,
            buttons: &[(PRIMARY, "Cerrar")],
            default_button: PRIMARY,
            ..Dialog::default()
        },
        TASKDIALOG_FLAGS(0),
        None,
    );
}
