import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../hooks/useCompany";
import { useBusinessType } from "../../hooks/useBusinessType";
import { listCompletedAppointments } from "../../services/appointments";
import type { AppointmentWithDetails } from "../../types/appointment";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { formatDateLong, formatTime } from "../../lib/utils";

// Registro de lo que YA se hizo (citas atendidas) — Agenda es la vista
// de programación hacia adelante, esta es la vista histórica hacia atrás.
// Reutiliza los mismos datos de citas/servicios; no hay una tabla
// "treatments" propia todavía (ver docs/arquitectura.md).
export function TreatmentsPage() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const businessType = useBusinessType();
  const entityLabel = businessType?.entityLabel ?? "Clientes";
  const title = businessType?.extraModules.find((m) => m.key === "treatments")?.label ?? "Tratamientos";

  const [rows, setRows] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company) return;
    setLoading(true);
    listCompletedAppointments(company.id).then((data) => {
      setRows(data);
      setLoading(false);
    });
  }, [company]);

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle="Servicios ya realizados." />

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
              { header: title, render: (a: AppointmentWithDetails) => a.service?.name ?? "—" },
              {
                header: "Fecha",
                render: (a: AppointmentWithDetails) =>
                  `${formatDateLong(new Date(a.starts_at))}, ${formatTime(a.starts_at)}`,
              },
              { header: "Notas", render: (a: AppointmentWithDetails) => a.notes || "—" },
            ]}
            rows={rows}
            getRowKey={(a) => a.id}
            emptyMessage={`Todavía no hay ${title.toLowerCase()} registrados.`}
          />
        )}
      </div>
    </div>
  );
}
