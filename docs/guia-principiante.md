# Guía para principiante — NEXA360

Guía práctica, paso a paso, para probar tú mismo cada pieza de la
arquitectura de roles y multiempresa. Sigue el orden: cada paso depende
del anterior.

> Nota sobre el orden: tu lista original pedía "crear una empresa"
> antes que "crear una invitación" — pero desde la Fase 22, crear una
> empresa **requiere** una invitación primero (no hay autoservicio). Así
> que acá el orden real es invitación → empresa, que es como funciona
> hoy la aplicación.

## Paso 1 — Convertirte en SUPERADMIN (una sola vez, a mano)

En el SQL Editor de Supabase:

```sql
update profiles set is_superadmin = true where id = 'tu-user-id';
```

Tu `user-id` lo encuentras en Supabase → Authentication → Users. Cierra
sesión y vuelve a entrar — deberías caer directo en `/superadmin`.

## Paso 2 — Crear una invitación de empresa

Desde `/superadmin/invitations` → "Generar código". Copia el código
(`NX-XXXX-XXXX`) — solo se muestra una vez.

## Paso 3 — Crear una empresa con ese código

Abre una ventana de incógnito (para no mezclar tu sesión de SUPERADMIN)
→ `/register` → pega el código → completa los 4 pasos del wizard con
datos de una empresa de prueba. Termina en el Dashboard de esa empresa,
como su ADMIN.

## Paso 4 — Invitar un usuario a esa empresa

Con la sesión de esa empresa (no la de SUPERADMIN) → Configuración →
Usuarios → "Invitar usuario" → un correo que puedas usar de nuevo +
rol `USUARIO`. Copia el link generado.

## Paso 5 — Aceptar la invitación y asignar el rol

Abre el link en otra ventana de incógnito → "Soy nuevo" → crea la
cuenta. Debería unirte automáticamente a la empresa con el rol
`USUARIO` que elegiste en el paso anterior. Vuelve a la sesión del
ADMIN: en Configuración → Usuarios, cambia el rol de esa persona a
`ADMIN` usando el selector — confirma que el cambio persiste al
recargar.

## Paso 6 — Quitar (desactivar el acceso de) un usuario

Todavía como ADMIN, usa el botón "Quitar de la empresa" sobre esa misma
persona. Con su sesión, intenta entrar de nuevo — debería caer en "tu
cuenta no tiene una empresa asociada".

## Paso 7 — Entender `company_id`

Casi todas las tablas operativas (`clients`, `appointments`,
`services`...) tienen una columna `company_id`. Es la pieza que separa
los datos de cada empresa dentro de las MISMAS tablas — no hay una base
de datos distinta por empresa, hay una columna que marca de quién es
cada fila. Pruébalo tú mismo:

```sql
-- Como SUPERADMIN en el SQL Editor (te salta RLS por ser el dueño del
-- proyecto, así que esto SÍ te deja ver todo — es una excepción de
-- administración de base de datos, no de la app):
select id, name, business_type from companies;
select company_id, full_name from clients limit 10;
```

Verás que cada cliente tiene un `company_id` distinto según a qué
empresa pertenece.

## Paso 8 — Entender RLS (Row Level Security)

`company_id` por sí solo NO protege nada — es solo un dato. Lo que
convierte ese dato en una barrera real son las **políticas RLS**: reglas
que Postgres aplica automáticamente a cada consulta, sin que el
frontend tenga que acordarse de filtrar nada. Ver `docs/seguridad.md`
para la explicación completa de "por qué ocultar un botón no es
seguridad, pero RLS sí".

## Paso 9 — Comprobar que Empresa A no puede ver Empresa B

La prueba real, no solo teórica:

1. Repite los Pasos 2-3 para crear una **segunda** empresa ("Empresa
   B"), con otra cuenta.
2. Con la sesión de Empresa B, ve a Clientes — debería estar vacío o
   solo mostrar SUS clientes, nunca los de la Empresa A.
3. Para la prueba definitiva (sin depender de que la interfaz "se porte
   bien"), abre las herramientas de desarrollador del navegador (F12) →
   pestaña Network, mientras estás logueado como Empresa B, y mira la
   petición HTTP que trae la lista de clientes. Aunque intentes
   modificarla a mano (con algo como Postman) para pedir clientes sin
   filtro de `company_id`, Supabase seguirá devolviendo solo los de
   Empresa B — porque el filtro no lo aplica el frontend, lo aplica
   Postgres mismo, y no hay forma de pedirle "olvídate de RLS" desde
   afuera sin la `service_role key` (que nunca sale del servidor).

Si el paso 3 funciona como se describe, el aislamiento multiempresa
está funcionando de verdad — no porque el botón esté escondido, sino
porque la base de datos lo garantiza.
