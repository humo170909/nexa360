# Empresas — NEXA360

## Qué es una empresa en NEXA360

Una fila en la tabla `companies` — el "tenant" del modelo multi-tenant
(ver `docs/arquitectura.md` para qué significa eso). Cada empresa tiene
un `business_type` fijo (odontología, óptica, veterinaria, colegio...)
que decide qué módulos aparecen en su Sidebar, y un `is_active` que
decide si puede usar la plataforma en absoluto.

```sql
companies (
  id, name, business_type, plan, is_active, owner_id, created_at
)
```

## Cómo nace una empresa (y cómo NO)

Desde la Fase 22, **no existe ninguna forma de autoservicio**. La única
manera de crear una empresa es:

```
SUPERADMIN genera una invitación
   → alguien la canjea en /register (wizard de 4 pasos)
   → redeem_invitation_code() crea la fila en "companies"
   → el trigger handle_new_company lo convierte en ADMIN automáticamente
```

Ver `docs/invitaciones.md` para el detalle completo de ese flujo. Antes
de la Fase 22, cualquier persona autenticada podía crear una empresa —
ese hueco ya está cerrado (la política que lo permitía se eliminó, no
se reemplazó por una más estricta: sin ninguna política de `insert`,
Postgres deniega por defecto).

## El ciclo de vida de una empresa

```
Creada (is_active = true, vía invitación)
   │
   ├── ADMIN opera normalmente: agrega clientes, agenda, etc.
   ├── ADMIN invita más usuarios a su empresa (docs/invitaciones.md)
   │
   ▼
Suspendida (is_active = false, solo un SUPERADMIN puede hacerlo)
   │
   └── TODOS sus usuarios pierden acceso de inmediato — no solo
       visualmente: is_company_member()/is_company_admin() (las
       funciones que casi todas las políticas RLS usan) exigen que la
       empresa esté activa. Ver Fase 24 en MANUAL-DESARROLLADOR.md.
   │
   ▼
Reactivada (is_active = true de nuevo) — sus usuarios recuperan acceso
   sin tener que volver a iniciar sesión ni hacer nada de su parte.
```

## Quién puede ver/administrar una empresa

| Acción | Quién |
|---|---|
| Ver el nombre/tipo de SU propia empresa | Cualquier miembro (ADMIN o USUARIO) |
| Editar el nombre de SU empresa | Solo ADMIN de esa empresa |
| Ver TODAS las empresas de la plataforma | Solo SUPERADMIN (`/superadmin/companies`) |
| Suspender/Activar una empresa | Solo SUPERADMIN |
| Ver los clientes/citas/datos operativos de una empresa | Solo sus propios miembros — **ni siquiera un SUPERADMIN** (ver `docs/seguridad.md`) |

## Una limitación conocida, documentada a propósito

Un usuario de una empresa suspendida ve el mismo mensaje genérico de
"tu cuenta no tiene una empresa asociada" que alguien cuyo registro
nunca se completó — no hay todavía un mensaje distinto para "tu empresa
fue suspendida, contacta a soporte". El bloqueo de acceso (lo que
importa en seguridad) ya es real desde la Fase 24; el mensaje más
específico es una mejora de experiencia pendiente, no un hueco.
