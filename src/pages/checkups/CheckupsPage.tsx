import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../hooks/useCompany";
import { useBusinessType } from "../../hooks/useBusinessType";
import { listAppointmentsForRange } from "../../services/appointments";
import { STATUS_LABEL, STATUS_TONE, type AppointmentWithDetails } from "../../types/appointment";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { Badge } from "../../components/ui/Badge";
import { formatDateLong, formatTime } from "../../lib/utils";

// Lo que VIENE (citas futuras pendientes/confirmadas) — el reverso de
// Tratamientos. Mismos datos de Agenda, filtrados a "todavía no ocurren".
export function CheckupsPage() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const businessType = useBusinessType();
  const entityLabel = businessType?.entityLabel ?? "Clientes";
  const title = businessType?.extraModules.find((m) => m.key === "checkups")?.label ?? "Controles";

  const [rows, setRows] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company) return;
    setLoading(true);
    const now = new Date();
    const in180Days = new Date();
    in180Days.setDate(in180Days.getDate() + 180);
    listAppointmentsForRange(company.id, now.toISOString(), in180Days.toISOString()).then((data) => {
      setRows(data.filter((a) => a.status === "pendiente" || a.status === "confirmada"));
      setLoading(false);
    });
  }, [company]);

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle="Próximas citas programadas." />

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-body-sm text-on-surface-variant">
            Cargando...
          </div>
        ) : (
          <DataTable
            columns={[
              {
                header: entityLabel,
                render: (a: AppointmentWithDetails) => (
                  <button
                    onClick={() => navigate(`/clients/${a.client_id}`)}
                    className="text-primary font-medium hover:underline"
                  >
                    {a.client?.full_name ?? "—"}
                  </button>
                ),
              },
              { header: "Servicio", render: (a: AppointmentWithDetails) => a.service?.name ?? "—" },
              {
                header: "Fecha",
                render: (a: AppointmentWithDetails) =>
                  `${formatDateLong(new Date(a.starts_at))}, ${formatTime(a.starts_at)}`,
              },
              {
                header: "Estado",
                render: (a: AppointmentWithDetails) => (
                  <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                ),
              },
            ]}
            rows={rows}
            getRowKey={(a) => a.id}
            emptyMessage={`No hay ${title.toLowerCase()} programados.`}
          />
        )}
      </div>
    </div>
  );
}
