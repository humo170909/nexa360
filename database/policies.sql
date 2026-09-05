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

-- Fase 24: se agregó el join a "companies" y "c.is_active" — sin esto,
-- "Suspender" en el panel SUPERADMIN solo cambiaba una etiqueta visual;
-- los usuarios de la empresa suspendida seguían pudiendo leer/escribir
-- todo con normalidad. Como CASI todas las tablas del proyecto usan esta
-- función para su RLS, este único cambio corta el acceso en todos lados
-- a la vez — no hace falta tocar tabla por tabla.
create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from company_users cu
    join companies c on c.id = cu.company_id
    where cu.company_id = target_company_id
      and cu.user_id = auth.uid()
      and c.is_active = true
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
    select 1 from company_users cu
    join companies c on c.id = cu.company_id
    where cu.company_id = target_company_id
      and cu.user_id = auth.uid()
      and cu.role = 'ADMIN'
      and c.is_active = true
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

-- Fase 22: se ELIMINÓ "companies_insert_authenticated" (permitía crear
-- una empresa a cualquier autenticado). A propósito NO hay política de
-- reemplazo para "insert" — sin ninguna política permisiva, RLS deniega
-- el insert por defecto. La única forma de crear una empresa ahora es
-- la función redeem_invitation_code() (ver el bloque de invitaciones más
-- abajo), que exige un código válido y corre con privilegios elevados.
drop policy if exists "companies_insert_authenticated" on companies;

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

