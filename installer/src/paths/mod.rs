mod compare;
mod layout;
mod locations;

pub use compare::{comparable, same_path};
pub use layout::{Layout, ShortcutPaths};
pub use locations::{install_dir, shortcut_paths};
