-- ============================================================
-- NEXA360 — Migración: tabla "business_hours" (módulo Horarios,
-- Configuración → universal, todos los rubros)
-- ============================================================
-- Ejecuta SOLO este archivo en el SQL Editor de Supabase — no vuelvas a
-- correr schema.sql completo, esas tablas ya existen. Este archivo es
-- aparte y seguro de ejecutar una sola vez (o de nuevo si algo falla a
-- mitad de camino: las políticas usan "drop policy if exists").
--
-- Una fila por día de la semana por empresa (0 = domingo ... 6 = sábado,
-- igual que Date.getDay() en JavaScript). No hay owner_id: son horarios
-- de la empresa completa, no de un cliente.

create table business_hours (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (company_id, day_of_week)
);

create index idx_business_hours_company on business_hours (company_id);

alter table business_hours enable row level security;

drop policy if exists "business_hours_select_members" on business_hours;
create policy "business_hours_select_members" on business_hours for select
  using (is_company_member(company_id));

drop policy if exists "business_hours_insert_members" on business_hours;
create policy "business_hours_insert_members" on business_hours for insert
  with check (is_company_member(company_id));

drop policy if exists "business_hours_update_members" on business_hours;
create policy "business_hours_update_members" on business_hours for update
  using (is_company_member(company_id));

drop policy if exists "business_hours_delete_admin_only" on business_hours;
create policy "business_hours_delete_admin_only" on business_hours for delete
  using (is_company_admin(company_id));
