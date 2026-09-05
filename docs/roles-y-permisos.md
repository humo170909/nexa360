# Roles y permisos — NEXA360

## Los 3 roles que existen hoy

NEXA360 tiene **dos niveles** de rol, que viven en lugares distintos de
la base de datos — mezclarlos es la confusión más común, así que
primero la diferencia:

- **`profiles.is_superadmin`** (true/false) — es de **plataforma**. No
  depende de ninguna empresa.
- **`company_users.role`** (`ADMIN` o `USUARIO`) — es **por empresa**.
  El mismo usuario podría tener un rol distinto en cada empresa a la
  que perteneciera (hoy la app asume una sola empresa por usuario, pero
  el modelo ya lo soporta).

| Rol | Dónde vive | Qué puede hacer | Qué NO puede hacer |
|---|---|---|---|
| **SUPERADMIN** | `profiles.is_superadmin = true` | Ver todas las empresas y usuarios de la plataforma; generar invitaciones para crear empresas; suspender/activar empresas; ver auditoría global | Ver clientes, citas, historiales u otro dato **operativo** de ninguna empresa (RLS se lo impide — ver `docs/supabase.md`); crear otro SUPERADMIN desde la interfaz (se hace a mano en la base de datos, a propósito) |
| **ADMIN** (de una empresa) | `company_users.role = 'ADMIN'` | Todo lo operativo de SU empresa: clientes, agenda, servicios, recordatorios, reportes; invitar usuarios a su empresa; cambiar el rol de otros miembros; quitar usuarios de su empresa; configurar su empresa | Ver o modificar OTRA empresa; ver usuarios de otra empresa; generar invitaciones de empresa nueva (eso es solo SUPERADMIN); ascenderse a sí mismo a SUPERADMIN |
| **USUARIO** (de una empresa) | `company_users.role = 'USUARIO'` | Usar los módulos operativos de su empresa (crear/editar clientes, citas, etc.) | Eliminar registros (solo ADMIN elimina — ver cada tabla en `database/policies.sql`); cambiar roles; invitar usuarios; ver Configuración → Usuarios/Auditoría (esas pestañas exigen ADMIN) |

## Por qué no hay más roles todavía (SUPERVISOR, VENDEDOR...)

Tu propio pedido lo decía bien: *"NO implementar todavía un sistema de
permisos extremadamente complejo. Primero SUPERADMIN, ADMIN"* — y
completamos con USUARIO porque hace falta un tercer nivel para
"alguien que opera pero no administra". Agregar más roles significaría:

1. Una tabla nueva de permisos granulares (qué puede hacer cada rol,
   función por función).
2. Reescribir cada chequeo `role === "ADMIN"` que hoy vive directo en
   el código (~15 archivos) para que consulte esa tabla en su lugar.
3. Actualizar cada política RLS para depender de permisos en vez del
   rol simple.

Es un cambio de arquitectura real, no una fila más en un enum. Vale la
pena solo cuando el negocio de verdad lo necesita (ej. "un VENDEDOR
puede crear citas pero no ver reportes financieros") — mientras el
modelo de 3 roles alcance, agregar más es complejidad sin beneficio
todavía.

## Cómo se aplica cada rol en la práctica

- **En el frontend**: `useCompany()` expone `role` (`"ADMIN" | "USUARIO" | null`)
  y `useIsSuperAdmin()` expone `isSuperAdmin` (boolean) — casi toda
  pantalla que oculta un botón según el rol usa uno de estos dos hooks.
- **En la base de datos**: cada tabla tiene sus propias políticas RLS
  usando `is_company_admin(company_id)`, `is_company_member(company_id)`
  o `is_superadmin()` — ver `docs/seguridad.md` para la explicación de
  por qué el chequeo del frontend NO es la protección real, solo una
  mejora de experiencia.
