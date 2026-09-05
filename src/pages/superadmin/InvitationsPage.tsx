import { useEffect, useState } from "react";
import { listInvitations, disableInvitation } from "../../services/invitations";
import { logAction } from "../../services/auditLogs";
import { useAuth } from "../../hooks/useAuth";
import {
  invitationStatus,
  INVITATION_STATUS_LABEL,
  type InvitationWithCompany,
} from "../../types/invitation";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { DataTable } from "../../components/DataTable";
import { Badge } from "../../components/ui/Badge";
import { GenerateInvitationModal } from "./GenerateInvitationModal";
import { formatDateLong } from "../../lib/utils";

const STATUS_TONE = {
  active: "success",
  used: "neutral",
  expired: "error",
  disabled: "error",
} as const;

export function InvitationsPage() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<InvitationWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    const data = await listInvitations();
    setInvitations(data);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleDisable(inv: InvitationWithCompany) {
    if (!confirm("¿Desactivar este código? Ya no se podrá usar para registrarse.")) return;
    const { error } = await disableInvitation(inv.id);
    if (error) {
      alert("No se pudo desactivar el código.");
      return;
    }
    await logAction(null, user?.id ?? null, "invitation.disabled", { invitation_id: inv.id });
    refresh();
  }

  const total = invitations.length;
  const active = invitations.filter((i) => invitationStatus(i) === "active").length;
  const used = invitations.filter((i) => invitationStatus(i) === "used").length;
  const expired = invitations.filter((i) => invitationStatus(i) === "expired").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invitaciones"
        subtitle="Códigos de registro controlado — sin código, no hay cuenta nueva."
        action={{ label: "Generar código", icon: "add", onClick: () => setModalOpen(true) }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total de códigos" value={total} icon="confirmation_number" />
        <StatCard label="Activos" value={active} icon="check_circle" />
        <StatCard label="Usados" value={used} icon="task_alt" />
        <StatCard label="Expirados" value={expired} icon="hourglass_disabled" />
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-body-sm text-on-surface-variant">
            Cargando...
          </div>
        ) : (
          <DataTable
            columns={[
              {
                header: "Código",
                render: () => (
                  <span className="text-on-surface-variant italic" title="Solo se muestra en texto plano una vez, al generarlo — se guarda hasheado.">
                    •••• (oculto)
                  </span>
                ),
              },
              {
                header: "Estado",
                render: (i: InvitationWithCompany) => {
                  const status = invitationStatus(i);
                  return <Badge tone={STATUS_TONE[status]}>{INVITATION_STATUS_LABEL[status]}</Badge>;
                },
              },
              {
                header: "Creado",
                render: (i: InvitationWithCompany) => formatDateLong(new Date(i.created_at)),
              },
              {
                header: "Expira",
                render: (i: InvitationWithCompany) => formatDateLong(new Date(i.expires_at)),
              },
              {
                header: "Usos",
                render: (i: InvitationWithCompany) => `${i.used_count} / ${i.max_uses}`,
              },
              {
                header: "Creado por",
                render: (i: InvitationWithCompany) => i.creator_name ?? "—",
              },
              {
                header: "Empresa",
                render: (i: InvitationWithCompany) => i.company_name ?? "—",
              },
              {
                header: "",
                align: "right",
                render: (i: InvitationWithCompany) =>
                  invitationStatus(i) === "active" ? (
                    <button
                      onClick={() => handleDisable(i)}
                      className="text-on-surface-variant hover:text-error"
                      aria-label="Desactivar"
                      title="Desactivar"
                    >
                      <span className="material-symbols-outlined text-[18px]">block</span>
                    </button>
                  ) : null,
              },
            ]}
            rows={invitations}
            getRowKey={(i) => i.id}
            emptyMessage="Todavía no has generado ningún código de invitación."
          />
        )}
      </div>

      <GenerateInvitationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onGenerated={refresh}
      />
    </div>
  );
}
