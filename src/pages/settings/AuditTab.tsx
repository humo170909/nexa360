import { useEffect, useState } from "react";
import { useCompany } from "../../hooks/useCompany";
import { listAuditLogDetailed, type AuditLogWithUser } from "../../services/auditLogs";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatDateLong, formatTime } from "../../lib/utils";

export function AuditTab() {
  const { company, role } = useCompany();
  const [logs, setLogs] = useState<AuditLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company || role !== "ADMIN") {
      setLoading(false);
      return;
    }
    listAuditLogDetailed(company.id).then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, [company, role]);

  if (role !== "ADMIN") {
    return (
      <EmptyState
        icon="lock"
        title="Solo para administradores"
        description="El registro de auditoría solo lo puede ver un administrador de la empresa."
      />
    );
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      {loading ? (
        <div className="py-16 text-center text-body-sm text-on-surface-variant">Cargando...</div>
      ) : (
        <DataTable
          columns={[
            { header: "Fecha", render: (l: AuditLogWithUser) => formatDateLong(new Date(l.created_at)) },
            { header: "Hora", render: (l: AuditLogWithUser) => formatTime(l.created_at) },
            { header: "Usuario", render: (l: AuditLogWithUser) => l.user?.full_name ?? "—" },
            { header: "Acción", render: (l: AuditLogWithUser) => l.action },
          ]}
          rows={logs}
          getRowKey={(l) => l.id}
          emptyMessage="Todavía no hay actividad registrada."
        />
      )}
    </div>
  );
}
