import { json } from "../../lib/http";
import { getDashboard } from "./dashboard.service";

/** GET /api/v1/dashboard — resumen del panel de inicio: ventas, por cobrar, stock bajo, tasa y actividad reciente. */
export function getDashboardHandler(): Response {
  return json(getDashboard());
}
