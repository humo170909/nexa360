# Supabase — NEXA360

## Por qué Supabase

- Base de datos PostgreSQL real, sin backend propio que mantener.
- Autenticación integrada (Supabase Auth).
- Row Level Security a nivel de fila — el aislamiento multiempresa se aplica
  en la base de datos, no solo en el frontend.
- El frontend habla directo con Supabase usando la `anon key` pública,
  protegida por RLS.

## Modelo de datos (8 tablas)

| Tabla | Para qué | Multi-tenant vía |
|---|---|---|
| `profiles` | Datos de cada usuario autenticado (extiende `auth.users`) | — (es la identidad misma) |
| `companies` | Cada empresa/tenant, con su `business_type` (enum fijo) | — (es el tenant mismo) |
| `company_users` | Qué usuario pertenece a qué empresa y con qué rol (`ADMIN`/`USUARIO`) | `company_id` |
| `clients` | Clientes/pacientes/propietarios | `company_id` |
| `services` | Catálogo de servicios | `company_id` |
| `appointments` | Citas | `company_id` |
| `reminders` | Recordatorios (solo `email` por ahora) | `company_id` |
| `audit_logs` | Registro de auditoría, inmutable | `company_id` (nullable para acciones de plataforma) |

Ver `database/schema.sql` para las columnas exactas.

## Decisiones de diseño importantes

- **SUPERADMIN no es un rol dentro de `company_users`.** Es una bandera
  `profiles.is_superadmin` — administra la plataforma completa, no
  pertenece a una empresa específica.
- **Solo `ADMIN` puede eliminar registros operativos** (clientes, servicios,
  citas, recordatorios); `USUARIO` puede crear y editar pero no borrar.
- **SUPERADMIN no puede leer los datos operativos de ninguna empresa**
  (clientes, citas, etc.) por diseño — su rol es administrar la plataforma
  (empresas, planes), no operar el negocio de cada cliente. Esto es una
  decisión deliberada de privacidad, no un descuido.
- **`audit_logs` es inmutable**: no existe ninguna política de `UPDATE`, así
  que nadie —ni ADMIN ni SUPERADMIN— puede modificar un registro de
  auditoría ya escrito.
- El bootstrap de "quién es ADMIN de una empresa recién creada" lo resuelve
  un trigger automático (`handle_new_company`), no una política RLS — evita
  el problema de "para insertar en company_users ya debías ser ADMIN".

## Row Level Security

Documentado política por política (qué protege / quién lee / inserta /
actualiza / elimina) en `docs/seguridad.md` y aplicado en
`database/policies.sql`. Usa tres funciones auxiliares
(`is_superadmin()`, `is_company_member()`, `is_company_admin()`) para no
repetir la misma subconsulta en cada política.

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

## Límites del plan gratuito a tener en cuenta

El servicio de email por defecto de Supabase (usado para confirmar
registros y recuperar contraseña) tiene un límite muy bajo de correos por
hora mientras no configures un proveedor propio (Resend, planeado para la
Fase 13). Si ves errores 429 o "Email rate limit exceeded" al probar
registros repetidos, es esto — espera unos minutos entre intentos durante
el desarrollo.

## Pendiente

- Instalar función serverless / Edge Function para el envío real de
  recordatorios (Fase 12/13).
