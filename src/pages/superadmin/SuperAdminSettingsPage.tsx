import { EmptyState } from "../../components/ui/EmptyState";

// Configuración a nivel plataforma (ej. marca blanca, dominios propios
// por empresa, política global de contraseñas) — ninguna de estas
// existe todavía como funcionalidad real.
export function SuperAdminSettingsPage() {
  return (
    <EmptyState
      icon="settings"
      title="Configuración de la plataforma — Próximamente"
      description="Ajustes globales de NEXA360 (más allá de una empresa individual) todavía no están construidos."
    />
  );
}
