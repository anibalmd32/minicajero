use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::Controls::{
    TASKDIALOG_BUTTON, TASKDIALOG_FLAGS, TASKDIALOGCONFIG, TASKDIALOGCONFIG_0, TD_ERROR_ICON, TD_WARNING_ICON,
    TDF_ALLOW_DIALOG_CANCELLATION, TDF_POSITION_RELATIVE_TO_WINDOW, TDF_USE_COMMAND_LINKS, TaskDialogIndirect,
};
use windows::Win32::UI::WindowsAndMessaging::IDCANCEL;
use windows::core::{BOOL, HSTRING, PCWSTR};

use super::progress::{Progress, dialog_callback};
use super::spec::{Answer, Dialog, Icon};
use crate::payload::APP_NAME;

const APP_ICON_RESOURCE: usize = 1;

fn icon_resource(icon: Icon) -> PCWSTR {
    match icon {
        Icon::App => PCWSTR(APP_ICON_RESOURCE as *const u16),
        Icon::Warning => TD_WARNING_ICON,
        Icon::Error => TD_ERROR_ICON,
    }
}

fn optional_text(text: &HSTRING) -> PCWSTR {
    if text.is_empty() {
        PCWSTR::null()
    } else {
        PCWSTR(text.as_ptr())
    }
}

struct Texts {
    title: HSTRING,
    instruction: HSTRING,
    content: HSTRING,
    details: HSTRING,
    show_details: HSTRING,
    hide_details: HSTRING,
    verification: Option<HSTRING>,
    labels: Vec<HSTRING>,
}

impl Texts {
    fn new(dialog: &Dialog) -> Self {
        let (show_details, hide_details) = if dialog.details.is_empty() {
            (HSTRING::new(), HSTRING::new())
        } else {
            (HSTRING::from("Ver detalles"), HSTRING::from("Ocultar detalles"))
        };
        Self {
            title: HSTRING::from(APP_NAME),
            instruction: HSTRING::from(dialog.instruction),
            content: HSTRING::from(dialog.content),
            details: HSTRING::from(dialog.details),
            show_details,
            hide_details,
            verification: dialog.verification.map(HSTRING::from),
            labels: dialog.buttons.iter().map(|(_, label)| HSTRING::from(*label)).collect(),
        }
    }
}

fn task_buttons(dialog: &Dialog, texts: &Texts) -> Vec<TASKDIALOG_BUTTON> {
    dialog
        .buttons
        .iter()
        .zip(&texts.labels)
        .map(|((id, _), label)| TASKDIALOG_BUTTON {
            nButtonID: *id,
            pszButtonText: PCWSTR(label.as_ptr()),
        })
        .collect()
}

fn dialog_flags(dialog: &Dialog, extra_flags: TASKDIALOG_FLAGS) -> TASKDIALOG_FLAGS {
    let mut flags = TDF_ALLOW_DIALOG_CANCELLATION | TDF_POSITION_RELATIVE_TO_WINDOW | extra_flags;
    if dialog.command_links {
        flags |= TDF_USE_COMMAND_LINKS;
    }
    flags
}

fn build_config(
    dialog: &Dialog,
    flags: TASKDIALOG_FLAGS,
    texts: &Texts,
    buttons: &[TASKDIALOG_BUTTON],
    progress: Option<&Progress>,
) -> TASKDIALOGCONFIG {
    TASKDIALOGCONFIG {
        cbSize: size_of::<TASKDIALOGCONFIG>() as u32,
        hInstance: unsafe { GetModuleHandleW(None) }.unwrap_or_default().into(),
        dwFlags: flags,
        pszWindowTitle: PCWSTR(texts.title.as_ptr()),
        Anonymous1: TASKDIALOGCONFIG_0 {
            pszMainIcon: icon_resource(dialog.icon),
        },
        pszMainInstruction: PCWSTR(texts.instruction.as_ptr()),
        pszContent: optional_text(&texts.content),
        pszExpandedInformation: optional_text(&texts.details),
        pszCollapsedControlText: optional_text(&texts.show_details),
        pszExpandedControlText: optional_text(&texts.hide_details),
        cButtons: buttons.len() as u32,
        pButtons: buttons.as_ptr(),
        nDefaultButton: dialog.default_button,
        pszVerificationText: texts
            .verification
            .as_ref()
            .map_or(PCWSTR::null(), |text| PCWSTR(text.as_ptr())),
        pfCallback: Some(dialog_callback),
        lpCallbackData: progress.map_or(0, |progress| progress as *const Progress as isize),
        ..Default::default()
    }
}

pub(super) fn show(dialog: &Dialog, extra_flags: TASKDIALOG_FLAGS, progress: Option<&Progress>) -> Answer {
    let texts = Texts::new(dialog);
    let buttons = task_buttons(dialog, &texts);
    let config = build_config(dialog, dialog_flags(dialog, extra_flags), &texts, &buttons, progress);
    let mut button = IDCANCEL.0;
    let mut verified = BOOL::default();
    if unsafe { TaskDialogIndirect(&config, Some(&mut button), None, Some(&mut verified)) }.is_err() {
        button = IDCANCEL.0;
    }
    Answer {
        button,
        verified: verified.as_bool(),
    }
}
