import { PHONE_CLOSE } from "../../src/modules/phone/phone.protocol";
import { sleep } from "../chrome";
import { check } from "../e2e-support/check";
import { fetchPhoneStatus, jsonHeaders } from "../e2e-support/env";
import { type Phone, pairPhone } from "./phone";
import { closeModal, desktopViewport, evaluate, eventually, type Run, screenshot, waitFor } from "./run";

const OPEN_MODAL = `document.querySelector(".nav-phone").click()`;
const MODAL_STATUS = `document.querySelector("#phone-modal [data-role=status]")?.textContent`;

/** Navbar con teléfono conectado en tres anchos. */
export async function navbarShotsSteps(run: Run): Promise<void> {
  await evaluate(run.page, `window.scrollTo(0, 0)`);
  await screenshot(run, "navbar-conectado-1366", 1366, 300);
  await screenshot(run, "navbar-conectado-375", 375, 300);
  await screenshot(run, "navbar-conectado-800", 800, 300);
  await desktopViewport(run.page);
}

/** Diálogo Conectar teléfono: QR visible y estado de espera. */
export async function connectModalSteps(run: Run): Promise<void> {
  const { page } = run;
  await evaluate(page, OPEN_MODAL);
  check(await waitFor(page, `document.querySelector("#phone-modal .phone-qr svg")`), "el modal muestra el QR");
  check(await waitFor(page, `${MODAL_STATUS}.includes("Esperando otro teléfono")`), "estado: esperando otro teléfono");
  await screenshot(run, "modal-conectar-1366", 1366, 900);
  await screenshot(run, "modal-conectar-375", 375, 812);
  await desktopViewport(page);
}

/** Un segundo teléfono se conecta: el modal lo avisa, se cierra solo y la navbar cuenta 2. */
export async function secondPhoneSteps(run: Run): Promise<Phone> {
  const { page, env } = run;
  const secondPhone = await pairPhone(env);
  await secondPhone.next("ready");
  check(await waitFor(page, `${MODAL_STATUS} === "Teléfono conectado ✓"`, 2000), "el modal avisa Teléfono conectado ✓");
  await screenshot(run, "modal-conectado-1366", 1366, 900);
  check(
    await waitFor(page, `!document.getElementById("phone-modal").classList.contains("show")`, 4000),
    "el modal se cierra solo",
  );
  await sleep(500);
  check(
    await waitFor(page, `document.querySelector(".nav-phone-count")?.textContent === "2"`),
    "la navbar muestra 2 teléfonos",
  );
  return secondPhone;
}

/** Lista de teléfonos: Desconectar cierra uno y la lista y la navbar se actualizan. */
export async function disconnectSteps(run: Run, secondPhone: Phone): Promise<void> {
  const { page, phone } = run;
  await evaluate(page, OPEN_MODAL);
  await waitFor(page, `document.querySelectorAll("#phone-modal .phone-list-item").length === 2`);
  await screenshot(run, "modal-lista-375", 375, 812);
  await evaluate(page, `document.querySelector("#phone-modal .phone-list-item .btn-outline-danger").click()`);
  const closedCode = await Promise.race([phone.closed, secondPhone.closed]);
  check(closedCode === PHONE_CLOSE.disconnectedFromPc, "Desconectar cierra ese teléfono", closedCode);
  check(
    await waitFor(
      page,
      `document.querySelectorAll("#phone-modal .phone-list-item").length === 1 && document.querySelector(".nav-phone-count")?.textContent === "1"`,
    ),
    "la lista y la navbar se actualizan",
  );
}

/** Cerrar el diálogo anula el QR y, sin teléfonos, apaga la conexión. */
export async function closeModalSteps(run: Run): Promise<void> {
  const { page, env } = run;
  await closeModal(page, "phone-modal");
  check(await eventually(env, (status) => status.pairing_expires_at === null), "cerrar el diálogo anula el QR");
  const remaining = await fetchPhoneStatus(env);
  check(remaining.active && remaining.phones.length === 1, "el otro teléfono sigue conectado", remaining);
  await fetch(`${env.origin}/api/v1/phone/phones/${encodeURIComponent(remaining.phones[0]?.id ?? "")}`, {
    method: "DELETE",
    headers: jsonHeaders(env),
  });
  await evaluate(page, OPEN_MODAL);
  check(await waitFor(page, `document.querySelector("#phone-modal .phone-qr svg")`), "el modal vuelve a mostrar un QR");
  check((await fetchPhoneStatus(env)).active, "con el QR a la vista la conexión con el teléfono está activa");
  await closeModal(page, "phone-modal");
  check(
    await eventually(env, (status) => !status.active),
    "cerrar el diálogo sin teléfonos apaga la conexión en el acto",
  );
}
