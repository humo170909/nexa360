import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import { useBusinessType } from "../../hooks/useBusinessType";
import { listCourses, createCourse, updateCourse, deleteCourse, type CourseInput } from "../../services/courses";
import { listTeachers } from "../../services/teachers";
import { logAction } from "../../services/auditLogs";
import type { CourseWithTeacher } from "../../types/course";
import type { Teacher } from "../../types/teacher";
import { DataTable } from "../../components/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";

const emptyForm: CourseInput = {
  name: "",
  teacher_id: "",
  description: "",
  price: null,
  notes: "",
};

function formatPrice(price: number | null): string {
  if (price === null) return "—";
  return new Intl.NumberFormat("es", { style: "currency", currency: "USD" }).format(price);
}

export function CoursesPage() {
  const { user } = useAuth();
  const { company, role } = useCompany();
  const businessType = useBusinessType();
  const title = businessType?.extraModules.find((m) => m.key === "courses")?.label ?? "Cursos";

  const [courses, setCourses] = useState<CourseWithTeacher[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CourseWithTeacher | null>(null);
  const [form, setForm] = useState<CourseInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(currentSearch: string) {
    if (!company) return;
    setLoading(true);
    const data = await listCourses(company.id, { search: currentSearch });
    setCourses(data);
    setLoading(false);
  }

  useEffect(() => {
    if (!company) return;
    refresh("");
    listTeachers(company.id).then(setTeachers);
  }, [company]);

  useEffect(() => {
    const timer = setTimeout(() => refresh(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(course: CourseWithTeacher) {
    setEditing(course);
    setForm({
      name: course.name,
      teacher_id: course.teacher_id ?? "",
      description: course.description ?? "",
      price: course.price,
      notes: course.notes ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!company || !form.name.trim()) return;
    setSaving(true);
    setError(null);
    const payload = { ...form, teacher_id: form.teacher_id || null };

    if (editing) {
      const { error } = await updateCourse(editing.id, payload);
      if (error) {
        setError("No se pudo guardar los cambios.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "course.update", { course_id: editing.id });
    } else {
      const { data, error } = await createCourse(company.id, payload);
      if (error) {
        setError("No se pudo crear el curso.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "course.create", { course_id: data?.id });
    }

    setSaving(false);
    setModalOpen(false);
    refresh(search);
  }

  async function handleDelete(course: CourseWithTeacher) {
    if (!company) return;
    if (!confirm(`¿Eliminar "${course.name}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await deleteCourse(course.id);
    if (error) {
      alert("No se pudo eliminar (revisa tus permisos).");
      return;
    }
    await logAction(company.id, user?.id ?? null, "course.delete", { course_id: course.id });
    refresh(search);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle="Catálogo de cursos que ofreces."
        action={{ label: "Nuevo", icon: "add", onClick: openCreate }}
      />

      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
          search
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cursos..."
          className="w-full h-10 pl-10 pr-4 rounded-lg bg-surface-container-lowest border border-outline-variant text-body-sm focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
        />
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-body-sm text-on-surface-variant">
            Cargando...
          </div>
        ) : (
          <DataTable
            columns={[
              { header: "Curso", render: (c: CourseWithTeacher) => c.name },
              { header: "Profesor", render: (c: CourseWithTeacher) => c.teacher_name },
              { header: "Precio", render: (c: CourseWithTeacher) => formatPrice(c.price) },
              {
                header: "",
                align: "right",
                render: (c: CourseWithTeacher) => (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(c)}
                      className="text-on-surface-variant hover:text-primary"
                      aria-label="Editar"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    {role === "ADMIN" ? (
                      <button
                        onClick={() => handleDelete(c)}
                        className="text-on-surface-variant hover:text-error"
                        aria-label="Eliminar"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    ) : null}
                  </div>
                ),
              },
            ]}
            rows={courses}
            getRowKey={(c) => c.id}
            emptyMessage={
              search ? "No se encontraron resultados." : "Aún no hay cursos registrados."
            }
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar curso" : "Nuevo curso"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Select
            label="Profesor a cargo"
            value={form.teacher_id ?? ""}
            onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
          >
            <option value="">Sin asignar</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </Select>
          <Input
            label="Descripción"
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Precio"
            type="number"
            min={0}
            step="0.01"
            value={form.price ?? ""}
            onChange={(e) =>
              setForm({ ...form, price: e.target.value ? Number(e.target.value) : null })
            }
          />
          <Input
            label="Notas"
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
