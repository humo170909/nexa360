import { BUSINESS_TYPES } from "../config/businessTypes";
import { useCompany } from "./useCompany";
import type { BusinessTypeConfig } from "../types/businessType";

// Resuelve la configuración (módulos extra, etiqueta de la entidad
// principal) del tipo de negocio de la empresa activa. Devuelve null
// mientras no hay empresa cargada todavía (ver useCompany).
export function useBusinessType(): BusinessTypeConfig | null {
  const { company } = useCompany();
  if (!company) return null;
  return BUSINESS_TYPES[company.business_type];
}
