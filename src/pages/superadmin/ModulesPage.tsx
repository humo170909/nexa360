import { EmptyState } from "../../components/ui/EmptyState";

// Qué módulos ve cada empresa ya se decide por business_type
// (src/config/businessTypes.ts) — activar/desactivar módulos POR
// EMPRESA individual (más allá de su rubro) es una capa extra que no
// existe todavía. Construirla implica una tabla nueva y tocar cómo lee
// Sidebar.tsx su lista de módulos; se hace si de verdad se necesita.
export function ModulesPage() {
  return (
    <EmptyState
      icon="widgets"
      title="Módulos por empresa — Próximamente"
      description="Hoy los módulos de cada empresa dependen de su tipo de negocio. Activar o desactivar módulos individualmente por empresa es una capa que todavía no existe."
    />
  );
}
