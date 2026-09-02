-- ============================================================
-- NEXA360 — Migración: tabla "sales" (módulo Ventas, Óptica)
-- ============================================================
-- Ejecuta SOLO este archivo en el SQL Editor de Supabase — no vuelvas a
-- correr schema.sql completo, esas tablas ya existen. Este archivo es
-- aparte y seguro de ejecutar una sola vez (o de nuevo si algo falla a
-- mitad de camino: las políticas usan "drop policy if exists").

create table sales (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  owner_id uuid not null references clients (id) on delete cascade,
  item_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(10, 2) not null default 0,
  sold_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index idx_sales_company on sales (company_id);
create index idx_sales_owner on sales (owner_id);

alter table sales enable row level security;

-- Mismo patrón que pets/vehicles: cualquier miembro de la empresa puede
-- ver/crear/editar, solo ADMIN elimina.
drop policy if exists "sales_select_members" on sales;
create policy "sales_select_members" on sales for select
  using (is_company_member(company_id));

drop policy if exists "sales_insert_members" on sales;
create policy "sales_insert_members" on sales for insert
  with check (is_company_member(company_id));

drop policy if exists "sales_update_members" on sales;
create policy "sales_update_members" on sales for update
  using (is_company_member(company_id));

drop policy if exists "sales_delete_admin_only" on sales;
create policy "sales_delete_admin_only" on sales for delete
  using (is_company_admin(company_id));
