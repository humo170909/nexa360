import { useState, type FormEvent } from "react";
import { createInvitation } from "../../services/invitations";
import { logAction } from "../../services/auditLogs";
import { useAuth } from "../../hooks/useAuth";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

interface GenerateInvitationModalProps {
  open: boolean;
  onClose: () => void;
  onGenerated: () => void;
}

function defaultExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export function GenerateInvitationModal({ open, onClose, onGenerated }: GenerateInvitationModalProps) {
  const { user } = useAuth();
  const [expiresAt, setExpiresAt] = useState(defaultExpiry());
  const [maxUses, setMaxUses] = useState(1);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setExpiresAt(defaultExpiry());
    setMaxUses(1);
    setNotes("");
    setError(null);
    setGeneratedCode(null);
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

    const { code, error } = await createInvitation({
      expiresAt: new Date(`${expiresAt}T23:59:59`).toISOString(),
      maxUses,
      notes,
    });

    setSaving(false);
    if (error || !code) {
      setError("No se pudo generar el código.");
      return;
    }

    await logAction(null, user?.id ?? null, "invitation.created", { max_uses: maxUses });
    setGeneratedCode(code);
    onGenerated();
  }

  async function handleCopy() {
    if (!generatedCode) return;
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
  }

  return (
    <Modal open={open} onClose={handleClose} title="Generar invitación">
      {generatedCode ? (
        <div className="space-y-6 text-center">
          <p className="text-label-md text-on-surface-variant">Código generado:</p>
          <p className="text-display-lg text-primary tracking-wider font-mono">{generatedCode}</p>
          <p className="text-label-sm text-error">
            Guárdalo ahora — no se puede volver a ver después de cerrar esta ventana. Solo se
            guarda su hash, no el código en sí.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" fullWidth={false} onClick={handleCopy}>
              <span className="material-symbols-outlined text-[18px]">
                {copied ? "check" : "content_copy"}
              </span>
              {copied ? "Copiado" : "Copiar código"}
            </Button>
            <Button fullWidth={false} onClick={handleClose}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Fecha de expiración"
            type="date"
            required
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
          <Input
            label="Cantidad de usos"
            type="number"
            min={1}
            required
            value={maxUses}
            onChange={(e) => setMaxUses(Number(e.target.value))}
          />
          <Input
            label="Notas (opcional)"
            placeholder='Ej: "Para Óptica Vision"'
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {error ? <p className="text-label-sm text-error">{error}</p> : null}
          <Button type="submit" loading={saving}>
            Generar código
          </Button>
        </form>
      )}
    </Modal>
  );
}
