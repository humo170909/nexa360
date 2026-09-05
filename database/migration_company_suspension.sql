-- ============================================================
-- NEXA360 — Migración: suspender empresas de verdad (Fase 24)
-- ============================================================
-- Ejecuta SOLO este archivo en el SQL Editor de Supabase — no vuelvas a
-- correr schema.sql/policies.sql completos.
--
-- Qué cambia: hasta ahora, "companies.is_active" era solo un dato
-- visual — nada revisaba su valor. Si un SUPERADMIN "suspendía" una
-- empresa desde el panel, sus usuarios seguían pudiendo leer y escribir
-- todo con total normalidad. Este archivo hace que la suspensión
-- bloquee acceso de verdad, modificando UNA SOLA VEZ las dos funciones
-- que casi todas las políticas RLS del proyecto ya usan
-- (is_company_member/is_company_admin) — no hace falta tocar tabla por
-- tabla.

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

-- Además: un SUPERADMIN suspende empresas de las que NO es miembro, así
-- que "is_company_member(company_id)" da falso para él — sin esto, el
-- log de "company.suspended"/"company.activated" se rechazaría por RLS.
drop policy if exists "audit_logs_insert_members_or_superadmin" on audit_logs;
create policy "audit_logs_insert_members_or_superadmin"
  on audit_logs for insert
  with check (
    (company_id is not null and is_company_member(company_id))
    or (company_id is not null and is_superadmin())
    or (company_id is null and is_superadmin())
    or (company_id is null and user_id = auth.uid())
  );
