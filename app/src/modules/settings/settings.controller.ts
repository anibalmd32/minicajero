import { json } from "../../lib/http";
import { readJson } from "../../lib/request";
import { getSettings, updateSettings } from "./settings.service";

/** GET /api/v1/settings — configuración del negocio. */
export function getSettingsHandler(): Response {
  return json(getSettings());
}

/** PUT /api/v1/settings — actualiza la configuración (los campos omitidos no cambian). */
export async function putSettingsHandler(req: Request): Promise<Response> {
  return json(updateSettings(await readJson(req)));
}
