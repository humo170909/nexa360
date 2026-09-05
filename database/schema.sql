-- ============================================================
-- NEXA360 — Esquema de base de datos (Fase 5)
-- ============================================================
-- Cómo ejecutar: Supabase → tu proyecto → SQL Editor → New query →
-- pega este archivo completo → Run. Se ejecuta una sola vez.
-- Después ejecuta policies.sql (en ese orden: primero tablas, después
-- las reglas de seguridad que dependen de que las tablas ya existan).

-- ------------------------------------------------------------
-- 0. business_type — enum fijo. Postgres rechaza cualquier valor
--    fuera de esta lista, no depende de que el frontend valide bien.
-- ------------------------------------------------------------
create type business_type as enum (
  'odontologia',
  'optica',
  'barberia',
  'belleza',
  'estetica',
  'veterinaria',
  'taller',
  'consultorio',
  'fisioterapia',
  'psicologia',
  'gimnasio',
  'academia',
  'colegio',
  'masajes',
  'servicios_tecnicos',
  'lavadero',
  'mantenimiento',
  'otro'
);

-- ------------------------------------------------------------
-- 1. profiles — datos de la app para cada usuario autenticado.
--    auth.users ya existe (lo gestiona Supabase Auth); acá solo
--    guardamos lo que la app necesita además del email/contraseña.
-- ------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  is_superadmin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Crea automáticamente una fila en "profiles" cada vez que alguien
-- se registra. Sin esto, profiles quedaría vacía tras cada signup.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 2. companies — cada empresa/tenant
-- ------------------------------------------------------------
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_type business_type not null,
  plan text not null default 'basic' check (plan in ('basic', 'pro', 'enterprise')),
  is_active boolean not null default true,
  owner_id uuid references profiles (id),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. company_users — a qué empresa(s) pertenece cada usuario y con
--    qué rol. Es la pieza central del aislamiento multiempresa.
-- ------------------------------------------------------------
create table company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null check (role in ('ADMIN', 'USUARIO')),
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

-- Cuando se crea una empresa, su "owner_id" se vuelve automáticamente
-- ADMIN de esa empresa. Sin esto habría un problema de "huevo y
-- gallina": nadie podría insertar en company_users porque las
-- políticas de esa tabla exigen ya ser ADMIN para insertar.
create function public.handle_new_company()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.owner_id is not null then
    insert into public.company_users (company_id, user_id, role)
    values (new.id, new.owner_id, 'ADMIN');
  end if;
  return new;
end;
$$;

create trigger on_company_created
  after insert on companies
  for each row execute procedure public.handle_new_company();

-- ------------------------------------------------------------
-- 4. clients — clientes/pacientes/propietarios de cada empresa
-- ------------------------------------------------------------
create table clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  full_name text not null,
  document_id text,
  phone text,
  email text,
  birth_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. services — catálogo de servicios de cada empresa
-- ------------------------------------------------------------
create table services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer,
  price numeric(10, 2),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 6. appointments — citas
