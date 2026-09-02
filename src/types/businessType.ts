import type { BusinessType } from "./company";

export interface NavModule {
  key: string;
  label: string;
  icon: string; // nombre de ícono de Material Symbols
  path: string;
}

// Los únicos números que el Dashboard puede mostrar hoy sin inventar datos:
// se calculan de verdad en services/dashboard.ts (getDashboardStats).
export type DashboardMetric =
  | "appointmentsToday"
  | "completedToday"
  | "entityTotal"
  | "remindersPending"
  | "servicesActive";

export interface DashboardKpiSlot {
  metric: DashboardMetric;
  label: string;
  icon: string;
}

export interface BusinessTypeConfig {
  id: BusinessType;
  label: string;
  icon: string;
  /** Cómo se llama la entidad principal para este rubro (ej. "Pacientes" en odontología) */
  entityLabel: string;
  /** Módulos que se agregan al menú además de los universales (config/navigation.ts) */
  extraModules: NavModule[];
  /** Los 4 KPI del Dashboard, en orden. Si se omite, se usa DEFAULT_DASHBOARD_KPIS. */
  dashboardKpis?: DashboardKpiSlot[];
}
