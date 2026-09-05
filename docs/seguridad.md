# Seguridad — NEXA360

Documento vivo: se amplía en cada fase relevante (auditoría en Fase 15,
pruebas de seguridad en Fase 16). Esto es lo que ya está decidido o aplicado.

## Principios

- Seguridad proporcional al proyecto — no mecanismos exagerados para una
  plataforma de este tamaño, pero tampoco atajos inseguros.
- El aislamiento entre empresas se garantiza en la **base de datos** (RLS),
  nunca solo confiando en que el frontend "no muestre" datos de otra empresa.
- Ningún secreto (claves de Supabase, API keys de email) vive en el código
  del frontend ni se sube a GitHub.

## Riesgos contemplados (OWASP-relevantes) y cómo se abordan

| Riesgo | Cómo se mitiga en NEXA360 |
|---|---|
| Broken Access Control (acceso cruzado entre empresas) | RLS por `company_id` en toda tabla operativa |
| Exposición de secretos | `.env` / `.env.local` excluidos en `.gitignore`; `SUPABASE_SERVICE_ROLE_KEY` nunca en frontend; solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (pensadas para ser públicas) |
| XSS | React escapa por defecto el contenido renderizado; se evita `dangerouslySetInnerHTML` salvo necesidad justificada |
| SQL Injection | No se escribe SQL manual concatenado — se usa el cliente de Supabase (queries parametrizadas) |
| Sesiones inseguras | Supabase Auth maneja tokens JWT con expiración; no se implementa manejo de sesión propio |
| Validación insuficiente | Validación tanto en el formulario (frontend) como en las políticas/reglas de Supabase (no confiar solo en el frontend) |

## Row Level Security (Fase 5 — implementado)

Cada tabla operativa tiene RLS habilitado en `database/policies.sql`. Resumen:

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | Propio usuario o SUPERADMIN | Propio usuario | Propio usuario o SUPERADMIN | Solo SUPERADMIN |
| `companies` | Miembros o SUPERADMIN | **Nadie directamente** (Fase 22: solo vía `redeem_invitation_code()`, que exige un código de invitación válido) | ADMIN o SUPERADMIN | Solo SUPERADMIN |
| `company_users` | Miembros o SUPERADMIN | ADMIN o SUPERADMIN | ADMIN o SUPERADMIN | ADMIN o SUPERADMIN |
| `clients` / `services` / `appointments` / `reminders` | Miembros | Miembros | Miembros | Solo ADMIN |
| `audit_logs` | ADMIN o SUPERADMIN | Miembros (o SUPERADMIN si `company_id` es nulo) | **Nadie** (inmutable) | Solo SUPERADMIN |
| `invitations` / `invitation_attempts` | Solo SUPERADMIN | Solo SUPERADMIN (`invitation_attempts`: nadie directamente, solo la función) | Solo SUPERADMIN | **Nadie** (se desactivan, no se borran) |
| `user_invitations` (Fase 25) | ADMIN de esa empresa o SUPERADMIN | ADMIN de esa empresa | ADMIN de esa empresa (para cancelar; aceptar pasa por función) | **Nadie** (se cancelan, no se borran) |
| `audit_logs` (ampliado, Fase 22/24) | — (sin cambios) | + `company_id` nulo y `user_id = auth.uid()` (usuario recién registrado sin empresa, ej. `registration.failed`); + `company_id` no nulo y SUPERADMIN (ej. `company.suspended` sobre una empresa de la que no es miembro) | — | — |

Detalle completo y explicación de cada decisión en `docs/supabase.md`.

## Auditoría (Fase 15)

Tabla `audit_logs` registra: usuario, empresa, acción, fecha, información
relevante. Ya se está usando desde la Fase 9 (crear/editar/eliminar
clientes registra su acción vía `logAction()` en
`src/services/auditLogs.ts`) — la Fase 15 construye la pantalla para
ver/filtrar ese historial, no genera los registros (eso ya está resuelto
módulo por módulo, a medida que se construyen).

## Registro controlado por invitación (Fase 22)

Antes de esta fase, cualquier persona autenticada podía crear una empresa
(`companies_insert_authenticated` con `auth.uid() is not null`, sin más
condición). Se eliminó esa política — ahora crear una empresa exige un
código de invitación válido, verificado y canjeado por dos funciones de
Postgres (`validate_invitation_code`, `redeem_invitation_code` en
`database/policies.sql`), no por el frontend.

Decisiones de seguridad relevantes:

