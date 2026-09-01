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
| `companies` | Miembros o SUPERADMIN | Cualquier autenticado | ADMIN o SUPERADMIN | Solo SUPERADMIN |
| `company_users` | Miembros o SUPERADMIN | ADMIN o SUPERADMIN | ADMIN o SUPERADMIN | ADMIN o SUPERADMIN |
| `clients` / `services` / `appointments` / `reminders` | Miembros | Miembros | Miembros | Solo ADMIN |
| `audit_logs` | ADMIN o SUPERADMIN | Miembros (o SUPERADMIN si `company_id` es nulo) | **Nadie** (inmutable) | Solo SUPERADMIN |

Detalle completo y explicación de cada decisión en `docs/supabase.md`.

## Auditoría (Fase 15)

Tabla `audit_logs` registra: usuario, empresa, acción, fecha, información
relevante. Ya se está usando desde la Fase 9 (crear/editar/eliminar
clientes registra su acción vía `logAction()` en
`src/services/auditLogs.ts`) — la Fase 15 construye la pantalla para
ver/filtrar ese historial, no genera los registros (eso ya está resuelto
módulo por módulo, a medida que se construyen).

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
