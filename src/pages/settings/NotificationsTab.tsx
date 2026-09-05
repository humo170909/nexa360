import { EmptyState } from "../../components/ui/EmptyState";

// A propósito NO es un panel de "activar/desactivar notificaciones":
// hoy la app no tiene ningún canal de envío real conectado (los
// recordatorios por email se registran pero todavía no se envían — ver
// "Pendiente real" en MANUAL-DESARROLLADOR.md). Mostrar interruptores
// que no controlan nada sería simular una funcionalidad que no existe.
export function NotificationsTab() {
  return (
    <EmptyState
      icon="notifications"
      title="Notificaciones — Próximamente"
      description="Esta sección se activa cuando el envío real de recordatorios por email quede conectado. Configurar preferencias de un canal que todavía no envía nada sería mostrarte un control que no hace lo que promete."
    />
  );
}
