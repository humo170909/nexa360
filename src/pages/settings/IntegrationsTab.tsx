import { EmptyState } from "../../components/ui/EmptyState";

// Igual que NotificationsTab: no hay ninguna integración de terceros
// conectada todavía (WhatsApp Business, pasarela de SMS, etc.). Un botón
// de "Conectar" que no conecta nada sería la misma simulación que el
// proyecto evita deliberadamente en Recordatorios.
export function IntegrationsTab() {
  return (
    <EmptyState
      icon="hub"
      title="Integraciones — Próximamente"
      description="Aquí vas a poder conectar WhatsApp, SMS u otros servicios cuando esas integraciones existan de verdad. Por ahora no hay ninguna construida, así que no mostramos botones de conexión que no hacen nada."
    />
  );
}
