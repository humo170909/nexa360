import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import { useBusinessType } from "../../hooks/useBusinessType";
import {
  listEnrollments,
  createEnrollment,
  updateEnrollment,
  deleteEnrollment,
} from "../../services/enrollments";
import { listClients } from "../../services/clients";
import { listCourses } from "../../services/courses";
import { logAction } from "../../services/auditLogs";
import {
  STATUS_LABEL,
  STATUS_OPTIONS,
  STATUS_TONE,
  type EnrollmentInput,
  type EnrollmentWithDetails,
} from "../../types/enrollment";
import type { Client } from "../../types/client";
import type { CourseWithTeacher } from "../../types/course";
import { DataTable } from "../../components/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { formatDateLong } from "../../lib/utils";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm: EnrollmentInput = {
  student_id: "",
  course_id: "",
  status: "activa",
  enrolled_at: todayIso(),
  notes: "",
};

export function EnrollmentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { company, role } = useCompany();
  const businessType = useBusinessType();
  const entityLabel = businessType?.entityLabel ?? "Alumnos";
  const title =
    businessType?.extraModules.find((m) => m.key === "enrollments")?.label ?? "Matrículas";

  const [rows, setRows] = useState<EnrollmentWithDetails[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [courses, setCourses] = useState<CourseWithTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EnrollmentWithDetails | null>(null);
  const [form, setForm] = useState<EnrollmentInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(currentSearch: string) {
    if (!company) return;
    setLoading(true);
    const data = await listEnrollments(company.id, { search: currentSearch });
    setRows(data);
    setLoading(false);
  }

  useEffect(() => {
    if (!company) return;
    refresh("");
    listClients(company.id).then(setClients);
    listCourses(company.id).then(setCourses);
  }, [company]);

  useEffect(() => {
    const timer = setTimeout(() => refresh(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      student_id: clients[0]?.id ?? "",
      course_id: courses[0]?.id ?? "",
      enrolled_at: todayIso(),
    });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: EnrollmentWithDetails) {
    setEditing(row);
    setForm({
      student_id: row.student_id,
      course_id: row.course_id,
      status: row.status,
      enrolled_at: row.enrolled_at,
      notes: row.notes ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!company || !form.student_id || !form.course_id) return;
    setSaving(true);
    setError(null);

    if (editing) {
      const { error } = await updateEnrollment(editing.id, form);
      if (error) {
        setError(error);
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "enrollment.update", {
        enrollment_id: editing.id,
      });
    } else {
      const { data, error } = await createEnrollment(company.id, form);
      if (error) {
        setError(error);
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "enrollment.create", {
        enrollment_id: data?.id,
      });
    }

    setSaving(false);
    setModalOpen(false);
    refresh(search);
  }

  async function handleDelete(row: EnrollmentWithDetails) {
    if (!company) return;
    if (
      !confirm(
        `¿Eliminar la matrícula de "${row.student_name}" en "${row.course_name}"? Esta acción no se puede deshacer.`,
      )
    )
      return;
    const { error } = await deleteEnrollment(row.id);
    if (error) {
      alert("No se pudo eliminar (revisa tus permisos).");
      return;
    }
    await logAction(company.id, user?.id ?? null, "enrollment.delete", { enrollment_id: row.id });
    refresh(search);
  }

  const canCreate = clients.length > 0 && courses.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle="Alumnos matriculados en cada curso."
        action={canCreate ? { label: "Nueva", icon: "add", onClick: openCreate } : undefined}
      />

      {!loading && !canCreate ? (
        <p className="text-body-sm text-on-surface-variant">
          Necesitas al menos un {entityLabel.toLowerCase().replace(/s$/, "")} y un curso
          registrados antes de poder crear una matrícula.
        </p>
      ) : null}

      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
          search
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por alumno o curso..."
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
              {
                header: entityLabel.replace(/s$/, ""),
                render: (r: EnrollmentWithDetails) => (
                  <button
                    onClick={() => navigate(`/clients/${r.student_id}`)}
                    className="text-primary font-medium hover:underline"
                  >
                    {r.student_name}
                  </button>
                ),
              },
              { header: "Curso", render: (r: EnrollmentWithDetails) => r.course_name },
              {
                header: "Fecha",
                render: (r: EnrollmentWithDetails) => formatDateLong(new Date(r.enrolled_at)),
              },
              {
                header: "Estado",
                render: (r: EnrollmentWithDetails) => (
                  <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                ),
              },
              {
                header: "",
                align: "right",
                render: (r: EnrollmentWithDetails) => (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(r)}
                      className="text-on-surface-variant hover:text-primary"
                      aria-label="Editar"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    {role === "ADMIN" ? (
                      <button
                        onClick={() => handleDelete(r)}
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
            rows={rows}
            getRowKey={(r) => r.id}
            emptyMessage={
              search ? "No se encontraron resultados." : "Aún no hay matrículas registradas."
            }
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar matrícula" : "Nueva matrícula"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label={entityLabel.replace(/s$/, "")}
            required
            value={form.student_id}
            onChange={(e) => setForm({ ...form, student_id: e.target.value })}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </Select>
          <Select
            label="Curso"
            required
            value={form.course_id}
            onChange={(e) => setForm({ ...form, course_id: e.target.value })}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            label="Estado"
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as EnrollmentInput["status"] })
            }
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
          <Input
            label="Fecha de matrícula"
            type="date"
            required
            value={form.enrolled_at}
            onChange={(e) => setForm({ ...form, enrolled_at: e.target.value })}
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
