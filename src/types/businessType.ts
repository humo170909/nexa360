import type { BusinessType } from "./company";

export interface NavModule {
  key: string;
  label: string;
  icon: string; // nombre de ícono de Material Symbols
  path: string;
}

export interface BusinessTypeConfig {
  id: BusinessType;
  label: string;
  icon: string;
  /** Cómo se llama la entidad principal para este rubro (ej. "Pacientes" en odontología) */
  entityLabel: string;
  /** Módulos que se agregan al menú además de los universales (config/navigation.ts) */
  extraModules: NavModule[];
}
