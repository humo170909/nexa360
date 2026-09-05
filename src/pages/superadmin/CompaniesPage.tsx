import { useEffect, useState } from "react";
import { listAllCompanies, updateCompanyStatus, type CompanyWithMemberCount } from "../../services/superadmin";
import { logAction } from "../../services/auditLogs";
import { useAuth } from "../../hooks/useAuth";
import { BUSINESS_TYPES } from "../../config/businessTypes";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { Badge } from "../../components/ui/Badge";
import { formatDateLong } from "../../lib/utils";

export function CompaniesPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<CompanyWithMemberCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const data = await listAllCompanies();
    setCompanies(data);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleToggleStatus(company: CompanyWithMemberCount) {
    const suspending = company.is_active;
    const confirmMessage = suspending
      ? `¿Suspender "${company.name}"? Sus usuarios perderán acceso a la plataforma de inmediato.`
      : `¿Reactivar "${company.name}"? Sus usuarios recuperarán acceso de inmediato.`;
    if (!confirm(confirmMessage)) return;

    setUpdatingId(company.id);
    const { error } = await updateCompanyStatus(company.id, !suspending);
    setUpdatingId(null);

    if (error) {
      alert("No se pudo actualizar el estado de la empresa.");
      return;
    }
    await logAction(company.id, user?.id ?? null, suspending ? "company.suspended" : "company.activated", {});
    refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Empresas" subtitle="Todas las empresas registradas en NEXA360." />
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-body-sm text-on-surface-variant">
            Cargando...
          </div>
        ) : (
          <DataTable
            columns={[
              { header: "Nombre", render: (c: CompanyWithMemberCount) => c.name },
              {
                header: "Rubro",
                render: (c: CompanyWithMemberCount) =>
                  BUSINESS_TYPES[c.business_type]?.label ?? c.business_type,
              },
              {
                header: "Administrador",
                render: (c: CompanyWithMemberCount) => c.owner_name ?? "—",
              },
              { header: "Usuarios", render: (c: CompanyWithMemberCount) => c.member_count },
              {
                header: "Estado",
                render: (c: CompanyWithMemberCount) => (
                  <Badge tone={c.is_active ? "success" : "error"}>
                    {c.is_active ? "Activa" : "Suspendida"}
                  </Badge>
                ),
              },
              {
                header: "Creada",
                render: (c: CompanyWithMemberCount) => formatDateLong(new Date(c.created_at)),
              },
              {
                header: "",
                align: "right",
                render: (c: CompanyWithMemberCount) => (
                  <button
                    onClick={() => handleToggleStatus(c)}
                    disabled={updatingId === c.id}
                    className={`text-label-sm px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                      c.is_active
                        ? "border-outline-variant text-on-surface-variant hover:text-error hover:border-error"
                        : "border-outline-variant text-on-surface-variant hover:text-secondary hover:border-secondary"
                    }`}
                  >
                    {c.is_active ? "Suspender" : "Activar"}
                  </button>
                ),
              },
            ]}
            rows={companies}
            getRowKey={(c) => c.id}
            emptyMessage="Todavía no hay empresas registradas."
          />
        )}
      </div>
    </div>
  );
}
