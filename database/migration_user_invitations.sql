-- ============================================================
-- NEXA360 — Migración: invitar usuarios a una empresa (Fase 25)
-- ============================================================
-- Ejecuta SOLO este archivo en el SQL Editor de Supabase — no vuelvas a
-- correr schema.sql/policies.sql completos.
--
-- NO confundir con "invitations" (Fase 22, SUPERADMIN → crear una
-- empresa nueva). Esta es la invitación tipo B: un ADMIN de una empresa
-- ya existente invita a alguien a SU empresa, con un rol específico.
-- Tabla separada a propósito (campos y flujo de canje distintos).

-- ------------------------------------------------------------
-- 1. Tabla
-- ------------------------------------------------------------
create table user_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  token_hash text not null unique,
  invited_email text not null,
  invited_name text,
  role text not null check (role in ('ADMIN', 'USUARIO')),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'aceptada', 'expirada', 'cancelada')),
  invited_by uuid references profiles (id),
  expires_at timestamptz not null,
  accepted_by uuid references profiles (id),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_user_invitations_company on user_invitations (company_id);

-- ------------------------------------------------------------
-- 2. RLS — el ADMIN de la empresa administra sus propias invitaciones
--    directamente (a diferencia de "invitations", donde todo pasa por
--    funciones). Aceptar SÍ pasa por una función, porque quien acepta
--    no es (todavía) miembro de la empresa.
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

-- Sin política de DELETE: se cancelan (status='cancelada'), no se borran.

-- ------------------------------------------------------------
-- 3. validate_user_invitation — solo LEE. La usa AcceptInvitePage
--    antes de que quien acepta tenga sesión (rol "anon").
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 4. accept_user_invitation — requiere sesión. Compara el correo de
--    quien acepta contra el correo invitado (auth.users, solo legible
--    desde una función SECURITY DEFINER, nunca desde el frontend) —
--    así, aunque el link se filtre, solo esa cuenta puede canjearlo.
-- ------------------------------------------------------------
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
