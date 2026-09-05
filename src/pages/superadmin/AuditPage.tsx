import { useEffect, useState } from "react";
import { listAllAuditLogs, type AuditLogGlobal } from "../../services/auditLogs";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { formatDateLong, formatTime } from "../../lib/utils";

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLogGlobal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAllAuditLogs().then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoría"
        subtitle="Últimos eventos de toda la plataforma (últimos 100)."
      />
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-body-sm text-on-surface-variant">
            Cargando...
          </div>
        ) : (
          <DataTable
            columns={[
              {
                header: "Fecha",
                render: (l: AuditLogGlobal) =>
                  `${formatDateLong(new Date(l.created_at))}, ${formatTime(l.created_at)}`,
              },
              { header: "Empresa", render: (l: AuditLogGlobal) => l.company?.name ?? "—" },
              { header: "Usuario", render: (l: AuditLogGlobal) => l.user?.full_name ?? "—" },
              { header: "Acción", render: (l: AuditLogGlobal) => l.action },
            ]}
            rows={logs}
            getRowKey={(l) => l.id}
            emptyMessage="Todavía no hay actividad registrada en la plataforma."
          />
        )}
      </div>
    </div>
  );
}
