-- ============================================================
-- NEXA360 — Migración: tabla "guardians" (módulo Padres/Apoderados,
-- Colegio)
-- ============================================================
-- Ejecuta SOLO este archivo en el SQL Editor de Supabase — no vuelvas a
-- correr schema.sql completo, esas tablas ya existen. Este archivo es
-- aparte y seguro de ejecutar una sola vez (o de nuevo si algo falla a
-- mitad de camino: las políticas usan "drop policy if exists").
--
-- Cada fila es un padre/apoderado ligado a UN estudiante (owner_id
-- apunta a clients, igual que pets/vehicles). Si un estudiante tiene
-- dos apoderados (madre y padre, por ejemplo), se crean dos filas.

create table guardians (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  owner_id uuid not null references clients (id) on delete cascade,
  full_name text not null,
  relationship text check (relationship in ('madre', 'padre', 'tutor', 'otro')),
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_guardians_company on guardians (company_id);
create index idx_guardians_owner on guardians (owner_id);

alter table guardians enable row level security;

drop policy if exists "guardians_select_members" on guardians;
create policy "guardians_select_members" on guardians for select
  using (is_company_member(company_id));

drop policy if exists "guardians_insert_members" on guardians;
create policy "guardians_insert_members" on guardians for insert
  with check (is_company_member(company_id));

drop policy if exists "guardians_update_members" on guardians;
create policy "guardians_update_members" on guardians for update
  using (is_company_member(company_id));

drop policy if exists "guardians_delete_admin_only" on guardians;
create policy "guardians_delete_admin_only" on guardians for delete
  using (is_company_admin(company_id));
