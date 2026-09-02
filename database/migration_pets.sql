-- ============================================================
-- NEXA360 — Migración: tabla "pets" (módulo Mascotas, Veterinaria)
-- ============================================================
-- Ejecuta SOLO este archivo en el SQL Editor de Supabase — no vuelvas a
-- correr schema.sql completo, esas tablas ya existen. Este archivo es
-- aparte y seguro de ejecutar una sola vez (o de nuevo si algo falla a
-- mitad de camino: las políticas usan "drop policy if exists").

create table pets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  owner_id uuid not null references clients (id) on delete cascade,
  name text not null,
  species text,
  breed text,
  birth_date date,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_pets_company on pets (company_id);
create index idx_pets_owner on pets (owner_id);

alter table pets enable row level security;

-- Mismo patrón que clients/services: cualquier miembro de la empresa
-- puede ver/crear/editar, solo ADMIN elimina. Reutiliza las funciones
-- is_company_member()/is_company_admin() ya definidas en policies.sql.
drop policy if exists "pets_select_members" on pets;
create policy "pets_select_members" on pets for select
  using (is_company_member(company_id));

drop policy if exists "pets_insert_members" on pets;
create policy "pets_insert_members" on pets for insert
  with check (is_company_member(company_id));

drop policy if exists "pets_update_members" on pets;
create policy "pets_update_members" on pets for update
  using (is_company_member(company_id));

drop policy if exists "pets_delete_admin_only" on pets;
create policy "pets_delete_admin_only" on pets for delete
  using (is_company_admin(company_id));
