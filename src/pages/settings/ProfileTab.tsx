import { useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import { updateProfile } from "../../services/profiles";
import { logAction } from "../../services/auditLogs";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

export function ProfileTab() {
  const { user } = useAuth();
  const { company } = useCompany();

  const [fullName, setFullName] = useState(
    (user?.user_metadata?.full_name as string | undefined) ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !fullName.trim()) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error } = await updateProfile(user.id, fullName.trim());
    if (error) {
      setError("No se pudo guardar el cambio.");
      setSaving(false);
      return;
    }
    await logAction(company?.id ?? null, user.id, "profile.update", {});
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="max-w-lg space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Correo electrónico" value={user?.email ?? ""} disabled />
        <Input
          label="Nombre completo"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        {error ? <p className="text-label-sm text-error">{error}</p> : null}
        {saved ? <p className="text-label-sm text-secondary">Guardado.</p> : null}
        <Button type="submit" fullWidth={false} loading={saving}>
          Guardar cambios
        </Button>
      </form>
    </div>
  );
}
