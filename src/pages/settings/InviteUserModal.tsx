import { useState, type FormEvent } from "react";
import { createUserInvitation } from "../../services/userInvitations";
import { logAction } from "../../services/auditLogs";
import { useAuth } from "../../hooks/useAuth";
import type { CompanyRole } from "../../types/company";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  onInvited: () => void;
}

export function InviteUserModal({ open, onClose, companyId, onInvited }: InviteUserModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CompanyRole>("USUARIO");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setName("");
    setEmail("");
    setRole("USUARIO");
    setError(null);
    setLink(null);
    setCopied(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const { link: generatedLink, error } = await createUserInvitation(companyId, {
      email,
      name,
      role,
    });

    setSaving(false);
    if (error || !generatedLink) {
      setError("No se pudo crear la invitación.");
      return;
    }

    await logAction(companyId, user?.id ?? null, "user.invited", { email, role });
    setLink(generatedLink);
    onInvited();
  }

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
  }

  return (
    <Modal open={open} onClose={handleClose} title="Invitar usuario">
      {link ? (
        <div className="space-y-6 text-center">
          <p className="text-label-md text-on-surface-variant">
            Comparte este enlace con {email} — todavía no enviamos correos automáticos, así que
            tienes que entregárselo tú mismo (WhatsApp, email manual, etc.).
          </p>
          <p className="text-body-sm text-primary break-all bg-surface-container-low rounded-lg p-3">
            {link}
          </p>
          <p className="text-label-sm text-error">
            Guárdalo ahora — no se puede volver a ver después de cerrar esta ventana.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" fullWidth={false} onClick={handleCopy}>
              <span className="material-symbols-outlined text-[18px]">
                {copied ? "check" : "content_copy"}
              </span>
              {copied ? "Copiado" : "Copiar enlace"}
            </Button>
            <Button fullWidth={false} onClick={handleClose}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Correo electrónico"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Select label="Rol" value={role} onChange={(e) => setRole(e.target.value as CompanyRole)}>
            <option value="USUARIO">USUARIO</option>
            <option value="ADMIN">ADMIN</option>
          </Select>
          <p className="text-label-sm text-on-surface-variant">
            La invitación expira en 7 días si no se acepta.
          </p>
          {error ? <p className="text-label-sm text-error">{error}</p> : null}
          <Button type="submit" loading={saving}>
            Enviar invitación
          </Button>
        </form>
      )}
    </Modal>
  );
}
