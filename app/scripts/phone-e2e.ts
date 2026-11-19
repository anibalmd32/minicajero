import { finish } from "./e2e-support/check";
import { loadEnv } from "./e2e-support/env";
import { checkLanSurface } from "./phone-e2e/lan-steps";
import { createCheckedPairing } from "./phone-e2e/pairing-steps";
import { runScanFlow } from "./phone-e2e/scan-steps";
import { runSessionFlow } from "./phone-e2e/session-steps";

/**
 * Prueba de punta a punta del escáner con el teléfono contra una app en marcha: simula el teléfono
 * (WebSocket seguro a la IP local) y una pestaña de la PC (WebSocket local) y comprueba el ida y vuelta.
 * Uso: bun scripts/phone-e2e.ts [http://127.0.0.1:4000] [--login=usuario:clave]
 */
const env = await loadEnv();
const pairing = await createCheckedPairing(env);
await checkLanSurface(pairing.lanBase);
const peers = await runScanFlow(env, pairing);
await runSessionFlow(env, pairing, peers);
finish();
