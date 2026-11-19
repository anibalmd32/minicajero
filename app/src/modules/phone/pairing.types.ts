/** Token de emparejamiento recién creado (el que va en el QR). */
export interface PairingTicket {
  token: string;
  expiresAt: number;
}

/** Sesión de un teléfono ya emparejado. */
export interface PhoneSession {
  id: string;
  /** Token para reconectar; solo se entrega una vez, al teléfono. */
  token: string;
  createdAt: number;
  expiresAt: number;
}

/** Resultado de presentar un token. */
export type RedeemResult =
  | { ok: true; session: PhoneSession; resumed: boolean }
  | { ok: false; reason: "invalid" | "locked" };
