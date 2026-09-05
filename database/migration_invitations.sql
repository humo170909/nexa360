-- ============================================================
-- NEXA360 — Migración: registro controlado por invitación (Fase 22)
-- ============================================================
-- Ejecuta SOLO este archivo en el SQL Editor de Supabase — no vuelvas a
-- correr schema.sql/policies.sql completos, esas tablas ya existen.
-- Este archivo es aparte y seguro de ejecutar de nuevo si algo falla a
-- mitad de camino (usa "drop policy/function if exists").
--
-- Qué cambia con esto: HOY cualquier persona autenticada puede crear una
-- empresa (política "companies_insert_authenticated"). Este archivo
-- ELIMINA esa política y la reemplaza por dos funciones que exigen un
-- código de invitación válido antes de poder crear una empresa.

-- pgcrypto trae digest() (para el hash del código) — casi seguro ya está
-- activado en tu proyecto (gen_random_uuid() lo usa también), pero
-- "if not exists" hace que sea seguro repetir esto de todas formas.
create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------
-- 0. Nuevo campo "Teléfono" en el registro (Paso 3 del wizard nuevo).
--    No hace falta una tabla nueva: se guarda en profiles, igual que
--    full_name ya se guarda ahí desde la Fase 6.
-- ------------------------------------------------------------
alter table profiles add column if not exists phone text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'phone');
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 1. Tablas
-- ------------------------------------------------------------

create table invitations (
  id uuid primary key default gen_random_uuid(),
  -- Nunca se guarda el código en texto plano — ver validate_invitation_code
  -- más abajo para la explicación de por qué SHA-256 es suficiente aquí
  -- (no es una contraseña: es un token aleatorio de alta entropía).
  code_hash text not null unique,
  created_by uuid references profiles (id),
  max_uses integer not null default 1 check (max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  expires_at timestamptz not null,
  is_active boolean not null default true,
  -- Se llena recién cuando el código se usa. Con max_uses=1 (el default)
  -- identifica sin ambigüedad la empresa que nació de esta invitación; si
  -- más adelante se permiten códigos multiuso, este campo solo guardaría
  -- la ÚLTIMA empresa creada con ese código — el historial completo de
  -- cada uso queda en audit_logs (acción "invitation.used").
  company_id uuid references companies (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_invitations_company on invitations (company_id);

-- Registro de intentos fallidos de validación, solo para la protección
-- contra fuerza bruta de validate_invitation_code. No guarda el código
-- que se intentó, solo la IP y cuándo — no hace falta más para contar
-- intentos recientes.
create table invitation_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_address text,
  attempted_at timestamptz not null default now()
);

create index idx_invitation_attempts_ip_time on invitation_attempts (ip_address, attempted_at);

-- ------------------------------------------------------------
-- 2. RLS — nadie fuera de SUPERADMIN toca estas tablas directamente.
--    Todo el acceso real pasa por las dos funciones de abajo, que
--    corren con SECURITY DEFINER (se saltan RLS a propósito, igual que
--    is_superadmin()/is_company_member() ya definidas en policies.sql).
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
-- (is_active = false), nunca se borra — mismo criterio que audit_logs,
-- conservar el historial de qué códigos existieron.

alter table invitation_attempts enable row level security;

drop policy if exists "invitation_attempts_select_superadmin" on invitation_attempts;
create policy "invitation_attempts_select_superadmin" on invitation_attempts for select
  using (is_superadmin());

-- Sin política de INSERT: solo escribe ahí la función
-- validate_invitation_code, que al ser SECURITY DEFINER no la necesita.

-- ------------------------------------------------------------
-- 3. La política insegura que este archivo reemplaza
-- ------------------------------------------------------------

drop policy if exists "companies_insert_authenticated" on companies;
-- A propósito NO se crea una política de reemplazo para "insert" sobre
-- companies: sin ninguna política permisiva, RLS deniega el insert por
-- defecto para cualquier rol normal. La única forma de crear una empresa
-- pasa a ser redeem_invitation_code() (abajo), que al ser SECURITY
-- DEFINER se salta esta restricción — a propósito, porque ya validó el
-- código antes de insertar.

-- ------------------------------------------------------------
-- 4. validate_invitation_code — solo LEE. La usa el Paso 1 del
--    registro, antes de que exista ninguna sesión (rol "anon").
-- ------------------------------------------------------------
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
  -- Supabase expone la IP del que llama en los headers de la petición.
  -- Si por algún motivo no está disponible (ej. se ejecuta manualmente
  -- desde el SQL Editor), seguimos sin poder contar intentos por IP en
  -- vez de romper la validación completa.
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

-- ------------------------------------------------------------
-- 5. redeem_invitation_code — la única forma de crear una empresa.
--    Requiere sesión (se llama DESPUÉS de supabase.auth.signUp()).
--    Vuelve a validar todo (no confía en que el Paso 1 siga vigente:
--    pudieron pasar minutos, y otra persona pudo haber usado el mismo
--    código un solo uso mientras tanto).
-- ------------------------------------------------------------
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

  -- "for update" bloquea esta fila hasta que la transacción termine — es
  -- lo que impide que dos personas canjeen el mismo código de un solo
  -- uso al mismo tiempo. La segunda solicitud espera a que la primera
  -- termine, y cuando le toca, "used_count" ya está actualizado.
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
  -- El trigger "handle_new_company" (schema.sql) ya se dispara solo acá
  -- y crea la fila en company_users con role='ADMIN' — no se duplica esa
  -- lógica en esta función.

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
