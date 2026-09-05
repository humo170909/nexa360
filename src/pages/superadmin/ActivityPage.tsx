import { EmptyState } from "../../components/ui/EmptyState";

// Distinto de "Auditoría" (AuditPage.tsx, ya real): esto sería un feed
// en vivo (usuarios conectados ahora, eventos en tiempo real), no una
// tabla de historial. Requiere Supabase Realtime, que este proyecto
// todavía no usa en ningún módulo — se agrega cuando haga falta de
// verdad, no antes.
export function ActivityPage() {
  return (
    <EmptyState
      icon="monitoring"
      title="Actividad en vivo — Próximamente"
      description="Un feed en tiempo real de lo que pasa ahora mismo en la plataforma. Mientras tanto, revisa Auditoría para el historial de eventos ya ocurridos."
    />
  );
}
