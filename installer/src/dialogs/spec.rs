pub(super) const PRIMARY: i32 = 100;
pub(super) const SECONDARY: i32 = 101;

#[derive(Clone, Copy)]
pub(super) enum Icon {
    App,
    Warning,
    Error,
}

pub(super) struct Dialog<'a> {
    pub(super) instruction: &'a str,
    pub(super) content: &'a str,
    pub(super) details: &'a str,
    pub(super) icon: Icon,
    pub(super) buttons: &'a [(i32, &'a str)],
    pub(super) default_button: i32,
    pub(super) command_links: bool,
    pub(super) verification: Option<&'a str>,
}

impl Default for Dialog<'_> {
    fn default() -> Self {
        Self {
            instruction: "",
            content: "",
            details: "",
            icon: Icon::App,
            buttons: &[],
            default_button: 0,
            command_links: false,
            verification: None,
        }
    }
}

pub(super) struct Answer {
    pub(super) button: i32,
    pub(super) verified: bool,
}
