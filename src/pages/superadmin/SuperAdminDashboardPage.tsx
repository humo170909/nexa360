import { useEffect, useState } from "react";
import { listAllCompanies } from "../../services/superadmin";
import { listInvitations } from "../../services/invitations";
import { invitationStatus } from "../../types/invitation";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";

export function SuperAdminDashboardPage() {
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeInvitations, setActiveInvitations] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listAllCompanies(), listInvitations()]).then(([companies, invitations]) => {
      setTotalCompanies(companies.length);
      setTotalUsers(companies.reduce((sum, c) => sum + c.member_count, 0));
      setActiveInvitations(invitations.filter((i) => invitationStatus(i) === "active").length);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Resumen general de la plataforma NEXA360." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          label="Empresas registradas"
          value={loading ? "…" : totalCompanies}
          icon="domain"
        />
        <StatCard
          label="Usuarios totales"
          value={loading ? "…" : totalUsers}
          icon="group"
        />
        <StatCard
          label="Invitaciones activas"
          value={loading ? "…" : activeInvitations}
          icon="confirmation_number"
        />
      </div>
    </div>
  );
}
