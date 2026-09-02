-- ============================================================
-- NEXA360 — Migración: tabla "grades" (módulo Grados, Colegio)
-- ============================================================
-- Ejecuta SOLO este archivo en el SQL Editor de Supabase — no vuelvas a
-- correr schema.sql completo, esas tablas ya existen. Este archivo es
-- aparte y seguro de ejecutar una sola vez (o de nuevo si algo falla a
-- mitad de camino: las políticas usan "drop policy if exists").
--
-- Requiere que la tabla "teachers" ya exista (migration_teachers.sql) —
-- "grades.teacher_id" es el docente a cargo del grado.

create table grades (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  teacher_id uuid references teachers (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_grades_company on grades (company_id);
create index idx_grades_teacher on grades (teacher_id);

alter table grades enable row level security;

drop policy if exists "grades_select_members" on grades;
create policy "grades_select_members" on grades for select
  using (is_company_member(company_id));

drop policy if exists "grades_insert_members" on grades;
create policy "grades_insert_members" on grades for insert
  with check (is_company_member(company_id));

drop policy if exists "grades_update_members" on grades;
create policy "grades_update_members" on grades for update
  using (is_company_member(company_id));

drop policy if exists "grades_delete_admin_only" on grades;
create policy "grades_delete_admin_only" on grades for delete
  using (is_company_admin(company_id));
