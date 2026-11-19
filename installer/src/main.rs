#![windows_subsystem = "windows"]

mod cli;
mod dialogs;
mod error;
mod files;
mod http;
mod install;
mod paths;
mod payload;
mod process;
mod registry;
mod shortcuts;
mod uninstall;

use std::env;
use std::path::PathBuf;
use std::process::ExitCode;

use cli::{Mode, Options};
use install::Outcome;
use payload::APP_NAME;

const EXIT_ERROR: u8 = 1;
const EXIT_CANCELLED: u8 = 2;
const EXIT_USAGE: u8 = 64;

fn main() -> ExitCode {
    let executable = env::current_exe().unwrap_or_else(|_| PathBuf::from("MiniCajero-Setup.exe"));
    let raw_args: Vec<_> = env::args_os().skip(1).collect();
    let silent = raw_args.iter().any(|arg| arg.eq_ignore_ascii_case("--silent"));
    let options = match cli::parse(raw_args, &executable) {
        Ok(options) => options,
        Err(message) => {
            if silent {
                eprintln!("{message}");
            } else {
                dialogs::error(&format!("No se pudo abrir el instalador de {APP_NAME}."), "", &message);
            }
            return ExitCode::from(EXIT_USAGE);
        }
    };
    run(&options)
}

fn run(options: &Options) -> ExitCode {
    let (failure, result) = match options.mode {
        Mode::Install => (format!("No se pudo instalar {APP_NAME}."), install::run(options)),
        Mode::Uninstall => (format!("No se pudo desinstalar {APP_NAME}."), uninstall::run(options)),
    };
    match result {
        Ok(Outcome::Done) => ExitCode::SUCCESS,
        Ok(Outcome::Cancelled) => ExitCode::from(EXIT_CANCELLED),
        Err(error) => {
            if options.silent {
                eprintln!("{error}");
            } else {
                dialogs::error(&failure, error.action(), &error.to_string());
            }
            ExitCode::from(EXIT_ERROR)
        }
    }
}
