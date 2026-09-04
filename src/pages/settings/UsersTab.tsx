import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import {
  listCompanyUsersDetailed,
  updateMemberRole,
  type CompanyMemberDetailed,
} from "../../services/companies";
import { logAction } from "../../services/auditLogs";
import type { CompanyRole } from "../../types/company";
import { DataTable } from "../../components/DataTable";
import { Badge } from "../../components/ui/Badge";

export function UsersTab() {
  const { user } = useAuth();
  const { company, role } = useCompany();
  const [members, setMembers] = useState<CompanyMemberDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function refresh() {
    if (!company) return;
    setLoading(true);
    const data = await listCompanyUsersDetailed(company.id);
    setMembers(data);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [company]);

  async function handleRoleChange(member: CompanyMemberDetailed, newRole: CompanyRole) {
    if (!company || newRole === member.role) return;
    setSavingId(member.companyUserId);
    const { error } = await updateMemberRole(member.companyUserId, newRole);
    if (error) {
      alert("No se pudo cambiar el rol (revisa tus permisos).");
      setSavingId(null);
      return;
    }
    await logAction(company.id, user?.id ?? null, "company_user.role_change", {
      target_user_id: member.id,
      new_role: newRole,
    });
    setSavingId(null);
    refresh();
  }

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
                render: (m: CompanyMemberDetailed) => {
                  // Solo un ADMIN puede reasignar roles, y nunca el suyo propio
                  // (evita que se quite el único acceso de administrador que tiene).
                  const isSelf = m.id === user?.id;
                  if (role !== "ADMIN" || isSelf) {
                    return <Badge tone={m.role === "ADMIN" ? "success" : "neutral"}>{m.role}</Badge>;
                  }
                  return (
                    <select
                      aria-label={`Rol de ${m.full_name ?? "usuario"}`}
                      value={m.role}
                      disabled={savingId === m.companyUserId}
                      onChange={(e) => handleRoleChange(m, e.target.value as CompanyRole)}
                      className="h-9 px-2 rounded-lg bg-surface-container-lowest border border-outline-variant text-label-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all disabled:opacity-50"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="USUARIO">USUARIO</option>
                    </select>
                  );
                },
              },
            ]}
            rows={members}
            getRowKey={(m) => m.companyUserId}
            emptyMessage="No hay usuarios registrados."
          />
        )}
      </div>
    </div>
  );
}