-- ------------------------------------------------------------
create table appointments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  client_id uuid not null references clients (id) on delete cascade,
  service_id uuid references services (id) on delete set null,
  assigned_to uuid references profiles (id),
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'confirmada', 'atendida', 'cancelada', 'no_asistio')),
  notes text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 7. reminders — recordatorios (solo canal "email" por ahora;
--    agregar "whatsapp" después es solo ampliar el check, sin migrar nada)
-- ------------------------------------------------------------
create table reminders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  appointment_id uuid not null references appointments (id) on delete cascade,
  channel text not null default 'email' check (channel in ('email')),
  send_at timestamptz not null,
  status text not null default 'pendiente' check (status in ('pendiente', 'enviado', 'fallido')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 8. audit_logs — registro de auditoría (inmutable, ver policies.sql)
-- ------------------------------------------------------------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies (id) on delete set null,
  user_id uuid references profiles (id) on delete set null,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 9. pets — mascotas (módulo específico de Veterinaria).
--    Ver database/migration_pets.sql si tu proyecto ya existía antes
--    de esta tabla — no hace falta correr este schema.sql de nuevo.
-- ------------------------------------------------------------
create table pets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  owner_id uuid not null references clients (id) on delete cascade,
  name text not null,
  species text,
  breed text,
  birth_date date,
  notes text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 10. vehicles — vehículos (módulo específico de Taller).
--     Ver database/migration_vehicles.sql si tu proyecto ya existía
--     antes de esta tabla — no hace falta correr este schema.sql de nuevo.
-- ------------------------------------------------------------
create table vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  owner_id uuid not null references clients (id) on delete cascade,
  plate text not null,
  brand text,
  model text,
  year integer,
  notes text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 11. eye_measurements — medidas visuales (módulo específico de
--     Óptica). "od" = ojo derecho, "os" = ojo izquierdo (nomenclatura
--     óptica estándar). Ver database/migration_eye_measurements.sql
--     si tu proyecto ya existía antes de esta tabla.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 12. sales — ventas (módulo específico de Óptica: lentes, armazones,
--     accesorios). Ver database/migration_sales.sql si tu proyecto ya
--     existía antes de esta tabla.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 13. teachers — docentes/profesores. Una sola tabla compartida por
--     Colegio ("Docentes") y Academia ("Profesores"), igual que
--     /history y /treatments ya se comparten entre otros rubros. Ver
--     database/migration_teachers.sql si tu proyecto ya existía antes.
-- ------------------------------------------------------------
create table teachers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  full_name text not null,
  specialty text,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 14. grades — grados/secciones (módulo específico de Colegio).
--     Ver database/migration_grades.sql si tu proyecto ya existía antes.
-- ------------------------------------------------------------
create table grades (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  teacher_id uuid references teachers (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 15. guardians — padres/apoderados (módulo específico de Colegio).
--     Cada fila es un apoderado ligado a UN estudiante (owner_id →
--     clients); un estudiante con dos apoderados tiene dos filas.
--     Ver database/migration_guardians.sql si tu proyecto ya existía
--     antes.
-- ------------------------------------------------------------
create table guardians (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  owner_id uuid not null references clients (id) on delete cascade,
  full_name text not null,
  relationship text check (relationship in ('madre', 'padre', 'tutor', 'otro')),
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 16. announcements — comunicados generales (módulo específico de
--     Colegio). No tiene owner_id: no están ligados a un estudiante en
--     particular. Ver database/migration_announcements.sql si tu
--     proyecto ya existía antes.
-- ------------------------------------------------------------
create table announcements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  title text not null,
  body text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 17. courses — cursos (módulo específico de Academia). Reutiliza
--     "teachers" (compartida con Colegio) para el profesor a cargo.
--     Ver database/migration_courses.sql si tu proyecto ya existía
--     antes de esta tabla.
-- ------------------------------------------------------------
create table courses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  teacher_id uuid references teachers (id) on delete set null,
  description text,
  price numeric(10, 2),
  notes text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 18. enrollments — matrículas (módulo específico de Academia). Primer
--     caso real de relación muchos-a-muchos: conecta un alumno
--     (clients) con un curso (courses). Ver
--     database/migration_enrollments.sql si tu proyecto ya existía
--     antes de esta tabla.
-- ------------------------------------------------------------
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  student_id uuid not null references clients (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  status text not null default 'activa' check (status in ('activa', 'completada', 'cancelada')),
  enrolled_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  unique (student_id, course_id)
);

-- ------------------------------------------------------------
-- 19. business_hours — horarios de atención (módulo universal,
--     Configuración → Horarios). Una fila por día de la semana por
--     empresa (0 = domingo ... 6 = sábado). Ver
--     database/migration_business_hours.sql si tu proyecto ya existía
--     antes de esta tabla.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Índices — filtrar por company_id es la operación más frecuente
-- de toda la app; esto la mantiene rápida aunque crezcan los datos.
-- ------------------------------------------------------------
create index idx_company_users_company on company_users (company_id);
create index idx_company_users_user on company_users (user_id);
create index idx_clients_company on clients (company_id);
create index idx_services_company on services (company_id);
create index idx_appointments_company on appointments (company_id);
create index idx_appointments_client on appointments (client_id);
create index idx_reminders_company on reminders (company_id);
create index idx_reminders_appointment on reminders (appointment_id);
create index idx_audit_logs_company on audit_logs (company_id);
create index idx_pets_company on pets (company_id);
create index idx_pets_owner on pets (owner_id);
create index idx_vehicles_company on vehicles (company_id);
create index idx_vehicles_owner on vehicles (owner_id);
create index idx_eye_measurements_company on eye_measurements (company_id);
create index idx_eye_measurements_owner on eye_measurements (owner_id);
create index idx_sales_company on sales (company_id);
create index idx_sales_owner on sales (owner_id);
create index idx_teachers_company on teachers (company_id);
create index idx_grades_company on grades (company_id);
create index idx_grades_teacher on grades (teacher_id);
create index idx_guardians_company on guardians (company_id);
create index idx_guardians_owner on guardians (owner_id);
create index idx_announcements_company on announcements (company_id);
create index idx_courses_company on courses (company_id);
create index idx_courses_teacher on courses (teacher_id);
create index idx_enrollments_company on enrollments (company_id);
create index idx_enrollments_student on enrollments (student_id);
create index idx_enrollments_course on enrollments (course_id);
create index idx_business_hours_company on business_hours (company_id);
