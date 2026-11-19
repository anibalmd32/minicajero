import "./bootstrap";
import logoUrl from "../../../assets/minicajero.svg";
import { requireAccess } from "./auth-guard";
import { mountLogoutButton } from "./logout-button";
import { mountNavStatus } from "./nav-status";
import { mountPhoneButton } from "./phone-connect";
import { startPhoneEvents } from "./phone-events";

/** Enlace de la navegación principal. */
export interface NavItem {
  href: string;
  label: string;
}

/** Secciones de la app en el orden en que aparecen en la navbar. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Inicio" },
  { href: "/ventas", label: "Ventas" },
  { href: "/facturas", label: "Facturas" },
  { href: "/clientes", label: "Clientes" },
  { href: "/inventario", label: "Inventario" },
  { href: "/configuracion", label: "Configuración" },
];

/** Id del contenedor de la navbar reservado para el indicador de tasa y el conmutador USD/Bs. */
export const NAV_STATUS_ID = "app-nav-status";

const NAV_HOST_ID = "app-nav";
const NAV_COLLAPSE_ID = "app-nav-links";

function normalizePath(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

function isCurrentSection(href: string, currentPath: string): boolean {
  const section = normalizePath(href);
  return section === currentPath || (section !== "/" && currentPath.startsWith(`${section}/`));
}

function renderNavLink(item: NavItem, currentPath: string): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "nav-item";
  const link = document.createElement("a");
  link.className = "nav-link";
  link.href = item.href;
  link.textContent = item.label;
  if (isCurrentSection(item.href, currentPath)) {
    link.classList.add("active");
    link.setAttribute("aria-current", "page");
  }
  li.append(link);
  return li;
}

function renderNavbar(currentPath: string): HTMLElement {
  const nav = document.createElement("nav");
  nav.className = "navbar navbar-expand-lg app-navbar";
  nav.dataset.bsTheme = "dark";
  nav.setAttribute("aria-label", "Navegación principal");
  nav.innerHTML = `
    <div class="container">
      <a class="navbar-brand d-inline-flex align-items-center gap-2" href="/">
        <img class="navbar-logo" src="${logoUrl}" alt="" width="30" height="30">
        <span>MiniCajero</span>
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#${NAV_COLLAPSE_ID}"
        aria-controls="${NAV_COLLAPSE_ID}" aria-expanded="false" aria-label="Mostrar u ocultar navegación">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div id="${NAV_STATUS_ID}" class="app-nav-status d-flex flex-wrap align-items-center gap-2 order-lg-last ms-lg-3"></div>
      <div class="collapse navbar-collapse" id="${NAV_COLLAPSE_ID}">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0"></ul>
      </div>
    </div>`;
  nav.querySelector("ul")?.append(...NAV_ITEMS.map((item) => renderNavLink(item, currentPath)));
  return nav;
}

/** Pinta la navbar común en el `<header id="app-nav">` de la página (idempotente). */
export function mountLayout(): void {
  const host = document.getElementById(NAV_HOST_ID);
  if (!host || host.childElementCount > 0) return;
  host.append(renderNavbar(normalizePath(window.location.pathname)));
}

/** Contenedor de la navbar donde se colocan el estado de la tasa y el conmutador de moneda. */
export function getNavStatusSlot(): HTMLElement | null {
  return document.getElementById(NAV_STATUS_ID);
}

if (await requireAccess()) {
  mountLayout();
  const navStatusSlot = getNavStatusSlot();
  if (navStatusSlot) mountNavStatus(navStatusSlot);
  const navToggler = document.querySelector(`#${NAV_HOST_ID} .navbar-toggler`);
  if (navToggler) {
    mountPhoneButton(navToggler);
    mountLogoutButton(navToggler);
  }
  startPhoneEvents();
}
