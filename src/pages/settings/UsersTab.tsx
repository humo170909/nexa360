import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import {
  listCompanyUsersDetailed,
  updateMemberRole,
  removeMember,
  type CompanyMemberDetailed,
} from "../../services/companies";
import {
  listUserInvitations,
  cancelUserInvitation,
  resendUserInvitation,
} from "../../services/userInvitations";
import { logAction } from "../../services/auditLogs";
import type { CompanyRole } from "../../types/company";
import {
  userInvitationStatus,
  USER_INVITATION_STATUS_LABEL,
  type UserInvitation,
} from "../../types/userInvitation";
import { DataTable } from "../../components/DataTable";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { InviteUserModal } from "./InviteUserModal";
import { formatDateLong } from "../../lib/utils";

const INVITATION_STATUS_TONE = {
  pendiente: "info",
  aceptada: "success",
  expirada: "error",
  cancelada: "neutral",
} as const;

export function UsersTab() {
  const { user } = useAuth();
  const { company, role } = useCompany();
  const isAdmin = role === "ADMIN";

  const [members, setMembers] = useState<CompanyMemberDetailed[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyInvitationId, setBusyInvitationId] = useState<string | null>(null);
  const [newLink, setNewLink] = useState<string | null>(null);

  async function refresh() {
    if (!company) return;
    setLoading(true);
    const [membersData, invitationsData] = await Promise.all([
      listCompanyUsersDetailed(company.id),
      isAdmin ? listUserInvitations(company.id) : Promise.resolve([]),
    ]);
    setMembers(membersData);
    setInvitations(invitationsData);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [company, role]);

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

  async function handleRemove(member: CompanyMemberDetailed) {
    if (!company) return;
    if (
      !confirm(
        `¿Quitar a "${member.full_name ?? "este usuario"}" de la empresa? Pierde acceso de inmediato — su cuenta sigue existiendo, solo deja de pertenecer a esta empresa.`,
      )
    )
      return;
    setSavingId(member.companyUserId);
    const { error } = await removeMember(member.companyUserId);
    setSavingId(null);
    if (error) {
      alert("No se pudo quitar al usuario (revisa tus permisos).");
      return;
    }
    await logAction(company.id, user?.id ?? null, "company_user.removed", {
      target_user_id: member.id,
    });
    refresh();
  }

  async function handleCancel(invitation: UserInvitation) {
    if (!company) return;
    if (!confirm(`¿Cancelar la invitación a ${invitation.invited_email}?`)) return;
    setBusyInvitationId(invitation.id);
    const { error } = await cancelUserInvitation(invitation.id);
    setBusyInvitationId(null);
    if (error) {
      alert("No se pudo cancelar la invitación.");
      return;
    }
    await logAction(company.id, user?.id ?? null, "user_invitation.cancelled", {
      invitation_id: invitation.id,
    });
    refresh();
  }

  async function handleResend(invitation: UserInvitation) {
    if (!company) return;
    setBusyInvitationId(invitation.id);
    const { link, error } = await resendUserInvitation(company.id, invitation);
    setBusyInvitationId(null);
    if (error || !link) {
      alert("No se pudo reenviar la invitación.");
      return;
    }
    await logAction(company.id, user?.id ?? null, "user.invited", {
      email: invitation.invited_email,
      role: invitation.role,
      resent: true,
    });
    setNewLink(link);
    refresh();
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-body-md text-on-surface-variant">
            Personas con acceso a esta empresa.
          </p>
          {isAdmin ? (
            <Button fullWidth={false} onClick={() => setModalOpen(true)}>
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Invitar usuario
            </Button>
          ) : null}
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
                    if (!isAdmin || isSelf) {
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
                {
                  header: "",
                  align: "right",
                  render: (m: CompanyMemberDetailed) => {
                    // Mismo resguardo que el cambio de rol: nunca te
                    // puedes quitar a ti mismo (te dejaría sin poder
                    // administrar la empresa si eras el único ADMIN).
                    const isSelf = m.id === user?.id;
                    if (!isAdmin || isSelf) return null;
                    return (
                      <button
                        onClick={() => handleRemove(m)}
                        disabled={savingId === m.companyUserId}
                        className="text-on-surface-variant hover:text-error disabled:opacity-50"
                        aria-label="Quitar de la empresa"
                        title="Quitar de la empresa"
                      >
                        <span className="material-symbols-outlined text-[18px]">person_remove</span>
                      </button>
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

      {isAdmin ? (
        <div className="space-y-4">
          <p className="text-body-md text-on-surface-variant">Invitaciones enviadas.</p>
          {newLink ? (
            <div className="bg-secondary-fixed text-on-secondary-fixed-variant rounded-lg p-4 space-y-2">
              <p className="text-label-sm">Nuevo enlace generado — cópialo, solo se muestra una vez:</p>
              <p className="text-body-sm break-all font-mono">{newLink}</p>
              <button
                onClick={() => setNewLink(null)}
                className="text-label-sm underline"
              >
                Cerrar
              </button>
            </div>
          ) : null}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-16 text-center text-body-sm text-on-surface-variant">
                Cargando...
              </div>
            ) : (
              <DataTable
                columns={[
                  { header: "Correo", render: (i: UserInvitation) => i.invited_email },
                  { header: "Rol", render: (i: UserInvitation) => i.role },
                  {
                    header: "Fecha",
                    render: (i: UserInvitation) => formatDateLong(new Date(i.created_at)),
                  },
                  {
                    header: "Estado",
                    render: (i: UserInvitation) => {
                      const status = userInvitationStatus(i);
                      return (
                        <Badge tone={INVITATION_STATUS_TONE[status]}>
                          {USER_INVITATION_STATUS_LABEL[status]}
                        </Badge>
                      );
                    },
                  },
                  {
                    header: "",
                    align: "right",
                    render: (i: UserInvitation) => {
                      const status = userInvitationStatus(i);
                      if (status === "pendiente") {
                        return (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleResend(i)}
                              disabled={busyInvitationId === i.id}
                              className="text-on-surface-variant hover:text-primary disabled:opacity-50"
                              title="Reenviar (genera un enlace nuevo)"
                            >
                              <span className="material-symbols-outlined text-[18px]">refresh</span>
                            </button>
                            <button
                              onClick={() => handleCancel(i)}
                              disabled={busyInvitationId === i.id}
                              className="text-on-surface-variant hover:text-error disabled:opacity-50"
                              title="Cancelar"
                            >
                              <span className="material-symbols-outlined text-[18px]">cancel</span>
                            </button>
                          </div>
                        );
                      }
                      if (status === "expirada") {
                        return (
                          <button
                            onClick={() => handleResend(i)}
                            disabled={busyInvitationId === i.id}
                            className="text-on-surface-variant hover:text-primary disabled:opacity-50"
                            title="Reenviar (genera un enlace nuevo)"
                          >
                            <span className="material-symbols-outlined text-[18px]">refresh</span>
                          </button>
                        );
                      }
                      return null;
                    },
                  },
                ]}
                rows={invitations}
                getRowKey={(i) => i.id}
                emptyMessage="No has enviado ninguna invitación todavía."
              />
            )}
          </div>
        </div>
      ) : null}

      {company ? (
        <InviteUserModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          companyId={company.id}
          onInvited={refresh}
        />
      ) : null}
    </div>
  );
}
