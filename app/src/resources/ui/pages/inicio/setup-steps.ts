import type { Dashboard } from "../../dashboard";
import { getLastRateOverview } from "../../exchange-rate";
import { textElement } from "../../list";
import { elements } from "./elements";

interface SetupStep {
  title: string;
  text: string;
  done: boolean;
  href: string;
  action: string;
}

function setupStepsOf(data: Dashboard): SetupStep[] {
  return [
    {
      title: "Configura tu negocio",
      text: "Nombre, RIF, dirección e IVA que saldrán en tus facturas.",
      done: data.setup.business_configured,
      href: "/configuracion",
      action: "Configurar",
    },
    {
      title: "Agrega tus productos",
      text: "Registra cada producto con su precio en dólares y su stock.",
      done: data.setup.products > 0,
      href: "/inventario?nuevo=1",
      action: "Agregar producto",
    },
    {
      title: "Haz tu primera venta",
      text: "Elige productos, cliente y si es de contado o fiado.",
      done: data.setup.invoices > 0,
      href: "/ventas",
      action: "Vender",
    },
  ];
}

function stepAction(step: SetupStep): HTMLElement {
  if (step.done) return textElement("span", "Listo", "badge text-bg-success dashboard-step-status");
  const link = textElement("a", step.action, "btn btn-sm btn-primary dashboard-step-action") as HTMLAnchorElement;
  link.href = step.href;
  return link;
}

function setupStepItem(step: SetupStep, index: number): HTMLLIElement {
  const li = document.createElement("li");
  li.className = `dashboard-step${step.done ? " is-done" : ""}`;
  const marker = textElement("span", step.done ? "✓" : String(index + 1), "dashboard-step-marker");
  marker.setAttribute("aria-hidden", "true");
  const body = document.createElement("div");
  body.className = "dashboard-step-body";
  body.append(textElement("p", step.title, "dashboard-step-title"), textElement("p", step.text, "dashboard-step-text"));
  li.append(marker, body, stepAction(step));
  li.setAttribute("aria-label", `Paso ${index + 1}: ${step.title}${step.done ? " (completado)" : ""}`);
  return li;
}

function hasRate(data: Dashboard): boolean {
  const overview = getLastRateOverview();
  return overview ? overview.rate !== null : data.setup.has_rate;
}

export function renderSetup(data: Dashboard): void {
  const visible = data.setup.invoices === 0;
  elements.setupCard.classList.toggle("d-none", !visible);
  if (!visible) return;
  elements.setupRateAlert.classList.toggle("d-none", hasRate(data));
  elements.setupSteps.replaceChildren(...setupStepsOf(data).map(setupStepItem));
}
