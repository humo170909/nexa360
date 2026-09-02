import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../hooks/useCompany";
import { useBusinessType } from "../../hooks/useBusinessType";
import { listClientsWithLastVisit, type ClientWithLastVisit } from "../../services/clients";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { formatDateLong, formatRelativeTime } from "../../lib/utils";

// A diferencia de la lista de Clientes (enfocada en datos de contacto y
// alta/edición), esta pantalla está ordenada por "hace cuánto no viene" —
// útil para saber a quién contactar. Ambas leen la misma tabla, pero
// responden preguntas distintas.
export function HistoryPage() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const businessType = useBusinessType();
  const entityLabel = businessType?.entityLabel ?? "Clientes";
  const historyLabel = businessType?.extraModules.find((m) => m.key === "history")?.label ?? "Historial";

  const [rows, setRows] = useState<ClientWithLastVisit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company) return;
    setLoading(true);
    listClientsWithLastVisit(company.id).then((data) => {
      setRows(data);
      setLoading(false);
    });
  }, [company]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={historyLabel}
        subtitle={`${entityLabel} ordenados por su última visita.`}
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
                header: entityLabel,
                render: (c: ClientWithLastVisit) => (
                  <button
                    onClick={() => navigate(`/clients/${c.id}`)}
                    className="text-primary font-medium hover:underline"
                  >
                    {c.full_name}
                  </button>
                ),
              },
              {
                header: "Última visita",
                render: (c: ClientWithLastVisit) =>
                  c.last_visit ? formatDateLong(new Date(c.last_visit)) : "—",
              },
              {
                header: "Hace",
                render: (c: ClientWithLastVisit) =>
                  c.last_visit ? formatRelativeTime(c.last_visit) : "Nunca ha venido",
              },
            ]}
            rows={rows}
            getRowKey={(c) => c.id}
            emptyMessage={`Aún no tienes ${entityLabel.toLowerCase()} registrados.`}
          />
        )}
      </div>
    </div>
  );
}
