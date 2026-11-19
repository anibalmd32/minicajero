import type { Dashboard } from "../../dashboard";

/** Estado mutable de la página de inicio. */
export const dashboardState: { current: Dashboard | null; loadRequest: number; lastLoadedAt: number } = {
  current: null,
  loadRequest: 0,
  lastLoadedAt: 0,
};
