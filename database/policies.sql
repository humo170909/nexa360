-- ============================================================
-- NEXA360 — Row Level Security (Fase 5)
-- ============================================================
-- Ejecutar DESPUÉS de schema.sql (estas reglas dependen de que las
-- tablas ya existan). Mismo lugar: Supabase → SQL Editor → New query.
--
-- Idea general: RLS hace que Postgres mismo rechace cualquier fila
-- que no le corresponda al usuario que hace la consulta — aunque
-- alguien manipule una petición desde el navegador, la base de datos
-- no entrega ni acepta datos de una empresa que no es la suya.

-- ------------------------------------------------------------
-- Funciones auxiliares (evitan repetir la misma subconsulta en
-- cada política, y usan SECURITY DEFINER para poder leer
-- company_users sin caer en una recursión de RLS sobre sí misma)
-- ------------------------------------------------------------
create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_superadmin from profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from company_users
    where company_id = target_company_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_company_admin(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from company_users
    where company_id = target_company_id
      and user_id = auth.uid()
      and role = 'ADMIN'
  );
$$;

-- ------------------------------------------------------------
-- profiles — protege: datos personales de cada usuario
-- ------------------------------------------------------------
alter table profiles enable row level security;

create policy "profiles_select_own_or_superadmin"
  on profiles for select
  using (id = auth.uid() or is_superadmin());

create policy "profiles_insert_own"
  on profiles for insert
  with check (id = auth.uid());

create policy "profiles_update_own_or_superadmin"
  on profiles for update
  using (id = auth.uid() or is_superadmin());

create policy "profiles_delete_superadmin_only"
  on profiles for delete
  using (is_superadmin());

-- ------------------------------------------------------------
-- companies — protege: datos de la empresa (nombre, tipo, plan)
-- ------------------------------------------------------------
alter table companies enable row level security;

create policy "companies_select_members_or_superadmin"
  on companies for select
  using (is_company_member(id) or is_superadmin());

create policy "companies_insert_authenticated"
  on companies for insert
  with check (auth.uid() is not null);

create policy "companies_update_admin_or_superadmin"
  on companies for update
  using (is_company_admin(id) or is_superadmin());

create policy "companies_delete_superadmin_only"
  on companies for delete
  using (is_superadmin());

-- ------------------------------------------------------------
-- company_users — protege: quién pertenece a qué empresa y con
-- qué rol (el corazón del aislamiento multiempresa)
-- ------------------------------------------------------------
alter table company_users enable row level security;

create policy "company_users_select_members_or_superadmin"
  on company_users for select
  using (is_company_member(company_id) or is_superadmin());

create policy "company_users_insert_admin_or_superadmin"
  on company_users for insert
  with check (is_company_admin(company_id) or is_superadmin());

create policy "company_users_update_admin_or_superadmin"
  on company_users for update
  using (is_company_admin(company_id) or is_superadmin());

create policy "company_users_delete_admin_or_superadmin"
  on company_users for delete
  using (is_company_admin(company_id) or is_superadmin());

-- ------------------------------------------------------------
-- clients / services / appointments / reminders — mismo patrón:
-- protege datos operativos de cada empresa. SUPERADMIN queda
-- DELIBERADAMENTE fuera de estas políticas: no puede navegar los
-- datos de clientes de una empresa solo por ser superadmin
-- (privacidad — su rol es administrar la plataforma, no operar
-- el negocio de cada cliente).
-- ------------------------------------------------------------
alter table clients enable row level security;

create policy "clients_select_members" on clients for select
  using (is_company_member(company_id));
create policy "clients_insert_members" on clients for insert
  with check (is_company_member(company_id));
create policy "clients_update_members" on clients for update
  using (is_company_member(company_id));
create policy "clients_delete_admin_only" on clients for delete
  using (is_company_admin(company_id));

alter table services enable row level security;

create policy "services_select_members" on services for select
  using (is_company_member(company_id));
create policy "services_insert_members" on services for insert
  with check (is_company_member(company_id));
create policy "services_update_members" on services for update
  using (is_company_member(company_id));
create policy "services_delete_admin_only" on services for delete
  using (is_company_admin(company_id));

alter table appointments enable row level security;

create policy "appointments_select_members" on appointments for select
  using (is_company_member(company_id));
create policy "appointments_insert_members" on appointments for insert
  with check (is_company_member(company_id));
create policy "appointments_update_members" on appointments for update
  using (is_company_member(company_id));
create policy "appointments_delete_admin_only" on appointments for delete
  using (is_company_admin(company_id));

-- reminders: los envíos automáticos (Fase 12/13) los hará una
-- función programada usando la service_role key, que por diseño
-- de Supabase se salta RLS por completo — no necesita política propia.
alter table reminders enable row level security;

create policy "reminders_select_members" on reminders for select
  using (is_company_member(company_id));
create policy "reminders_insert_members" on reminders for insert
  with check (is_company_member(company_id));
create policy "reminders_update_members" on reminders for update
  using (is_company_member(company_id));
create policy "reminders_delete_admin_only" on reminders for delete
  using (is_company_admin(company_id));

-- ------------------------------------------------------------
-- audit_logs — protege: el registro de auditoría.
-- A propósito NO existe ninguna política de UPDATE: sin una
-- política permisiva para UPDATE, Postgres deniega todas las
-- actualizaciones por defecto. Ni un ADMIN ni un SUPERADMIN pueden
-- editar un log ya escrito — si se pudiera, dejaría de servir como
-- evidencia.
-- ------------------------------------------------------------
alter table audit_logs enable row level security;

create policy "audit_logs_select_admin_or_superadmin"
  on audit_logs for select
  using (is_company_admin(company_id) or is_superadmin());

create policy "audit_logs_insert_members_or_superadmin"
  on audit_logs for insert
  with check (
    (company_id is not null and is_company_member(company_id))
    or (company_id is null and is_superadmin())
  );

create policy "audit_logs_delete_superadmin_only"
  on audit_logs for delete
  using (is_superadmin());
