use std::io::{self, Read, Write};
use std::net::{Ipv4Addr, SocketAddr, TcpStream};
use std::time::Duration;

const TIMEOUT: Duration = Duration::from_secs(3);
const APP_ID_FIELD: &str = "\"app\":\"minicajero\"";

/// Respuesta HTTP mínima: código y cuerpo.
#[derive(Debug, PartialEq, Eq)]
pub struct Response {
    pub status: u16,
    pub body: String,
}

/// Puerto guardado por la app en `puerto.txt`; `None` si el contenido no es un puerto válido.
pub fn parse_port(text: &str) -> Option<u16> {
    let text = text.trim();
    if text.is_empty() || !text.bytes().all(|byte| byte.is_ascii_digit()) {
        return None;
    }
    text.parse().ok().filter(|port| *port > 0)
}

/// ¿Responde MiniCajero en ese puerto de este equipo?
pub fn is_minicajero(port: u16) -> bool {
    send(port, "GET", "/api/v1/health", None)
        .is_ok_and(|response| response.status == 200 && response.body.replace(' ', "").contains(APP_ID_FIELD))
}

/// Pide a la app que se cierre. Envía JSON sin cabecera `Origin`, que es lo que su comprobación de mismo origen admite.
pub fn request_shutdown(port: u16) -> io::Result<Response> {
    send(port, "POST", "/api/v1/app/shutdown", Some("{}"))
}

fn send(port: u16, method: &str, path: &str, body: Option<&str>) -> io::Result<Response> {
    let address = SocketAddr::from((Ipv4Addr::LOCALHOST, port));
    let mut stream = TcpStream::connect_timeout(&address, TIMEOUT)?;
    stream.set_read_timeout(Some(TIMEOUT))?;
    stream.set_write_timeout(Some(TIMEOUT))?;
    stream.write_all(request_text(port, method, path, body).as_bytes())?;
    let mut raw = Vec::new();
    stream.read_to_end(&mut raw)?;
    parse_response(&raw).ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "respuesta HTTP no válida"))
}

fn request_text(port: u16, method: &str, path: &str, body: Option<&str>) -> String {
    let mut request = format!(
        "{method} {path} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nAccept: application/json\r\nConnection: close\r\n"
    );
    if let Some(body) = body {
        request.push_str(&format!(
            "Content-Type: application/json\r\nContent-Length: {}\r\n\r\n{body}",
            body.len()
        ));
    } else {
        request.push_str("\r\n");
    }
    request
}

fn parse_response(raw: &[u8]) -> Option<Response> {
    let text = String::from_utf8_lossy(raw);
    let (head, body) = text.split_once("\r\n\r\n")?;
    let status = head.lines().next()?.split_whitespace().nth(1)?.parse().ok()?;
    Some(Response {
        status,
        body: body.to_owned(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::TcpListener;
    use std::thread;

    #[test]
    fn puerto_guardado() {
        assert_eq!(parse_port("4000\n"), Some(4000));
        assert_eq!(parse_port(" 4501 "), Some(4501));
        for invalid in ["", "abc", "0", "70000", "40.5", "-1"] {
            assert_eq!(parse_port(invalid), None, "{invalid:?}");
        }
    }

    #[test]
    fn interpreta_la_respuesta() {
        let raw = b"HTTP/1.1 202 Accepted\r\nContent-Type: application/json\r\n\r\n{\"status\":\"closing\"}";
        assert_eq!(
            parse_response(raw),
            Some(Response {
                status: 202,
                body: "{\"status\":\"closing\"}".to_owned()
            })
        );
        assert_eq!(parse_response(b"basura"), None);
    }

    #[test]
    fn la_peticion_de_cierre_es_json_sin_origin() {
        let request = request_text(4000, "POST", "/api/v1/app/shutdown", Some("{}"));
        assert!(request.starts_with("POST /api/v1/app/shutdown HTTP/1.1\r\n"));
        assert!(request.contains("Host: 127.0.0.1:4000\r\n"));
        assert!(request.contains("Content-Type: application/json\r\n"));
        assert!(request.contains("Content-Length: 2\r\n"));
        assert!(!request.to_ascii_lowercase().contains("origin:"));
        assert!(request.ends_with("\r\n\r\n{}"));
    }

    fn serve_once(response: &'static str) -> (u16, thread::JoinHandle<String>) {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        let port = listener.local_addr().unwrap().port();
        let handle = thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut buffer = [0u8; 2048];
            let read = stream.read(&mut buffer).unwrap();
            stream.write_all(response.as_bytes()).unwrap();
            String::from_utf8_lossy(&buffer[..read]).into_owned()
        });
        (port, handle)
    }

    #[test]
    fn reconoce_la_app_por_su_identificador() {
        let (port, server) =
            serve_once("HTTP/1.1 200 OK\r\nContent-Length: 34\r\n\r\n{\"status\":\"ok\",\"app\":\"minicajero\"}");
        assert!(is_minicajero(port));
        assert!(server.join().unwrap().starts_with("GET /api/v1/health"));

        let (port, server) = serve_once("HTTP/1.1 200 OK\r\n\r\n{\"app\":\"otra\"}");
        assert!(!is_minicajero(port));
        server.join().unwrap();
    }

    #[test]
    fn envia_el_cierre() {
        let (port, server) = serve_once("HTTP/1.1 202 Accepted\r\n\r\n{\"status\":\"closing\"}");
        assert_eq!(request_shutdown(port).unwrap().status, 202);
        assert!(server.join().unwrap().ends_with("\r\n\r\n{}"));
    }
}
