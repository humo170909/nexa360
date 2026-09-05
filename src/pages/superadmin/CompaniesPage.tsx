import { useEffect, useState } from "react";
import { listAllCompanies, type CompanyWithMemberCount } from "../../services/superadmin";
import { BUSINESS_TYPES } from "../../config/businessTypes";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { Badge } from "../../components/ui/Badge";
import { formatDateLong } from "../../lib/utils";

export function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyWithMemberCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAllCompanies().then((data) => {
      setCompanies(data);
      setLoading(false);
    });
  }, []);

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
                render: (c: CompanyWithMemberCount) => BUSINESS_TYPES[c.business_type]?.label ?? c.business_type,
              },
              { header: "Plan", render: (c: CompanyWithMemberCount) => c.plan },
              { header: "Usuarios", render: (c: CompanyWithMemberCount) => c.member_count },
              {
                header: "Estado",
                render: (c: CompanyWithMemberCount) => (
                  <Badge tone={c.is_active ? "success" : "neutral"}>
                    {c.is_active ? "Activa" : "Inactiva"}
                  </Badge>
                ),
              },
              {
                header: "Creada",
                render: (c: CompanyWithMemberCount) => formatDateLong(new Date(c.created_at)),
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