-- Fase 22: se agregó "or (company_id is null and user_id = auth.uid())"
-- — deja que un usuario YA autenticado (con signUp() ya hecho) registre
-- su propio evento antes de tener empresa (ej. "registration.failed" si
-- el canje de una invitación falla después del registro). Sigue sin
-- dejar que nadie lea logs ajenos: la política de SELECT no cambió.
-- Fase 24: se agregó "or (company_id is not null and is_superadmin())"
-- — un SUPERADMIN suspende empresas de las que NO es miembro, así que
-- "is_company_member(company_id)" da falso para él y sin esta cláusula
-- el log de "company.suspended"/"company.activated" se rechazaría.
drop policy if exists "audit_logs_insert_members_or_superadmin" on audit_logs;
create policy "audit_logs_insert_members_or_superadmin"
  on audit_logs for insert
  with check (
    (company_id is not null and is_company_member(company_id))
    or (company_id is not null and is_superadmin())
    or (company_id is null and is_superadmin())
    or (company_id is null and user_id = auth.uid())
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

-- ------------------------------------------------------------
-- teachers — docentes/profesores (Colegio y Academia comparten la
-- misma tabla). Mismo patrón que pets/vehicles.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- grades — grados/secciones (módulo específico de Colegio).
-- ------------------------------------------------------------
alter table grades enable row level security;

drop policy if exists "grades_select_members" on grades;
create policy "grades_select_members" on grades for select
  using (is_company_member(company_id));

drop policy if exists "grades_insert_members" on grades;
create policy "grades_insert_members" on grades for insert
  with check (is_company_member(company_id));

drop policy if exists "grades_update_members" on grades;
create policy "grades_update_members" on grades for update
  using (is_company_member(company_id));

drop policy if exists "grades_delete_admin_only" on grades;
create policy "grades_delete_admin_only" on grades for delete
  using (is_company_admin(company_id));

-- ------------------------------------------------------------
-- guardians — padres/apoderados (módulo específico de Colegio). Mismo
-- patrón que pets/vehicles: cada fila ligada a un estudiante.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- announcements — comunicados generales (módulo específico de
-- Colegio). No tiene owner_id.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- courses — cursos (módulo específico de Academia). Mismo patrón que
-- grades: catálogo con un docente a cargo opcional.
-- ------------------------------------------------------------
alter table courses enable row level security;

drop policy if exists "courses_select_members" on courses;
create policy "courses_select_members" on courses for select
  using (is_company_member(company_id));

drop policy if exists "courses_insert_members" on courses;
create policy "courses_insert_members" on courses for insert
  with check (is_company_member(company_id));

drop policy if exists "courses_update_members" on courses;
create policy "courses_update_members" on courses for update
  using (is_company_member(company_id));

drop policy if exists "courses_delete_admin_only" on courses;
create policy "courses_delete_admin_only" on courses for delete
  using (is_company_admin(company_id));

-- ------------------------------------------------------------
-- enrollments — matrículas (módulo específico de Academia). Conecta un
-- alumno con un curso.
-- ------------------------------------------------------------
alter table enrollments enable row level security;

drop policy if exists "enrollments_select_members" on enrollments;
create policy "enrollments_select_members" on enrollments for select
  using (is_company_member(company_id));

drop policy if exists "enrollments_insert_members" on enrollments;
create policy "enrollments_insert_members" on enrollments for insert
  with check (is_company_member(company_id));

drop policy if exists "enrollments_update_members" on enrollments;
create policy "enrollments_update_members" on enrollments for update
  using (is_company_member(company_id));

drop policy if exists "enrollments_delete_admin_only" on enrollments;
create policy "enrollments_delete_admin_only" on enrollments for delete
  using (is_company_admin(company_id));

-- ------------------------------------------------------------
-- business_hours — horarios de atención (módulo universal). Sin
-- owner_id: son horarios de la empresa completa.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- invitations / invitation_attempts — registro controlado (Fase 22).
-- Nadie fuera de SUPERADMIN toca estas tablas directamente; todo el
-- acceso real pasa por las 2 funciones de abajo (SECURITY DEFINER).
-- ------------------------------------------------------------
alter table invitations enable row level security;

drop policy if exists "invitations_select_superadmin" on invitations;
create policy "invitations_select_superadmin" on invitations for select
  using (is_superadmin());

drop policy if exists "invitations_insert_superadmin" on invitations;
create policy "invitations_insert_superadmin" on invitations for insert
  with check (is_superadmin());

drop policy if exists "invitations_update_superadmin" on invitations;
create policy "invitations_update_superadmin" on invitations for update
  using (is_superadmin());

-- Sin política de DELETE a propósito: un código se desactiva
-- (is_active = false), nunca se borra.

alter table invitation_attempts enable row level security;

drop policy if exists "invitation_attempts_select_superadmin" on invitation_attempts;
create policy "invitation_attempts_select_superadmin" on invitation_attempts for select
  using (is_superadmin());

-- Sin política de INSERT: solo escribe ahí validate_invitation_code
-- (SECURITY DEFINER, se salta RLS).

-- validate_invitation_code — solo LEE. La usa el Paso 1 del registro,
-- antes de que exista ninguna sesión (rol "anon").
create or replace function public.validate_invitation_code(p_code text)
returns json
language plpgsql
security definer
-- incluye "extensions" porque digest() (de pgcrypto) puede vivir ahí en
-- vez de en "public", según cómo Supabase haya instalado la extensión.
set search_path = public, extensions
as $$
declare
  v_ip text;
  v_recent_failures integer;
  v_hash text;
  v_invitation invitations%rowtype;
begin
  begin
    v_ip := split_part(
      current_setting('request.headers', true)::json ->> 'x-forwarded-for',
      ',', 1
    );
  exception when others then
    v_ip := null;
  end;

  if v_ip is not null then
    select count(*) into v_recent_failures
    from invitation_attempts
    where ip_address = v_ip
      and attempted_at > now() - interval '15 minutes';

    if v_recent_failures >= 10 then
      return json_build_object('valid', false, 'reason', 'rate_limited');
    end if;
  end if;

  v_hash := encode(digest(upper(trim(p_code)), 'sha256'), 'hex');

  select * into v_invitation from invitations where code_hash = v_hash;

  if not found then
    insert into invitation_attempts (ip_address) values (v_ip);
    return json_build_object('valid', false, 'reason', 'invalid');
  end if;

  if not v_invitation.is_active then
    insert into invitation_attempts (ip_address) values (v_ip);
    return json_build_object('valid', false, 'reason', 'disabled');
  end if;

  if v_invitation.expires_at < now() then
    insert into invitation_attempts (ip_address) values (v_ip);
    return json_build_object('valid', false, 'reason', 'expired');
  end if;

  if v_invitation.used_count >= v_invitation.max_uses then
    insert into invitation_attempts (ip_address) values (v_ip);
    return json_build_object('valid', false, 'reason', 'used');
  end if;

  return json_build_object('valid', true, 'reason', 'ok');
end;
$$;

grant execute on function public.validate_invitation_code(text) to anon, authenticated;

-- redeem_invitation_code — la única forma de crear una empresa. Requiere
-- sesión (se llama DESPUÉS de supabase.auth.signUp()). Vuelve a validar
-- todo — no confía en que el Paso 1 siga vigente.
create or replace function public.redeem_invitation_code(
  p_code text,
  p_company_name text,
  p_business_type business_type
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_invitation invitations%rowtype;
  v_company companies%rowtype;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return json_build_object('success', false, 'reason', 'not_authenticated');
  end if;

  v_hash := encode(digest(upper(trim(p_code)), 'sha256'), 'hex');

  -- "for update" impide que dos personas canjeen el mismo código de un
  -- solo uso al mismo tiempo.
  select * into v_invitation from invitations where code_hash = v_hash for update;

  if not found
     or not v_invitation.is_active
     or v_invitation.expires_at < now()
     or v_invitation.used_count >= v_invitation.max_uses then
    return json_build_object('success', false, 'reason', 'invalid');
  end if;

  insert into companies (name, business_type, owner_id)
  values (p_company_name, p_business_type, v_user_id)
  returning * into v_company;
  -- El trigger "handle_new_company" (schema.sql) crea la fila en
  -- company_users con role='ADMIN' — no se duplica esa lógica acá.

  update invitations
    set used_count = used_count + 1,
        company_id = v_company.id
    where id = v_invitation.id;

  insert into audit_logs (company_id, user_id, action, metadata)
  values (
    v_company.id, v_user_id, 'invitation.used',
    jsonb_build_object('invitation_id', v_invitation.id)
  );

  return json_build_object('success', true, 'company_id', v_company.id);
end;
$$;

grant execute on function public.redeem_invitation_code(text, text, business_type) to authenticated;

-- ------------------------------------------------------------
-- user_invitations — invitar usuarios a una empresa YA existente
-- (Fase 25). NO es lo mismo que "invitations" arriba (esa es
-- SUPERADMIN → crear empresa nueva). El ADMIN administra sus propias
-- invitaciones directamente (select/insert/update); aceptar pasa por
-- una función porque quien acepta todavía no es miembro.
-- ------------------------------------------------------------
alter table user_invitations enable row level security;

drop policy if exists "user_invitations_select_admin" on user_invitations;
create policy "user_invitations_select_admin" on user_invitations for select
  using (is_company_admin(company_id) or is_superadmin());

drop policy if exists "user_invitations_insert_admin" on user_invitations;
create policy "user_invitations_insert_admin" on user_invitations for insert
  with check (is_company_admin(company_id));

drop policy if exists "user_invitations_update_admin" on user_invitations;
create policy "user_invitations_update_admin" on user_invitations for update
  using (is_company_admin(company_id));

-- validate_user_invitation — solo LEE. La usa AcceptInvitePage antes de
-- que quien acepta tenga sesión (rol "anon").
create or replace function public.validate_user_invitation(p_token text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_invitation user_invitations%rowtype;
  v_company_name text;
begin
  v_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

  select * into v_invitation from user_invitations where token_hash = v_hash;

  if not found then
    return json_build_object('valid', false, 'reason', 'invalid');
  end if;

  if v_invitation.status = 'cancelada' then
    return json_build_object('valid', false, 'reason', 'cancelled');
  end if;

  if v_invitation.status = 'aceptada' then
    return json_build_object('valid', false, 'reason', 'used');
  end if;

  if v_invitation.expires_at < now() then
    return json_build_object('valid', false, 'reason', 'expired');
  end if;

  select name into v_company_name from companies where id = v_invitation.company_id;

  return json_build_object(
    'valid', true,
    'company_name', v_company_name,
    'invited_email', v_invitation.invited_email,
    'invited_name', v_invitation.invited_name,
    'role', v_invitation.role
  );
end;
$$;

grant execute on function public.validate_user_invitation(text) to anon, authenticated;

-- accept_user_invitation — requiere sesión. Compara el correo de quien
-- acepta contra el correo invitado (auth.users, solo legible desde una
-- función SECURITY DEFINER) — así, aunque el link se filtre, solo esa
-- cuenta puede canjearlo.
create or replace function public.accept_user_invitation(p_token text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_invitation user_invitations%rowtype;
  v_user_id uuid := auth.uid();
  v_user_email text;
begin
  if v_user_id is null then
    return json_build_object('success', false, 'reason', 'not_authenticated');
  end if;

  v_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

  select * into v_invitation from user_invitations where token_hash = v_hash for update;

  if not found
     or v_invitation.status != 'pendiente'
     or v_invitation.expires_at < now() then
    return json_build_object('success', false, 'reason', 'invalid');
  end if;

  select email into v_user_email from auth.users where id = v_user_id;

  if lower(v_user_email) != lower(v_invitation.invited_email) then
    return json_build_object('success', false, 'reason', 'email_mismatch');
  end if;

  insert into company_users (company_id, user_id, role)
  values (v_invitation.company_id, v_user_id, v_invitation.role)
  on conflict (company_id, user_id) do update set role = excluded.role;

  update user_invitations
    set status = 'aceptada', accepted_by = v_user_id, accepted_at = now()
    where id = v_invitation.id;

  insert into audit_logs (company_id, user_id, action, metadata)
  values (
    v_invitation.company_id, v_user_id, 'user_invitation.accepted',
    jsonb_build_object('invitation_id', v_invitation.id, 'role', v_invitation.role)
  );

  return json_build_object('success', true, 'company_id', v_invitation.company_id);
end;
$$;

grant execute on function public.accept_user_invitation(text) to authenticated;
