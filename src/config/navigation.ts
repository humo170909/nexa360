import type { NavModule } from "../types/businessType";

// Módulos que TODA empresa ve, sin importar su rubro. Sidebar.tsx (Fase 8)
// concatena esto con los "extraModules" de config/businessTypes.ts.
export const CORE_MODULES: NavModule[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard", path: "/dashboard" },
  { key: "clients", label: "Clientes", icon: "groups", path: "/clients" },
  { key: "agenda", label: "Agenda", icon: "calendar_today", path: "/agenda" },
  { key: "services", label: "Servicios", icon: "settings_suggest", path: "/services" },
  { key: "reminders", label: "Recordatorios", icon: "notifications_active", path: "/reminders" },
  { key: "reports", label: "Reportes", icon: "analytics", path: "/reports" },
];
