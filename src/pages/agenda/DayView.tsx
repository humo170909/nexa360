import { DataTable } from "../../components/DataTable";
import { Badge } from "../../components/ui/Badge";
import { STATUS_LABEL, STATUS_TONE, type AppointmentWithDetails } from "../../types/appointment";
import { formatTime } from "../../lib/utils";

interface DayViewProps {
  appointments: AppointmentWithDetails[];
  entityLabel: string;
  canDelete: boolean;
  onEdit: (appointment: AppointmentWithDetails) => void;
  onDelete: (appointment: AppointmentWithDetails) => void;
}

export function DayView({ appointments, entityLabel, canDelete, onEdit, onDelete }: DayViewProps) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <DataTable
        columns={[
          { header: "Hora", render: (a: AppointmentWithDetails) => formatTime(a.starts_at) },
          {
            header: entityLabel,
            render: (a: AppointmentWithDetails) => a.client?.full_name ?? "—",
          },
          {
            header: "Servicio",
            render: (a: AppointmentWithDetails) => a.service?.name ?? "—",
          },
          {
            header: "Estado",
            render: (a: AppointmentWithDetails) => (
              <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
            ),
          },
          {
            header: "",
            align: "right",
            render: (a: AppointmentWithDetails) => (
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => onEdit(a)}
                  className="text-on-surface-variant hover:text-primary"
                  aria-label="Editar cita"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                {canDelete ? (
                  <button
                    onClick={() => onDelete(a)}
                    className="text-on-surface-variant hover:text-error"
                    aria-label="Eliminar cita"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                ) : null}
              </div>
            ),
          },
        ]}
        rows={appointments}
        getRowKey={(a) => a.id}
        emptyMessage="No hay citas programadas para este día."
      />
    </div>
  );
}
