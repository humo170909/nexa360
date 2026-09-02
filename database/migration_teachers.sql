-- ============================================================
-- NEXA360 — Migración: tabla "teachers" (módulo Docentes/Profesores,
-- Colegio y Academia)
-- ============================================================
-- Ejecuta SOLO este archivo en el SQL Editor de Supabase — no vuelvas a
-- correr schema.sql completo, esas tablas ya existen. Este archivo es
-- aparte y seguro de ejecutar una sola vez (o de nuevo si algo falla a
-- mitad de camino: las políticas usan "drop policy if exists").
--
-- Una sola tabla, compartida por Colegio ("Docentes") y Academia
-- ("Profesores") — mismo dato, distinta etiqueta según business_type,
-- igual que ya pasa con /history y /treatments en otros rubros.
-- Si vas a usar el módulo de Grados (migration_grades.sql), ejecuta
-- este archivo PRIMERO — grades.teacher_id depende de esta tabla.

create table teachers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  full_name text not null,
  specialty text,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_teachers_company on teachers (company_id);

alter table teachers enable row level security;

drop policy if exists "teachers_select_members" on teachers;
create policy "teachers_select_members" on teachers for select
  using (is_company_member(company_id));

drop policy if exists "teachers_insert_members" on teachers;
create policy "teachers_insert_members" on teachers for insert
  with check (is_company_member(company_id));

drop policy if exists "teachers_update_members" on teachers;
create policy "teachers_update_members" on teachers for update
  using (is_company_member(company_id));

drop policy if exists "teachers_delete_admin_only" on teachers;
create policy "teachers_delete_admin_only" on teachers for delete
  using (is_company_admin(company_id));
