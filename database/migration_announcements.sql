-- ============================================================
-- NEXA360 — Migración: tabla "announcements" (módulo Comunicados,
-- Colegio)
-- ============================================================
-- Ejecuta SOLO este archivo en el SQL Editor de Supabase — no vuelvas a
-- correr schema.sql completo, esas tablas ya existen. Este archivo es
-- aparte y seguro de ejecutar una sola vez (o de nuevo si algo falla a
-- mitad de camino: las políticas usan "drop policy if exists").
--
-- Comunicados generales de la empresa — no están ligados a un
-- estudiante en particular (a diferencia de guardians/grades), por eso
-- no tiene columna owner_id.

create table announcements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  title text not null,
  body text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_announcements_company on announcements (company_id);

alter table announcements enable row level security;

drop policy if exists "announcements_select_members" on announcements;
create policy "announcements_select_members" on announcements for select
  using (is_company_member(company_id));

drop policy if exists "announcements_insert_members" on announcements;
create policy "announcements_insert_members" on announcements for insert
  with check (is_company_member(company_id));

drop policy if exists "announcements_update_members" on announcements;
create policy "announcements_update_members" on announcements for update
  using (is_company_member(company_id));

drop policy if exists "announcements_delete_admin_only" on announcements;
create policy "announcements_delete_admin_only" on announcements for delete
  using (is_company_admin(company_id));
