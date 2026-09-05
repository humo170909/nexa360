# Usuarios — NEXA360

Este documento es sobre los usuarios **dentro de una empresa**. Para la
vista global de usuarios de toda la plataforma (solo SUPERADMIN), ver
`docs/superadmin.md`.

## Cómo se relaciona un usuario con una empresa

Un usuario (`profiles`) no pertenece a una empresa directamente — la
relación pasa por `company_users`, la tabla puente:

```
profiles (1 usuario)
   │
   ▼
company_users (empresa + rol para ese usuario)
   │
   ▼
companies (la empresa)
```

Por eso quitar a alguien de una empresa (`removeMember`, Fase 26) borra
su fila en `company_users`, no su cuenta — la persona sigue existiendo
en `profiles`/`auth.users`, solo pierde el vínculo con esa empresa
específica.

## Cómo llega un usuario a una empresa

Solo de una forma: **invitado**. Ver `docs/invitaciones.md`, sección B.
No existe (ni existió nunca) un botón de "unirme a esta empresa" de
autoservicio.

## Qué puede hacer un ADMIN sobre los usuarios de su empresa

Todo esto vive en Configuración → Usuarios (`UsersTab.tsx`):

| Acción | Quién | Restricción |
|---|---|---|
| Ver la lista de usuarios de su empresa | ADMIN y USUARIO | — |
| Invitar a alguien nuevo | Solo ADMIN | El correo, no el ADMIN, decide quién puede aceptar |
| Cambiar el rol de otro miembro | Solo ADMIN | Nunca sobre sí mismo (evita quedarse sin ningún ADMIN) |
| Quitar a alguien de la empresa | Solo ADMIN | Nunca sobre sí mismo, mismo motivo |
| Cancelar una invitación pendiente | Solo ADMIN | — |
| Reenviar una invitación (genera un link nuevo) | Solo ADMIN | — |

## Por qué "quitar" y no "desactivar"

`removeMember` borra la fila de `company_users`. La cuenta de Supabase
Auth de esa persona sigue existiendo — puede volver a iniciar sesión,
pero cae en la pantalla de "no tienes empresa asociada"
(`NoCompanyPage.tsx`) hasta que alguien la invite de nuevo. Bloquear la
cuenta por completo (que ni siquiera pueda hacer login) requeriría la
API de administración de Supabase Auth con la `service_role key` — algo
que, por diseño, nunca vive en el frontend. Quedaría para una Edge
Function futura si alguna vez hace falta ese nivel de bloqueo.

## Autoprotección: por qué nunca puedes tocarte a ti mismo

Tanto el cambio de rol como "quitar de la empresa" tienen el mismo
resguardo: nunca se muestra el control sobre tu propia fila. Es una
protección de experiencia (evita que te quedes sin poder administrar tu
propia empresa por accidente) — la protección de seguridad real está en
RLS: aunque alguien manipulara el HTML para mostrarse el botón a sí
mismo, `is_company_admin()` sigue exigiéndose del lado del servidor
para cualquier cambio.
