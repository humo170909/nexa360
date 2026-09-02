import { useEffect, useState } from "react";
import { useCompany } from "../../hooks/useCompany";
import { listCompanyUsersDetailed, type CompanyMemberDetailed } from "../../services/companies";
import { DataTable } from "../../components/DataTable";
import { Badge } from "../../components/ui/Badge";

export function UsersTab() {
  const { company } = useCompany();
  const [members, setMembers] = useState<CompanyMemberDetailed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company) return;
    setLoading(true);
    listCompanyUsersDetailed(company.id).then((data) => {
      setMembers(data);
      setLoading(false);
    });
  }, [company]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-body-md text-on-surface-variant">
          Personas con acceso a esta empresa.
        </p>
        <button
          disabled
          title="Próximamente"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant text-label-md text-on-surface-variant opacity-50 cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Invitar usuario (Próximamente)
        </button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-body-sm text-on-surface-variant">
            Cargando...
          </div>
        ) : (
          <DataTable
            columns={[
              { header: "Nombre", render: (m: CompanyMemberDetailed) => m.full_name ?? "—" },
              {
                header: "Rol",
                render: (m: CompanyMemberDetailed) => (
                  <Badge tone={m.role === "ADMIN" ? "success" : "neutral"}>{m.role}</Badge>
                ),
              },
            ]}
            rows={members}
            getRowKey={(m) => m.id}
            emptyMessage="No hay usuarios registrados."
          />
        )}
      </div>
    </div>
  );
}
