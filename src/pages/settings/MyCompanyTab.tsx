import { useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import { useBusinessType } from "../../hooks/useBusinessType";
import { updateCompanyName } from "../../services/companies";
import { logAction } from "../../services/auditLogs";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

export function MyCompanyTab() {
  const { user } = useAuth();
  const { company, role, refetch } = useCompany();
  const businessType = useBusinessType();

  const [name, setName] = useState(company?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!company || !name.trim()) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error } = await updateCompanyName(company.id, name.trim());
    if (error) {
      setError("No se pudo guardar el cambio.");
      setSaving(false);
      return;
    }
    await logAction(company.id, user?.id ?? null, "company.update", { name: name.trim() });
    await refetch();
    setSaving(false);
    setSaved(true);
  }

  const isAdmin = role === "ADMIN";

  return (
    <div className="max-w-lg space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre de la empresa"
          required
          disabled={!isAdmin}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="flex flex-col gap-2">
          <label className="text-label-md text-on-surface">Tipo de negocio</label>
          <div className="w-full h-12 px-4 flex items-center gap-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">{businessType?.icon}</span>
            {businessType?.label}
          </div>
          <span className="text-label-sm text-on-surface-variant">
            No se puede cambiar — define qué módulos ves en el menú. Si tu negocio cambió
            de rubro, contáctanos.
          </span>
        </div>

        {!isAdmin ? (
          <p className="text-label-sm text-on-surface-variant">
            Solo un administrador de la empresa puede editar estos datos.
          </p>
        ) : null}
        {error ? <p className="text-label-sm text-error">{error}</p> : null}
        {saved ? <p className="text-label-sm text-secondary">Guardado.</p> : null}

        {isAdmin ? (
          <Button type="submit" fullWidth={false} loading={saving}>
            Guardar cambios
          </Button>
        ) : null}
      </form>
    </div>
  );
}
