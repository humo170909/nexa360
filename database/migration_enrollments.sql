-- ============================================================
-- NEXA360 — Migración: tabla "enrollments" (módulo Matrículas, Academia)
-- ============================================================
-- Ejecuta SOLO este archivo en el SQL Editor de Supabase — no vuelvas a
-- correr schema.sql completo, esas tablas ya existen. Este archivo es
-- aparte y seguro de ejecutar una sola vez (o de nuevo si algo falla a
-- mitad de camino: las políticas usan "drop policy if exists").
--
-- Requiere que la tabla "courses" ya exista (migration_courses.sql).
-- A diferencia de pets/vehicles/guardians (una entidad ligada a UN
-- cliente), una matrícula conecta DOS entidades — un alumno (clients)
-- y un curso (courses) — y es el primer caso real de relación
-- muchos-a-muchos del proyecto: un alumno puede tener varias
-- matrículas (una por curso) y un curso puede tener muchos alumnos.

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  student_id uuid not null references clients (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  status text not null default 'activa' check (status in ('activa', 'completada', 'cancelada')),
  enrolled_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  unique (student_id, course_id)
);

create index idx_enrollments_company on enrollments (company_id);
create index idx_enrollments_student on enrollments (student_id);
create index idx_enrollments_course on enrollments (course_id);

alter table enrollments enable row level security;

drop policy if exists "enrollments_select_members" on enrollments;
create policy "enrollments_select_members" on enrollments for select
  using (is_company_member(company_id));

drop policy if exists "enrollments_insert_members" on enrollments;
create policy "enrollments_insert_members" on enrollments for insert
  with check (is_company_member(company_id));

drop policy if exists "enrollments_update_members" on enrollments;
create policy "enrollments_update_members" on enrollments for update
  using (is_company_member(company_id));

drop policy if exists "enrollments_delete_admin_only" on enrollments;
create policy "enrollments_delete_admin_only" on enrollments for delete
  using (is_company_admin(company_id));
