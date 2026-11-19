use crate::paths::{Layout, ShortcutPaths};

/// Qué quitar en una desinstalación.
pub(super) struct Target<'a> {
    pub(super) layout: &'a Layout,
    pub(super) shortcuts: &'a ShortcutPaths,
    pub(super) registry_key: &'a str,
    pub(super) delete_data: bool,
    pub(super) keep_uninstaller: bool,
}
