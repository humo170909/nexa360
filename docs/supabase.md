# Supabase — NEXA360

## Por qué Supabase

- Base de datos PostgreSQL real, sin backend propio que mantener.
- Autenticación integrada (Supabase Auth).
- Row Level Security a nivel de fila — el aislamiento multiempresa se aplica
  en la base de datos, no solo en el frontend.
- El frontend habla directo con Supabase usando la `anon key` pública,
  protegida por RLS. Cuando algo necesita privilegios que la `anon key` no
  tiene (saltarse RLS a propósito, leer `auth.users`), se resuelve con una
  función de Postgres `SECURITY DEFINER` o una Edge Function — nunca
  bajando la `service_role key` al navegador.

## Cómo se relacionan las piezas centrales

```
auth.users               (Supabase Auth — gestiona login/contraseñas,
     │                     NO es una tabla tuya, no la puedes leer
     │                     directo desde el frontend)
     ▼
profiles                 (tu tabla — 1 fila por usuario autenticado,
     │                     con is_superadmin y phone)
     │
     ├── un SUPERADMIN no continúa hacia abajo — administra la
     │   plataforma completa, no pertenece a una empresa
     │
     ▼
company_users             (la tabla puente: qué usuario pertenece a
     │                      qué empresa, y con qué rol — ADMIN/USUARIO)
     ▼
companies                (cada empresa/tenant — business_type, is_active)
     │
     ├── clients, services, appointments, reminders   (módulos universales)
     ├── pets, vehicles, teachers, courses...          (módulos por rubro)
     ├── invitations                (SUPERADMIN → crear empresa nueva)
     ├── user_invitations           (ADMIN → invitar a SU empresa)
     └── audit_logs                 (rastro de auditoría de esa empresa)
```

Por qué `profiles` existe si ya está `auth.users`: Supabase Auth
gestiona identidad y contraseñas, pero no te deja guardar ahí campos
propios de tu app (`is_superadmin`, `phone`, etc.) ni leerla libremente
desde el frontend por seguridad. `profiles` es tu propia tabla, 1 fila
por usuario, creada automáticamente por un trigger (`handle_new_user`)
apenas alguien se registra.

Por qué `company_users` y no `companies.owner_id` solo: un usuario
podría pertenecer a más de una empresa en el futuro (hoy la app asume
una sola, pero el modelo ya lo soporta sin cambios). `company_users` es
la tabla puente clásica de una relación muchos-a-muchos.

## Modelo de datos (22 tablas)

No las vamos a listar todas acá (`database/schema.sql` es la fuente de
verdad, con comentarios en cada tabla). Las centrales para entender la
arquitectura:

| Tabla | Para qué | Multi-tenant vía |
|---|---|---|
| `profiles` | Datos de cada usuario autenticado (extiende `auth.users`) | — (es la identidad misma) |
| `companies` | Cada empresa/tenant, con su `business_type` (enum fijo) y `is_active` | — (es el tenant mismo) |
| `company_users` | Qué usuario pertenece a qué empresa y con qué rol (`ADMIN`/`USUARIO`) | `company_id` |
| `invitations` | Registro controlado — SUPERADMIN autoriza crear una empresa nueva | — (vive fuera de cualquier empresa hasta que se usa) |
| `user_invitations` | Un ADMIN invita a alguien a SU empresa | `company_id` |
| `audit_logs` | Registro de auditoría, inmutable | `company_id` (nullable para acciones de plataforma) |
| `clients`, `services`, `appointments`, `reminders`, `business_hours` | Módulos universales (todos los rubros) | `company_id` |
| `pets`, `vehicles`, `teachers`, `grades`, `guardians`, `announcements`, `courses`, `enrollments`, `eye_measurements`, `sales` | Módulos específicos por rubro (ver `docs/arquitectura.md`) | `company_id` |

## Decisiones de diseño importantes

