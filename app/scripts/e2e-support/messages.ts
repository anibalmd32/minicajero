/** Teléfono tal como lo ve la API. */
export interface PhoneEntry {
  id: string;
  name: string;
}

/** Mensaje del WebSocket del teléfono o de la PC (según su `type` solo vienen algunos campos). */
export interface WireMessage {
  type: string;
  id: string;
  status: string;
  message: string;
  context: string;
  code: string;
  format: string;
  session: string;
  phones: PhoneEntry[];
  phone: PhoneEntry;
}

/** Dirección del servidor del teléfono que devuelve `POST /api/v1/phone/pairing`. */
export interface PairingUrl {
  url: string;
  label: string;
  ip: string;
}

/** Respuesta de `POST /api/v1/phone/pairing`. */
export interface PairingResponse {
  urls: PairingUrl[];
  qr_svg: string;
}

/** Respuesta de `GET /api/v1/phone/status`. */
export interface PhoneStatusResponse {
  active: boolean;
  phones: PhoneEntry[];
  context: string;
  pairing_expires_at: string | null;
}
