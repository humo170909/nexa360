-- ============================================================
-- NEXA360 — Migración: tabla "eye_measurements" (módulo Medidas
-- visuales, Óptica)
-- ============================================================
-- Ejecuta SOLO este archivo en el SQL Editor de Supabase — no vuelvas a
-- correr schema.sql completo, esas tablas ya existen. Este archivo es
-- aparte y seguro de ejecutar una sola vez (o de nuevo si algo falla a
-- mitad de camino: las políticas usan "drop policy if exists").

create table eye_measurements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  owner_id uuid not null references clients (id) on delete cascade,
  measured_at date not null default current_date,
  od_sphere numeric(4, 2),
  od_cylinder numeric(4, 2),
  od_axis integer,
  os_sphere numeric(4, 2),
  os_cylinder numeric(4, 2),
  os_axis integer,
  pupillary_distance numeric(4, 1),
  notes text,
  created_at timestamptz not null default now()
);

create index idx_eye_measurements_company on eye_measurements (company_id);
create index idx_eye_measurements_owner on eye_measurements (owner_id);

alter table eye_measurements enable row level security;

-- Mismo patrón que pets/vehicles: cualquier miembro de la empresa puede
-- ver/crear/editar, solo ADMIN elimina. "od" = ojo derecho (oculus
-- dexter), "os" = ojo izquierdo (oculus sinister) — nomenclatura óptica
-- estándar, no abreviaciones inventadas.
drop policy if exists "eye_measurements_select_members" on eye_measurements;
create policy "eye_measurements_select_members" on eye_measurements for select
  using (is_company_member(company_id));

drop policy if exists "eye_measurements_insert_members" on eye_measurements;
create policy "eye_measurements_insert_members" on eye_measurements for insert
  with check (is_company_member(company_id));

drop policy if exists "eye_measurements_update_members" on eye_measurements;
create policy "eye_measurements_update_members" on eye_measurements for update
  using (is_company_member(company_id));

drop policy if exists "eye_measurements_delete_admin_only" on eye_measurements;
create policy "eye_measurements_delete_admin_only" on eye_measurements for delete
  using (is_company_admin(company_id));