- **El código nunca se guarda en texto plano** — se guarda `code_hash`
  (SHA-256). No es el mismo caso que una contraseña (hash lento tipo
  bcrypt): un código de invitación es aleatorio de alta entropía
  (generado con `crypto.getRandomValues()`, nunca `Math.random()`), no
  hay diccionario de códigos comunes que un atacante pueda probar, así
  que un hash rápido ya es suficiente.
- **El código en texto plano nunca viaja a Supabase al generarlo** — se
  genera y se hashea en el navegador del SUPERADMIN
  (`src/services/invitations.ts`); solo el hash se manda a insertar.
- **Validar y canjear son operaciones distintas** con su propia función
  cada una: `validate_invitation_code` (Paso 1, sin sesión, rol `anon`)
  solo lee; `redeem_invitation_code` (después de `signUp()`, con sesión)
  vuelve a validar todo y usa `select ... for update` para evitar que dos
  personas canjeen el mismo código de un solo uso al mismo tiempo
  (condición de carrera).
- **Protección básica contra fuerza bruta**: `validate_invitation_code`
  cuenta intentos fallidos por IP (tabla `invitation_attempts`) usando
  los headers que Supabase ya expone a cualquier función — sin Edge
  Function ni servicio externo. Es una primera capa razonable, no
  antiabuso perfecta (ver `MANUAL-DESARROLLADOR.md`, Fase 22, para las
  limitaciones honestas de este enfoque).
- **Panel SUPERADMIN** (`/superadmin/*`) protegido en dos capas: la ruta
  del frontend (`SuperAdminRoute` en `App.tsx`, solo evita mostrar una
  pantalla inútil) y RLS (`is_superadmin()`, la protección real —
  aunque alguien fuerce la URL, Postgres deniega el acceso a los datos).

## Suspender una empresa (Fase 24)

`companies.is_active` existía desde la Fase 5 pero no lo revisaba nada —
un SUPERADMIN podía "suspender" una empresa desde el panel y sus
usuarios seguían con acceso normal. Se corrigió modificando
`is_company_member()`/`is_company_admin()` (`database/policies.sql`)
para exigir también `companies.is_active = true`. Como casi todas las
políticas RLS del proyecto (clientes, citas, servicios, recordatorios,
mascotas, vehículos, etc.) dependen de esas dos funciones, este único
cambio corta el acceso en todas las tablas a la vez — no hizo falta
tocar política por política.

**Limitación conocida**: un usuario de una empresa suspendida ve el
mismo mensaje genérico de "tu cuenta no tiene una empresa asociada"
(`NoCompanyPage.tsx`) que alguien cuyo registro nunca se completó — no
hay todavía un mensaje distinto para "tu empresa fue suspendida". Es
una simplificación consciente: el bloqueo de acceso (lo que de verdad
importa en seguridad) ya es real; el mensaje más específico es una
mejora de UX pendiente, no un hueco de seguridad.

## Invitar usuarios a una empresa existente (Fase 25)

NO confundir con el "Registro controlado por invitación" de arriba
(Fase 22 — SUPERADMIN autoriza la creación de una empresa NUEVA). Esta
es distinta: el ADMIN de una empresa ya existente invita a alguien a
SU empresa, con un rol específico (ADMIN o USUARIO).

Mismo patrón de token que en la Fase 22 (aleatorio con
`crypto.getRandomValues()`, hasheado en el navegador antes de llegar a
Supabase, mostrado una sola vez), con una protección adicional: el
token va dirigido a un correo específico. `accept_user_invitation()`
compara el correo de quien acepta (leído de `auth.users`, solo posible
desde una función `SECURITY DEFINER`, nunca desde el frontend) contra
el correo invitado — si no coinciden, se rechaza, aunque el link
llegara a manos de otra persona.

## Variables de entorno

- **Local**: archivo `.env.local` (nunca `.env` a secas para no confundir
  con el template), basado en `.env.example`. Excluido de git.
- **Vercel**: se configuran en el panel del proyecto → *Settings →
  Environment Variables* (Fase 17). Nunca se pegan claves reales en el
  código ni en el chat/commits.

## Incidente resuelto — colisión de nombres en Tailwind v4

Ver `MANUAL-DESARROLLADOR.md` para el detalle completo: tokens de espaciado
custom (`xs/sm/md/lg/xl/2xl/3xl`) colisionaban con la escala de `max-w-*`
de Tailwind v4, rompiendo el layout de Login/Registro. Ya corregido — se
usa la escala numérica nativa de Tailwind en su lugar.

## Pendiente

- Revisión de seguridad dedicada antes del primer deploy (Fase 16).
