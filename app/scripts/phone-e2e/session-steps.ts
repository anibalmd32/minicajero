import { PHONE_CLOSE, PHONE_PROTOCOL_VERSION } from "../../src/modules/phone/phone.protocol";
import { check } from "../e2e-support/check";
import { createPairing, type E2eEnv, fetchPhoneStatus, insecureTls, tokenOf } from "../e2e-support/env";
import type { Pairing } from "./pairing-steps";
import { connect, type Peer } from "./peer";
import type { ConnectedPeers } from "./scan-steps";

async function connectWithToken(pairing: Pairing, token: string): Promise<Peer> {
  const peer = await connect(`wss://${pairing.preferred.host}/movil/ws`, { tls: insecureTls });
  peer.send({ type: "hello", version: PHONE_PROTOCOL_VERSION, token });
  return peer;
}

async function checkTokenReuseAndResume(pairing: Pairing, { phone, ready }: ConnectedPeers): Promise<void> {
  const reusedClose = await (await connectWithToken(pairing, pairing.token)).closed;
  check(reusedClose.code === PHONE_CLOSE.invalidToken, "el token del QR es de un solo uso", reusedClose);
  const leaving = await connectWithToken(pairing, ready.session);
  const leavingReady = await leaving.next("ready");
  check(leavingReady.phone.id === ready.phone.id, "reconectar con la sesión", leavingReady);
  check((await phone.closed).code === PHONE_CLOSE.replaced, "la conexión anterior queda reemplazada");
  leaving.send({ type: "bye" });
  check((await leaving.closed).code === 1000, "al despedirse el teléfono se cierra normal");
}

async function checkAfterBye(env: E2eEnv, pairing: Pairing, ready: ConnectedPeers["ready"]): Promise<void> {
  const afterBye = await connectWithToken(pairing, ready.session);
  check((await afterBye.closed).code === PHONE_CLOSE.invalidToken, "tras despedirse la sesión ya no sirve");
  check((await fetchPhoneStatus(env)).phones.length === 0, "la PC deja de ver el teléfono");
}

async function pairSecondPhone(env: E2eEnv, pairing: Pairing): Promise<Peer> {
  const rePair = await createPairing(env);
  const token = tokenOf(new URL(rePair.urls[0]?.url ?? ""));
  const phone2 = await connectWithToken(pairing, token);
  await phone2.next("ready");
  return phone2;
}

async function checkShutdown(env: E2eEnv, pairing: Pairing, phone2: Peer): Promise<void> {
  const deleted = await fetch(`${env.origin}/api/v1/phone/pairing`, {
    method: "DELETE",
    headers: { Origin: env.origin, Cookie: env.cookie },
  });
  check(deleted.status === 200, "DELETE /pairing → 200", deleted.status);
  const phoneClose = await phone2.closed;
  check(phoneClose.code === PHONE_CLOSE.disconnectedFromPc, "el teléfono queda desconectado", phoneClose);
  const lanDown = await fetch(`${pairing.lanBase}/movil`, { tls: insecureTls, signal: AbortSignal.timeout(2000) }).then(
    () => false,
    () => true,
  );
  check(lanDown, "el servidor del teléfono se apagó");
  check((await fetchPhoneStatus(env)).active === false, "GET /status → inactivo");
}

/** Recorre el ciclo de las sesiones: token de un solo uso, reconexión, despedida, estado y apagado. */
export async function runSessionFlow(env: E2eEnv, pairing: Pairing, peers: ConnectedPeers): Promise<void> {
  await checkTokenReuseAndResume(pairing, peers);
  await checkAfterBye(env, pairing, peers.ready);
  const phone2 = await pairSecondPhone(env, pairing);
  const statusNow = await fetchPhoneStatus(env);
  check(
    statusNow.active === true && statusNow.phones.length === 1 && statusNow.context === "ventas",
    "GET /status",
    statusNow,
  );
  await checkShutdown(env, pairing, phone2);
  peers.pc.socket.close();
}
