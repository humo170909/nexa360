-- ============================================================
-- NEXA360 — Migración: tabla "vehicles" (módulo Vehículos, Taller)
-- ============================================================
-- Ejecuta SOLO este archivo en el SQL Editor de Supabase — no vuelvas a
-- correr schema.sql completo, esas tablas ya existen. Este archivo es
-- aparte y seguro de ejecutar una sola vez (o de nuevo si algo falla a
-- mitad de camino: las políticas usan "drop policy if exists").

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  owner_id uuid not null references clients (id) on delete cascade,
  plate text not null,
  brand text,
  model text,
  year integer,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_vehicles_company on vehicles (company_id);
create index idx_vehicles_owner on vehicles (owner_id);

alter table vehicles enable row level security;

-- Mismo patrón que pets/clients/services: cualquier miembro de la empresa
-- puede ver/crear/editar, solo ADMIN elimina. Reutiliza las funciones
-- is_company_member()/is_company_admin() ya definidas en policies.sql.
drop policy if exists "vehicles_select_members" on vehicles;
create policy "vehicles_select_members" on vehicles for select
  using (is_company_member(company_id));

drop policy if exists "vehicles_insert_members" on vehicles;
create policy "vehicles_insert_members" on vehicles for insert
  with check (is_company_member(company_id));

drop policy if exists "vehicles_update_members" on vehicles;
create policy "vehicles_update_members" on vehicles for update
  using (is_company_member(company_id));

drop policy if exists "vehicles_delete_admin_only" on vehicles;
create policy "vehicles_delete_admin_only" on vehicles for delete
  using (is_company_admin(company_id));
