import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import { listBusinessHours, saveBusinessHours } from "../../services/businessHours";
import { logAction } from "../../services/auditLogs";
import { DAY_LABELS, type BusinessHour } from "../../types/businessHours";
import { Button } from "../../components/ui/Button";

export function HoursTab() {
  const { user } = useAuth();
  const { company, role } = useCompany();
  const isAdmin = role === "ADMIN";

  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!company) return;
    setLoading(true);
    listBusinessHours(company.id).then((data) => {
      setHours(data);
      setLoading(false);
    });
  }, [company]);

  function updateDay(dayOfWeek: number, patch: Partial<BusinessHour>) {
    setSaved(false);
    setHours((prev) => prev.map((h) => (h.day_of_week === dayOfWeek ? { ...h, ...patch } : h)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    setSaved(false);

    const { error } = await saveBusinessHours(
      company.id,
      hours.map((h) => ({
        day_of_week: h.day_of_week,
        opens_at: h.is_closed ? null : h.opens_at,
        closes_at: h.is_closed ? null : h.closes_at,
        is_closed: h.is_closed,
      })),
    );
    if (error) {
      alert("No se pudo guardar el horario.");
      setSaving(false);
      return;
    }
    await logAction(company.id, user?.id ?? null, "business_hours.update", {});
    setSaving(false);
    setSaved(true);
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-body-sm text-on-surface-variant">Cargando...</div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-body-md text-on-surface-variant">
        Define el horario de atención de tu empresa. Días marcados como
        "cerrado" no muestran hora de apertura ni de cierre.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {hours.map((h) => (
          <div
            key={h.day_of_week}
            className="flex flex-wrap items-center gap-4 p-3 rounded-lg border border-outline-variant bg-surface-container-lowest"
          >
            <span className="w-28 text-label-md text-on-surface">
              {DAY_LABELS[h.day_of_week]}
            </span>

            <label className="flex items-center gap-2 text-label-sm text-on-surface-variant">
              <input
                type="checkbox"
                checked={h.is_closed}
                disabled={!isAdmin}
                onChange={(e) => updateDay(h.day_of_week, { is_closed: e.target.checked })}
              />
              Cerrado
            </label>

            {!h.is_closed ? (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={h.opens_at ?? ""}
                  disabled={!isAdmin}
                  onChange={(e) => updateDay(h.day_of_week, { opens_at: e.target.value })}
                  className="h-9 px-2 rounded-lg bg-surface-container-lowest border border-outline-variant text-label-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all disabled:opacity-50"
                />
                <span className="text-on-surface-variant text-label-sm">a</span>
                <input
                  type="time"
                  value={h.closes_at ?? ""}
                  disabled={!isAdmin}
                  onChange={(e) => updateDay(h.day_of_week, { closes_at: e.target.value })}
                  className="h-9 px-2 rounded-lg bg-surface-container-lowest border border-outline-variant text-label-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all disabled:opacity-50"
                />
              </div>
            ) : (
              <span className="text-label-sm text-on-surface-variant italic">Sin atención</span>
            )}
          </div>
        ))}

        {!isAdmin ? (
          <p className="text-label-sm text-on-surface-variant">
            Solo un administrador de la empresa puede editar el horario.
          </p>
        ) : null}
        {saved ? <p className="text-label-sm text-secondary">Guardado.</p> : null}

        {isAdmin ? (
          <Button type="submit" fullWidth={false} loading={saving}>
            Guardar horario
          </Button>
        ) : null}
      </form>
    </div>
  );
}
