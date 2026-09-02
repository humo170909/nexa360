-- ============================================================
-- NEXA360 — Row Level Security (Fase 5)
-- ============================================================
-- Ejecutar DESPUÉS de schema.sql (estas reglas dependen de que las
-- tablas ya existan). Mismo lugar: Supabase → SQL Editor → New query.
--
-- Este archivo es SEGURO DE RE-EJECUTAR completo cuantas veces quieras
-- (cada "create policy" va precedido de "drop policy if exists") — útil
-- si sospechas que una ejecución anterior quedó incompleta a mitad de
-- camino, como pasó la primera vez con "companies_insert_authenticated".
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

drop policy if exists "profiles_select_own_or_superadmin" on profiles;
create policy "profiles_select_own_or_superadmin"
  on profiles for select
  using (id = auth.uid() or is_superadmin());

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own"
  on profiles for insert
  with check (id = auth.uid());

drop policy if exists "profiles_update_own_or_superadmin" on profiles;
create policy "profiles_update_own_or_superadmin"
  on profiles for update
  using (id = auth.uid() or is_superadmin());

drop policy if exists "profiles_delete_superadmin_only" on profiles;
create policy "profiles_delete_superadmin_only"
  on profiles for delete
  using (is_superadmin());

-- ------------------------------------------------------------
-- companies — protege: datos de la empresa (nombre, tipo, plan)
-- ------------------------------------------------------------
alter table companies enable row level security;

-- El "or owner_id = auth.uid()" es necesario: el trigger que crea la fila
-- en company_users (más abajo) corre en un AFTER INSERT, y hay casos donde
-- Postgres evalúa la visibilidad del RETURNING del INSERT antes de que esa
-- fila quede visible para is_company_member(). Comprobar owner_id
-- directamente sobre la misma fila evita depender de esa carrera.
drop policy if exists "companies_select_members_or_superadmin" on companies;
create policy "companies_select_members_or_superadmin"
  on companies for select
  using (
    is_company_member(id)
    or is_superadmin()
    or owner_id = auth.uid()
  );

drop policy if exists "companies_insert_authenticated" on companies;
create policy "companies_insert_authenticated"
  on companies for insert
  with check (auth.uid() is not null);

drop policy if exists "companies_update_admin_or_superadmin" on companies;
create policy "companies_update_admin_or_superadmin"
  on companies for update
  using (is_company_admin(id) or is_superadmin());

drop policy if exists "companies_delete_superadmin_only" on companies;
create policy "companies_delete_superadmin_only"
  on companies for delete
  using (is_superadmin());

-- ------------------------------------------------------------
-- company_users — protege: quién pertenece a qué empresa y con
-- qué rol (el corazón del aislamiento multiempresa)
-- ------------------------------------------------------------
alter table company_users enable row level security;

drop policy if exists "company_users_select_members_or_superadmin" on company_users;
create policy "company_users_select_members_or_superadmin"
  on company_users for select
  using (is_company_member(company_id) or is_superadmin());

drop policy if exists "company_users_insert_admin_or_superadmin" on company_users;
create policy "company_users_insert_admin_or_superadmin"
  on company_users for insert
  with check (is_company_admin(company_id) or is_superadmin());

drop policy if exists "company_users_update_admin_or_superadmin" on company_users;
create policy "company_users_update_admin_or_superadmin"
  on company_users for update
  using (is_company_admin(company_id) or is_superadmin());

drop policy if exists "company_users_delete_admin_or_superadmin" on company_users;
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

drop policy if exists "clients_select_members" on clients;
create policy "clients_select_members" on clients for select
  using (is_company_member(company_id));
drop policy if exists "clients_insert_members" on clients;
create policy "clients_insert_members" on clients for insert
  with check (is_company_member(company_id));
drop policy if exists "clients_update_members" on clients;
create policy "clients_update_members" on clients for update
  using (is_company_member(company_id));
drop policy if exists "clients_delete_admin_only" on clients;
create policy "clients_delete_admin_only" on clients for delete
  using (is_company_admin(company_id));

alter table services enable row level security;

drop policy if exists "services_select_members" on services;
create policy "services_select_members" on services for select
  using (is_company_member(company_id));
drop policy if exists "services_insert_members" on services;
create policy "services_insert_members" on services for insert
  with check (is_company_member(company_id));
drop policy if exists "services_update_members" on services;
create policy "services_update_members" on services for update
  using (is_company_member(company_id));
drop policy if exists "services_delete_admin_only" on services;
create policy "services_delete_admin_only" on services for delete
  using (is_company_admin(company_id));

alter table appointments enable row level security;

drop policy if exists "appointments_select_members" on appointments;
create policy "appointments_select_members" on appointments for select
  using (is_company_member(company_id));
drop policy if exists "appointments_insert_members" on appointments;
create policy "appointments_insert_members" on appointments for insert
  with check (is_company_member(company_id));
drop policy if exists "appointments_update_members" on appointments;
create policy "appointments_update_members" on appointments for update
  using (is_company_member(company_id));
drop policy if exists "appointments_delete_admin_only" on appointments;
create policy "appointments_delete_admin_only" on appointments for delete
  using (is_company_admin(company_id));

-- reminders: los envíos automáticos (Fase 12/13) los hará una
-- función programada usando la service_role key, que por diseño
-- de Supabase se salta RLS por completo — no necesita política propia.
alter table reminders enable row level security;

drop policy if exists "reminders_select_members" on reminders;
create policy "reminders_select_members" on reminders for select
  using (is_company_member(company_id));
drop policy if exists "reminders_insert_members" on reminders;
create policy "reminders_insert_members" on reminders for insert
  with check (is_company_member(company_id));
drop policy if exists "reminders_update_members" on reminders;
create policy "reminders_update_members" on reminders for update
  using (is_company_member(company_id));
drop policy if exists "reminders_delete_admin_only" on reminders;
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

drop policy if exists "audit_logs_select_admin_or_superadmin" on audit_logs;
create policy "audit_logs_select_admin_or_superadmin"
  on audit_logs for select
  using (is_company_admin(company_id) or is_superadmin());

drop policy if exists "audit_logs_insert_members_or_superadmin" on audit_logs;
create policy "audit_logs_insert_members_or_superadmin"
  on audit_logs for insert
  with check (
    (company_id is not null and is_company_member(company_id))
    or (company_id is null and is_superadmin())
  );

drop policy if exists "audit_logs_delete_superadmin_only" on audit_logs;
create policy "audit_logs_delete_superadmin_only"
  on audit_logs for delete
  using (is_superadmin());

-- ------------------------------------------------------------
-- pets — mascotas (módulo específico de Veterinaria). Mismo patrón
-- que clients/services: cualquier miembro ve/crea/edita, solo ADMIN
-- elimina.
-- ------------------------------------------------------------
alter table pets enable row level security;

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

-- ------------------------------------------------------------
-- vehicles — vehículos (módulo específico de Taller). Mismo patrón
-- que pets/clients/services: cualquier miembro ve/crea/edita, solo
-- ADMIN elimina.
-- ------------------------------------------------------------
alter table vehicles enable row level security;

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

-- ------------------------------------------------------------
-- eye_measurements — medidas visuales (módulo específico de Óptica).
-- Mismo patrón que pets/vehicles.
-- ------------------------------------------------------------
alter table eye_measurements enable row level security;

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

-- ------------------------------------------------------------
-- sales — ventas (módulo específico de Óptica). Mismo patrón que
-- pets/vehicles.
-- ------------------------------------------------------------
alter table sales enable row level security;

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
