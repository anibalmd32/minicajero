import { api } from "./api";

/** Moneda que se muestra como principal en la UI. */
export type DisplayCurrency = "USD" | "VES";

/** Configuración del negocio devuelta por `/api/v1/settings`. */
export interface BusinessSettings {
  business_name: string;
  business_rif: string;
  business_address: string;
  business_phone: string;
  iva_percent: number;
  display_currency: DisplayCurrency;
  low_stock_threshold: number;
}

/** Cambios admitidos al guardar; los campos omitidos no se modifican. */
export type SettingsChanges = Partial<Record<keyof BusinessSettings, unknown>>;

/** Obtiene la configuración vigente. */
export function fetchSettings(): Promise<BusinessSettings> {
  return api.get<BusinessSettings>("/settings");
}

/** Guarda la configuración y devuelve la resultante. */
export function saveSettings(changes: SettingsChanges): Promise<BusinessSettings> {
  return api.put<BusinessSettings>("/settings", changes);
}
