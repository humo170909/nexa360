import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import { useBusinessType } from "../../hooks/useBusinessType";
import {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  type AnnouncementInput,
} from "../../services/announcements";
import { logAction } from "../../services/auditLogs";
import type { Announcement } from "../../types/announcement";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { formatDateLong } from "../../lib/utils";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm: AnnouncementInput = {
  title: "",
  body: "",
  published_at: todayIso(),
};

// Comunicados generales de la empresa — no una tabla, sino tarjetas
// tipo "muro de avisos", igual que se vería en la vida real (nadie
// lee comunicados en filas de una tabla).
export function AnnouncementsPage() {
  const { user } = useAuth();
  const { company, role } = useCompany();
  const businessType = useBusinessType();
  const title =
    businessType?.extraModules.find((m) => m.key === "announcements")?.label ?? "Comunicados";

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<AnnouncementInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!company) return;
    setLoading(true);
    const data = await listAnnouncements(company.id);
    setAnnouncements(data);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [company]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, published_at: todayIso() });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(a: Announcement) {
    setEditing(a);
    setForm({
      title: a.title,
      body: a.body ?? "",
      published_at: a.published_at.slice(0, 10),
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!company || !form.title.trim()) return;
    setSaving(true);
    setError(null);

    if (editing) {
      const { error } = await updateAnnouncement(editing.id, form);
      if (error) {
        setError("No se pudo guardar los cambios.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "announcement.update", {
        announcement_id: editing.id,
      });
    } else {
      const { data, error } = await createAnnouncement(company.id, form);
      if (error) {
        setError("No se pudo publicar el comunicado.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "announcement.create", {
        announcement_id: data?.id,
      });
    }

    setSaving(false);
    setModalOpen(false);
    refresh();
  }

  async function handleDelete(a: Announcement) {
    if (!company) return;
    if (!confirm(`¿Eliminar "${a.title}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await deleteAnnouncement(a.id);
    if (error) {
      alert("No se pudo eliminar (revisa tus permisos).");
      return;
    }
    await logAction(company.id, user?.id ?? null, "announcement.delete", { announcement_id: a.id });
    refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle="Avisos generales para toda la comunidad."
        action={{ label: "Nuevo", icon: "add", onClick: openCreate }}
      />

      {loading ? (
        <div className="py-16 text-center text-body-sm text-on-surface-variant">Cargando...</div>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon="campaign"
          title="Sin comunicados todavía"
          description="Publica el primer aviso para tus estudiantes y apoderados."
          action={{ label: "Nuevo comunicado", icon: "add", onClick: openCreate }}
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-headline-sm text-primary">{a.title}</h3>
                  <span className="text-label-sm text-on-surface-variant">
                    {formatDateLong(new Date(a.published_at))}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(a)}
                    className="text-on-surface-variant hover:text-primary"
                    aria-label="Editar"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  {role === "ADMIN" ? (
                    <button
                      onClick={() => handleDelete(a)}
                      className="text-on-surface-variant hover:text-error"
                      aria-label="Eliminar"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  ) : null}
                </div>
              </div>
              {a.body ? (
                <p className="text-body-md text-on-surface-variant mt-3 whitespace-pre-wrap">
                  {a.body}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar comunicado" : "Nuevo comunicado"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Título"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            label="Fecha de publicación"
            type="date"
            required
            value={form.published_at}
            onChange={(e) => setForm({ ...form, published_at: e.target.value })}
          />
          <Input
            label="Contenido"
            value={form.body ?? ""}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
          {error ? <p className="text-label-sm text-error">{error}</p> : null}
          <Button type="submit" loading={saving}>
            Guardar
          </Button>
        </form>
      </Modal>
    </div>
  );
}
