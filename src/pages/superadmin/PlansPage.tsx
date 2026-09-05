import { EmptyState } from "../../components/ui/EmptyState";

// companies.plan ya existe como columna (basic/pro/enterprise) pero
// ningún límite ni cobro está conectado a esos valores todavía — un
// panel de "Planes" mostraría controles que no cambian nada real. Se
// construye cuando haya una lógica de facturación/límites de verdad
// detrás.
export function PlansPage() {
  return (
    <EmptyState
      icon="workspace_premium"
      title="Planes — Próximamente"
      description='Cada empresa ya tiene un campo "plan" (basic/pro/enterprise), pero todavía no hay límites ni cobros distintos conectados a esos valores.'
    />
  );
}
