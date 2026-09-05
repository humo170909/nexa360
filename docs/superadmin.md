# SUPERADMIN — NEXA360

## Qué es

El SUPERADMIN es el administrador de la **plataforma NEXA360 completa**
— no de una empresa. Es quien decide qué empresas nuevas pueden
registrarse (generando invitaciones), y puede ver/suspender cualquier
empresa. No es un rol "más alto" dentro de una empresa — está **fuera**
de la jerarquía de empresas por completo.

```
SUPERADMIN
   │  (administra la plataforma, no pertenece a ninguna empresa)
   │
   ├── Empresa A → su propio ADMIN y sus USUARIOs
   ├── Empresa B → su propio ADMIN y sus USUARIOs
   └── Empresa C → su propio ADMIN y sus USUARIOs
```

## Cómo se marca en la base de datos

```sql
update profiles set is_superadmin = true where id = 'un-user-id';
```

No hay ningún botón en la interfaz para crear un SUPERADMIN — se hace a
mano, directo en el SQL Editor de Supabase. Es intencional: si hubiera
un botón, cualquier ADMIN con acceso a la base de código podría
encontrarlo o forzarlo; que sea un paso manual, fuera de la aplicación,
reduce esa superficie de ataque a "quien tenga acceso al panel de
Supabase", que ya es tu control más fuerte.

## Cómo inicia sesión y a dónde entra

Usa el mismo formulario de Login que cualquiera (`/login`) — no hay una
puerta de entrada separada. La diferencia pasa **después** de
autenticarse: `LoginPage.tsx` consulta `profiles.is_superadmin` y
decide a dónde navegar:

```
Login → Supabase Auth valida correo/contraseña
   → ¿is_superadmin = true?
        SÍ  → /superadmin  (panel de plataforma)
        NO  → /dashboard   (panel de su empresa)
```

Esto no es solo cosa del botón de Login — un SUPERADMIN que refresca la
página, o pega `/dashboard` directo en el navegador, también termina en
`/superadmin` (ver Fase 23 en `MANUAL-DESARROLLADOR.md`: hubo que
corregir 3 puntos de entrada, no solo uno).

## Qué puede administrar

| Sección del panel | Real o placeholder | Qué hace |
|---|---|---|
| Dashboard | Real | Resumen: empresas, usuarios totales, invitaciones activas |
| Empresas | Real | Lista todas las empresas, con su administrador y cantidad de usuarios; Suspender/Activar |
| Usuarios | Real | Lista todos los usuarios de la plataforma (sin correo — ver por qué en `docs/seguridad.md`) |
| Invitaciones | Real | Generar/desactivar códigos para autorizar empresas nuevas |
| Auditoría | Real | Historial global de eventos de toda la plataforma |
| Planes, Módulos, Actividad, Configuración | Placeholder ("Próximamente") | Requieren funcionalidad que no existe todavía (facturación, módulos por empresa individual, feed en vivo) — no se fabricaron pantallas que parezcan funcionar sin estarlo |

## Qué diferencia existe con ADMIN

| | SUPERADMIN | ADMIN |
|---|---|---|
| Administra | NEXA360 completo | Su empresa únicamente |
| Ve datos de clientes/citas | **Nunca** (por diseño — ver `docs/seguridad.md`) | Solo los de su empresa |
| Puede suspender empresas | Sí | No |
| Puede generar invitaciones de empresa nueva | Sí | No (solo invita usuarios a SU empresa, ver `docs/invitaciones.md`) |
| Sidebar que ve | El del panel SUPERADMIN (Empresas, Usuarios, Invitaciones...) | El de su empresa, según su `business_type` (Clientes, Agenda, Servicios...) |

La regla de una sola frase, la que ya usaste en tu propio pedido:
**SUPERADMIN administra NEXA360, ADMIN administra su empresa.** Todo lo
demás en el código es aplicar esa frase de forma consistente en cada
pantalla y cada política RLS.
