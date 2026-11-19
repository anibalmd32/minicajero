import { expect, test } from "bun:test";
import { PHONE_CLOSE } from "../../../modules/phone/phone.protocol";
import { closeOutcome, EXPIRED_LINK_TEXT } from "./close-outcome";
import { isLinkStalled, LINK_STALLED_AFTER_MS, reconnectDelay } from "./reconnect-policy";

const RETRY_CODES = [
  1000,
  1001,
  1006,
  1011,
  PHONE_CLOSE.helloTimeout,
  PHONE_CLOSE.badMessage,
  PHONE_CLOSE.restarting,
  PHONE_CLOSE.busy,
];

test("reconnectDelay crece y se estabiliza en 15 s", () => {
  expect([0, 1, 2, 3, 4, 5, 50].map(reconnectDelay)).toEqual([1000, 2000, 4000, 8000, 15000, 15000, 15000]);
  expect(reconnectDelay(-3)).toBe(1000);
});

test("isLinkStalled orienta al usuario tras un minuto sin conexión", () => {
  expect(isLinkStalled(1000, 1000 + LINK_STALLED_AFTER_MS - 1)).toBe(false);
  expect(isLinkStalled(1000, 1000 + LINK_STALLED_AFTER_MS)).toBe(true);
});

test("closeOutcome reintenta ante cortes de red y cierres no finales", () => {
  for (const code of RETRY_CODES) expect(closeOutcome(code)).toEqual({ kind: "retry" });
});

test("closeOutcome con token inválido o vencido pide escanear el código otra vez", () => {
  expect(closeOutcome(PHONE_CLOSE.invalidToken)).toEqual({ kind: "end", text: EXPIRED_LINK_TEXT, reload: false });
  expect(closeOutcome(PHONE_CLOSE.sessionExpired)).toEqual({ kind: "end", text: EXPIRED_LINK_TEXT, reload: false });
});

test("closeOutcome termina con su mensaje en los demás cierres finales", () => {
  for (const code of [PHONE_CLOSE.tooManyAttempts, PHONE_CLOSE.disconnectedFromPc, PHONE_CLOSE.replaced]) {
    expect(closeOutcome(code).kind).toBe("end");
  }
  expect(closeOutcome(PHONE_CLOSE.outdated)).toMatchObject({ kind: "end", reload: true });
});