- **SUPERADMIN no es un rol dentro de `company_users`.** Es una bandera
  `profiles.is_superadmin` — administra la plataforma completa, no
  pertenece a una empresa específica. Ver `docs/superadmin.md`.
- **Solo `ADMIN` puede eliminar registros operativos** (clientes, servicios,
  citas, recordatorios); `USUARIO` puede crear y editar pero no borrar.
- **SUPERADMIN no puede leer los datos operativos de ninguna empresa**
  (clientes, citas, historiales médicos, etc.) por diseño — sus políticas
  RLS solo usan `is_company_member()`, nunca `is_superadmin()`. Su rol es
  administrar la plataforma (empresas, invitaciones, planes), no operar ni
  fisgonear el negocio de cada cliente. Es una decisión deliberada de
  privacidad, no un descuido — un ejemplo real de "menos privilegio del
  que técnicamente podríamos darle".
- **`audit_logs` es inmutable**: no existe ninguna política de `UPDATE`, así
  que nadie —ni ADMIN ni SUPERADMIN— puede modificar un registro de
  auditoría ya escrito.
- **Suspender una empresa (`companies.is_active = false`) bloquea acceso
  de verdad** (Fase 24): `is_company_member()`/`is_company_admin()` — las
  dos funciones que casi todas las políticas usan — exigen que la empresa
  esté activa. Un solo cambio corta el acceso en todas las tablas a la vez.
- El bootstrap de "quién es ADMIN de una empresa recién creada" lo resuelve
  un trigger automático (`handle_new_company`), no una política RLS — evita
  el problema de "para insertar en company_users ya debías ser ADMIN".

## Row Level Security

Documentado política por política (qué protege / quién lee / inserta /
actualiza / elimina) en `docs/seguridad.md` y aplicado en
`database/policies.sql`. Usa funciones auxiliares (`is_superadmin()`,
`is_company_member()`, `is_company_admin()`) para no repetir la misma
subconsulta en cada política — y dos funciones más específicas para
invitaciones (`validate_invitation_code`/`redeem_invitation_code`,
`validate_user_invitation`/`accept_user_invitation`), que corren con
`SECURITY DEFINER` porque necesitan hacer más que un simple filtro
(validar, canjear, y en un caso, leer `auth.users`).

## Cómo aplicar esto en un proyecto Supabase real

1. Crea una cuenta y un proyecto en https://supabase.com (plan gratuito
   alcanza para desarrollo).
2. En el panel del proyecto: **SQL Editor → New query**, pega el contenido
   completo de `database/schema.sql`, ejecuta.
3. Nueva query: pega `database/policies.sql`, ejecuta.
4. En **Project Settings → API** copia `Project URL` y `anon public key`.
5. En `nexa360/`, copia `.env.example` como `.env.local` y pega ahí esos
   dos valores en `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
6. **Nunca** copies la `service_role key` a ningún archivo del frontend.
7. Convierte tu primer usuario en SUPERADMIN a mano (no hay otra forma —
   es intencional, nadie se auto-asciende):
   ```sql
   update profiles set is_superadmin = true where id = 'tu-user-id';
   ```
8. Si un proyecto ya existía antes de alguna tabla nueva, corre el
   `database/migration_*.sql` correspondiente en vez de `schema.sql`
   completo — cada uno tiene un comentario al inicio explicando qué
   agrega y en qué orden correrlo si depende de otro.

## Límites del plan gratuito a tener en cuenta

El servicio de email por defecto de Supabase (usado para confirmar
registros y recuperar contraseña) tiene un límite muy bajo de correos por
hora mientras no configures un proveedor propio. Si ves errores 429 o
"Email rate limit exceeded" al probar registros repetidos, es esto —
espera unos minutos entre intentos durante el desarrollo.

## Estado del envío real de email (Fase 21)

El envío real de recordatorios (Resend + Edge Function + cron) ya está
construido — ver `docs/notificaciones.md` para los pasos de despliegue,
que dependen de que TÚ crees una cuenta en Resend y despliegues la
función con el CLI de Supabase.
