-- ============================================================
-- NEXA360 — Migración: tabla "courses" (módulo Cursos, Academia)
-- ============================================================
-- Ejecuta SOLO este archivo en el SQL Editor de Supabase — no vuelvas a
-- correr schema.sql completo, esas tablas ya existen. Este archivo es
-- aparte y seguro de ejecutar una sola vez (o de nuevo si algo falla a
-- mitad de camino: las políticas usan "drop policy if exists").
--
-- Requiere que la tabla "teachers" ya exista (migration_teachers.sql,
-- compartida con Colegio) — "courses.teacher_id" es el profesor a
-- cargo del curso.

create table courses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  teacher_id uuid references teachers (id) on delete set null,
  description text,
  price numeric(10, 2),
  notes text,
  created_at timestamptz not null default now()
);

create index idx_courses_company on courses (company_id);
create index idx_courses_teacher on courses (teacher_id);

alter table courses enable row level security;

drop policy if exists "courses_select_members" on courses;
create policy "courses_select_members" on courses for select
  using (is_company_member(company_id));

drop policy if exists "courses_insert_members" on courses;
create policy "courses_insert_members" on courses for insert
  with check (is_company_member(company_id));

drop policy if exists "courses_update_members" on courses;
create policy "courses_update_members" on courses for update
  using (is_company_member(company_id));

drop policy if exists "courses_delete_admin_only" on courses;
create policy "courses_delete_admin_only" on courses for delete
  using (is_company_admin(company_id));
