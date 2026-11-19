use std::fmt;

const DEFAULT_ACTION: &str = "Inténtalo de nuevo.";

/// Error del instalador: la causa técnica (para "Ver detalles" y el modo silencioso) y qué puede hacer el usuario.
#[derive(Debug)]
pub struct Error {
    message: String,
    cause: Option<String>,
    action: &'static str,
}

impl Error {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            cause: None,
            action: DEFAULT_ACTION,
        }
    }

    pub fn with_cause(message: impl Into<String>, cause: impl fmt::Display) -> Self {
        Self {
            message: message.into(),
            cause: Some(cause.to_string().trim().to_owned()),
            action: DEFAULT_ACTION,
        }
    }

    /// Indica qué puede hacer el usuario para resolverlo, en una frase corta.
    pub fn suggest(mut self, action: &'static str) -> Self {
        self.action = action;
        self
    }

    pub fn action(&self) -> &'static str {
        self.action
    }
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match &self.cause {
            Some(cause) if !cause.is_empty() => write!(f, "{}\n\nDetalle: {cause}", self.message),
            _ => f.write_str(&self.message),
        }
    }
}

impl std::error::Error for Error {}

pub type Result<T> = std::result::Result<T, Error>;

/// Añade a cualquier error un mensaje para el usuario.
pub trait Context<T> {
    fn context(self, message: impl Into<String>) -> Result<T>;
}

impl<T, E: fmt::Display> Context<T> for std::result::Result<T, E> {
    fn context(self, message: impl Into<String>) -> Result<T> {
        self.map_err(|cause| Error::with_cause(message, cause))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn muestra_el_detalle_tras_el_mensaje() {
        let error: Result<()> = Err(std::io::Error::other("disco lleno")).context("No se pudo copiar");
        assert_eq!(
            error.unwrap_err().to_string(),
            "No se pudo copiar\n\nDetalle: disco lleno"
        );
    }

    #[test]
    fn sin_causa_solo_el_mensaje() {
        assert_eq!(Error::new("Falló").to_string(), "Falló");
    }
}
