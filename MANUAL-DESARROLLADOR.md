# Manual del Desarrollador — NEXA360

Este archivo es tu bitácora del proyecto: qué se ha hecho en cada fase, por
qué, qué archivos existen y para qué sirven, cómo probar cada cosa, y qué
hacer si algo falla.

> **Nota:** este proyecto se reconstruyó completo en una computadora nueva
> (la anterior no tenía Git instalado ni este proyecto sincronizado). Todo
> el contenido de abajo refleja el estado final ya corregido — incluyendo
> el incidente de Tailwind documentado más abajo.

Regla del proyecto: no se avanza de una fase a otra sin confirmación
explícita.

---

## Índice

- [Fase 0 — Reglas del proyecto](#fase-0--reglas-del-proyecto)
- [Fase 1 — Análisis de los mockups HTML](#fase-1--análisis-de-los-mockups-html)
- [Fase 2 — Estructura del proyecto](#fase-2--estructura-del-proyecto)
- [Fase 3 — Mapeo HTML → componentes/páginas](#fase-3--mapeo-html--componentespáginas)
- [Fase 4 — Toolchain](#fase-4--toolchain-react--typescript--vite--tailwind)
- [Fase 5 — Supabase: modelo de datos y RLS](#fase-5--supabase-modelo-de-datos-y-rls)
- [Fase 6 — Autenticación](#fase-6--autenticación)
- [Fase 7 — Empresas y usuarios (onboarding)](#fase-7--empresas-y-usuarios-onboarding)
- [Fase 8 — Dashboard real](#fase-8--dashboard-real)
- [Fase 9 — Clientes](#fase-9--clientes)
- [Fase 10 — Agenda](#fase-10--agenda)
- [Incidente resuelto — colisión de nombres en Tailwind v4](#incidente-resuelto--colisión-de-nombres-en-tailwind-v4)
- [Incidente resuelto — 403 al crear una empresa (RLS vs. trigger)](#incidente-resuelto--403-al-crear-una-empresa-rls-vs-trigger)
- [Instalar Git y subir a GitHub](#instalar-git-y-subir-a-github)
- [Próximos pasos](#próximos-pasos)

---

## Fase 0 — Reglas del proyecto

- Plataforma: **NEXA360**, SaaS multiempresa (multi-tenant).
- Aislamiento entre empresas vía **`company_id`** (no `tenant_id`).
- Roles: **SUPERADMIN / ADMIN / USUARIO**.
- Stack: React + TypeScript + Vite, Tailwind CSS v4, Supabase (DB + Auth),
  Vercel, GitHub.
- Arquitectura simple a propósito: sin microservicios, sin
  Docker/Kubernetes, sin capas de abstracción innecesarias.
- "Academia" y "Colegio" son tipos de negocio **distintos**, nunca se fusionan.
- No se escribe código de una fase sin haber cerrado y confirmado la anterior.

## Fase 1 — Análisis de los mockups HTML

Se analizaron 17 mockups HTML (`captura0–13`, con variantes). Hallazgos:
mismo sistema de diseño (Inter, Material Symbols, tokens M3) repetido en
cada archivo; `captura1`/`captura2` eran duplicados; 6 dashboards por
industria comparten el mismo shell (prueba de que la plataforma
configurable es viable). Decisiones: **Login = variante clara**,
**Automatizaciones = lista + canvas + historial**.

## Fase 2 — Estructura del proyecto

`src/{components/{ui,layout}, pages, layouts, hooks, services, lib, types,
config, assets}` + `database/` y `docs/` en la raíz. Convenciones:
componentes/páginas en `PascalCase.tsx`, hooks `useX.ts`, services en
plural, carpetas siempre minúsculas.

## Fase 3 — Mapeo HTML → componentes/páginas

17 mockups → 10 páginas reales + 10 componentes compartidos + entradas de
`config/businessTypes.ts` por rubro.

## Fase 4 — Toolchain (React + TypeScript + Vite + Tailwind)

Vite + React 19 + TypeScript, Tailwind CSS v4 (tokens en `src/index.css`
vía `@theme`, sin `tailwind.config.js` separado). Esqueleto de carpetas
completo bajo `src/`.

## Fase 5 — Supabase: modelo de datos y RLS

8 tablas: `profiles`, `companies`, `company_users`, `clients`, `services`,
`appointments`, `reminders`, `audit_logs`. Enum `business_type` con 18
valores. RLS habilitado en las 8 con 3 funciones auxiliares
(`is_superadmin`, `is_company_member`, `is_company_admin`). Decisiones:
SUPERADMIN es una bandera en `profiles`, no un rol de empresa; solo ADMIN
elimina registros operativos; `audit_logs` es inmutable (sin política de
UPDATE). Archivos: `database/schema.sql`, `database/policies.sql`.

**Cómo aplicarlo:** crear proyecto en supabase.com → SQL Editor → ejecutar
`schema.sql` → ejecutar `policies.sql` → copiar `Project URL` y
`anon public key` desde Settings → API → pegar en `.env.local`.

## Fase 6 — Autenticación

`@supabase/supabase-js` + `react-router-dom`. `useAuth` (`src/hooks/useAuth.tsx`)
centraliza sesión, `signIn`/`signUp`/`signOut`/`requestPasswordReset`, y
traduce errores técnicos a mensajes en español (nunca se muestra el error
crudo al usuario, pero sí queda en la consola del navegador para depurar).
`AuthLayout` (variantes `split`/`centered`) + `LoginPage`/`RegisterPage`/
`ForgotPasswordPage`. Rutas públicas redirigen a `/dashboard` si ya hay
sesión; `/dashboard` exige sesión.

## Fase 7 — Empresas y usuarios (onboarding)

`config/businessTypes.ts`: las 18 verticales, 7 basadas en mockups reales
(odontología, óptica, barbería, belleza, veterinaria, taller, colegio), el
resto son punto de partida a refinar. `useCompany` resuelve la empresa
activa del usuario (y su rol). `SelectBusinessTypePage`: nombre de empresa
+ grid de selección de rubro → crea la empresa real. `/dashboard` ahora
exige sesión **y** empresa; si falta la empresa, redirige a `/onboarding`.

Decisión: se agregó el campo "Nombre de empresa" (no estaba en el mockup
original) porque `companies.name` es obligatorio en la base de datos.

## Fase 8 — Dashboard real

`Sidebar`/`Navbar`/`AppLayout` compartidos. Dashboard universal con datos
reales de Supabase (no datos de ejemplo): citas de hoy, total de la
entidad principal del rubro, recordatorios pendientes, servicios activos,
tabla de agenda del día, actividad reciente desde `audit_logs`.
Componentes reutilizables: `StatCard`, `DataTable`, `ActivityFeed`,
`ui/Badge`. Con una empresa recién creada (sin datos), es correcto ver
"No tienes citas programadas para hoy" y "Aún no hay actividad registrada".

## Fase 9 — Clientes

CRUD completo (listar con búsqueda debounced, crear, editar, eliminar) en
un modal reutilizable (`ui/Modal`). La etiqueta de la entidad
("Clientes"/"Pacientes"/"Propietarios"/...) se adapta al rubro. El botón
"Eliminar" solo aparece si el rol es `ADMIN` (coincide con la política RLS
`clients_delete_admin_only`). Se empezó a usar `logAction()` desde ya en
crear/editar/eliminar en vez de esperar a la Fase 15 dedicada a auditoría
— más sentido registrar la acción donde ocurre.

## Fase 10 — Agenda

### Qué se hizo

Vistas Día / Semana / Mes con navegación (anterior/siguiente/hoy), crear y
editar citas (cliente, servicio, profesional, fecha, hora, observaciones,
estado), y eliminar (solo ADMIN, igual que Clientes). No hay mockup de
referencia para el calendario — los 17 diseños originales no incluían esa
pantalla — así que se diseñó manteniendo el mismo sistema visual.

### Archivos

| Archivo | Propósito |
|---|---|
| `src/lib/utils.ts` | +7 funciones de fechas: `startOfDay`, `addDays`, `startOfWeek`, `isSameDay`, `formatDayLabel`, `formatWeekdayShort`, `formatMonthLabel`, `getMonthGrid` |
| `src/types/appointment.ts` | +`AppointmentInput`, `STATUS_LABEL`/`STATUS_TONE`/`STATUS_OPTIONS` compartidos (antes duplicados en Dashboard) |
| `src/services/appointments.ts` | +`listAppointmentsForRange` (`getTodayAppointments` ahora la reutiliza en vez de duplicar la consulta), `createAppointment`, `updateAppointment`, `updateAppointmentStatus`, `deleteAppointment` |
| `src/services/services.ts` | **Nuevo.** `listServices()` — lectura mínima para el selector de servicio al crear una cita. El CRUD completo de Servicios es la Fase 11 |
| `src/services/companies.ts` | +`getCompanyMembers()` — lista de usuarios de la empresa, para el selector de "Profesional" |
| `src/components/ui/Select.tsx` | **Nuevo componente reutilizable** (label + `<select>` con el mismo estilo que `Input`) |
| `src/pages/agenda/AgendaPage.tsx` | Orquesta todo: estado de vista/fecha, carga de citas + listas para los selects, navegación |
| `src/pages/agenda/DayView.tsx` | Lista de citas del día (reutiliza `DataTable`) |
| `src/pages/agenda/WeekView.tsx` | 7 columnas, una por día, con las citas de esa semana |
| `src/pages/agenda/MonthView.tsx` | Grid de semanas completas con contador de citas por día; clic en un día salta a la vista Día |
| `src/pages/agenda/AppointmentFormModal.tsx` | Formulario de crear/editar, calcula `ends_at` automáticamente si el servicio elegido tiene duración |
| `src/App.tsx` | Ruta `/agenda` |

### Cómo probarlo

**Esta vez no pude tomar la captura yo mismo** (a diferencia de Login/
Registro): la Agenda es una ruta protegida que exige tu sesión real, y no
tengo tu contraseña para automatizar el login. El build compila limpio
(validación de tipos de TypeScript en los 104 módulos), pero la prueba
visual la tienes que hacer tú:

1. `npm run dev`, entra a tu cuenta, ve a "Agenda" en el menú.
2. Crea una cita de prueba (necesitas al menos un cliente ya creado en la
   Fase 9 — si no tienes ninguno, créalo primero en "Clientes").
3. Cambia entre Día / Semana / Mes — la cita debería aparecer en las tres
   vistas.
4. Edítala (cambia el estado a "Confirmada", por ejemplo) y bórrala.
5. Vuelve al Dashboard: si la cita queda para hoy, debería contar en
   "Citas de hoy".

### Errores posibles

| Error | Causa | Solución |
|---|---|---|
| El selector de "Servicio" o "Profesional" aparece vacío | Aún no creaste ningún servicio, o eres el único usuario de la empresa | Es correcto — "Sin servicio"/"Sin asignar" son válidos, no bloquean crear la cita |
| No aparece la cita en la vista Mes | Revisa que la fecha elegida esté realmente en el mes que estás viendo | — |
| "No se pudo eliminar (revisa tus permisos)" | Tu rol es `USUARIO`, no `ADMIN` | Comportamiento esperado por RLS, igual que en Clientes |

---

## Incidente resuelto — colisión de nombres en Tailwind v4

### Qué pasó

Al probar en el navegador, Login y Registro se veían completamente rotos:
texto envolviendo palabra por palabra, inputs y botones colapsados a ~16px
de ancho.

### Causa raíz

`src/index.css` tenía tokens de espaciado con nombres `xs/sm/md/lg/xl/2xl/3xl`
(para escribir `p-lg`, `gap-sm`, como en los mockups). El problema: **Tailwind
v4 usa esa misma escala con nombre para resolver también utilidades de
ancho máximo** (`max-w-md`, `max-w-sm`, `max-w-2xl`...), no solo
padding/margin/gap. Al definir `--spacing-md: 16px`, sin darse cuenta
también se redefinía `max-w-md` de 448px a 16px — y lo mismo con el resto
de la escala. (En Tailwind v3, que usaban los mockups originales, `spacing`
y `maxWidth` eran namespaces separados sin este cruce — es específico de v4.)

### Cómo se diagnosticó

Con Playwright (Chromium headless) cargando la página real y leyendo
`getComputedStyle()` del elemento roto: `computedMaxWidth: "16px"`, idéntico
a `--spacing-md`. Esa coincidencia exacta confirmó la causa antes de tocar
ningún archivo.

### La corrección (ya aplicada en todo el código de este repo)

- `src/index.css`: solo quedan `--spacing-sidebar-width` y
  `--spacing-container-max` (nombres que no colisionan con nada reservado).
- Todo el código (~92 clases en 16 archivos) usa la **escala numérica nativa
  de Tailwind**, que coincide exactamente en píxeles:
  `xs→1 (4px), sm→2 (8px), md→4 (16px), lg→6 (24px), xl→8 (32px), 2xl→12 (48px), 3xl→16 (64px)`.
  Ejemplo: `p-lg` → `p-6`, `gap-sm` → `gap-2`.
- Las utilidades `max-w-sm`, `max-w-md`, `max-w-lg`, `max-w-2xl` (AuthLayout,
  Modal, buscador de Clientes) no se tocaron — ahora resuelven correctamente
  a los valores reales de Tailwind.

### Lección para el futuro

Nunca declares en `@theme` un `--spacing-<nombre>` que coincida con un
nombre reservado de Tailwind (`xs, sm, md, lg, xl, 2xl, 3xl` y superiores)
salvo que sea exactamente esa la intención. Nombres inventados como
`sidebar-width` o `container-max` son seguros.

---

## Incidente resuelto — 403 al crear una empresa (RLS vs. trigger)

### Qué pasó

Al intentar crear una empresa en el onboarding, el `INSERT` a `companies`
fallaba con `403 Forbidden` / código Postgres `42501` ("new row violates
row-level security policy for table companies") — **incluso con una sesión
real, válida y correctamente autenticada**.

### Lo que se descartó primero (con evidencia, no adivinando)

1. ¿Faltaban las tablas? No — las 8 existían, verificado directo contra la API.
2. ¿Faltaba la política de INSERT? No — `pg_policies` mostró
   `companies_insert_authenticated` con `with_check = (auth.uid() IS NOT NULL)`,
   exactamente como debía ser.
3. ¿Faltaba el permiso GRANT base? No — `information_schema.role_table_grants`
   confirmó que `authenticated` tenía `INSERT` correctamente otorgado.
4. ¿Era un problema de sesión/token? No — el mismo JWT del usuario leía
   correctamente su propio perfil y su lista (vacía) de empresas.

### Causa raíz real

`createCompany()` hace `INSERT ... RETURNING *` (vía `.select().single()`
de Supabase). Cuando RLS está activo, el `RETURNING` de un INSERT también
debe pasar la política de **SELECT** de esa tabla, no solo la de INSERT. Y
la política de SELECT original era:

```sql
using (is_company_member(id) or is_superadmin())
```

`is_company_member()` depende de que exista una fila en `company_users` —
pero esa fila la crea un **trigger `AFTER INSERT`** (`handle_new_company`),
que corre después de insertarse la empresa. Hay una carrera entre cuándo
Postgres evalúa la visibilidad del `RETURNING` y cuándo el trigger termina
de insertar esa fila relacionada — en ciertos casos, el `RETURNING` se
evalúa sin ver todavía el efecto del trigger, y el INSERT completo se
revierte con ese mismo error de RLS (aunque el problema real es de
lectura, no de escritura).

### La corrección

La política de SELECT ahora también permite ver la empresa si eres su
`owner_id` directamente — un chequeo sobre la misma fila, sin depender de
otra tabla ni de que un trigger ya haya corrido:

```sql
using (
  is_company_member(id)
  or is_superadmin()
  or owner_id = auth.uid()
)
```

Ya aplicado en `database/policies.sql`.

### Cómo se diagnosticó

Con acceso real a la API de Supabase (curl + el token real de la sesión,
que expira en ~1 hora) se reprodujo la petición exacta fuera del navegador,
se consultó `pg_policies` y `information_schema.role_table_grants`
directamente, y se simuló el INSERT en SQL puro dentro de una transacción
con `rollback` (sin tocar datos reales) para confirmar el error sin
depender de las herramientas de desarrollador del navegador.

### Lección para el futuro

Si una política de **INSERT** parece correcta pero el error persiste con
una sesión válida, revisa también la política de **SELECT** de esa misma
tabla — cualquier INSERT que pida datos de vuelta (`RETURNING`/`.select()`)
depende de ambas. Y si la visibilidad de una fila depende de datos que un
trigger crea en OTRA tabla, agrega también un chequeo directo sobre columnas
de la propia fila (como `owner_id`) para no depender del orden de ejecución
del trigger.

---

## Instalar Git y subir a GitHub

Esta máquina **sí tiene Git instalado** (a diferencia de la anterior).

### Configurar tu identidad (una sola vez)

```powershell
git config --global user.name "Tu Nombre"
git config --global user.email "humo170909@gmail.com"
```

### Inicializar el repositorio

```powershell
cd "nexa360"
git init
git add .
git status
```

Antes de continuar, **revisa que `.env.local` NO aparezca** en la lista de
`git status` (el `.gitignore` ya lo excluye, pero siempre vale la pena
confirmar antes del primer commit).

```powershell
git commit -m "Estado inicial NEXA360 (Fases 1-9)"
```

### Conectar con GitHub (cuando decidas hacerlo)

1. Crea un repositorio vacío en https://github.com/new (sin README, sin
   .gitignore, sin licencia).
2. Conecta y sube:

```powershell
git remote add origin https://github.com/TU-USUARIO/nexa360.git
git branch -M main
git push -u origin main
```

Si pide autenticación, usa un Personal Access Token (GitHub → Settings →
Developer settings) o `gh auth login` si tienes GitHub CLI instalado.

---

## Cómo probar todo el proyecto en esta máquina

```powershell
cd "nexa360"
npm install
npm run dev
```

Ya tiene `.env.local` con tus credenciales reales de Supabase (mismo
proyecto que usabas antes: `ogfdrizmfqufodxnfxvt`), así que no necesitas
volver a configurarlo. Abre `http://localhost:5173` y deberías ver
Login → Registro/Onboarding → Dashboard → Clientes funcionando igual que
en la computadora anterior.

---

## Fase 14 — Mascotas (Veterinaria)

### Qué se hizo

El primer módulo con una **tabla nueva de verdad** (no una vista sobre
`clients`/`appointments` como Historia/Tratamientos/Controles). Cada
empresa de tipo `veterinaria` gana un módulo "Mascotas" en el Sidebar
con CRUD completo: nombre, especie, raza, fecha de nacimiento, notas, y
a qué propietario (cliente) pertenece cada una. Es el primero de varios
módulos "de entidad nueva" que van a seguir el mismo patrón (Vehículos
para Taller, etc.).

### Por qué una tabla nueva y no reutilizar datos

Historia/Tratamientos/Controles pudieron reutilizar `appointments`
porque ya representaban lo mismo con otro nombre ("una cita atendida" =
"un tratamiento hecho"). Una mascota no es una variación de ningún dato
que ya existiera — es una entidad propia con su propio ciclo de vida
(nace, tiene dueño, puede tener varias citas a lo largo del tiempo), así
que fabricar eso como una vista habría sido forzar el modelo. Cuando la
entidad es genuinamente nueva, la tabla nueva es la opción correcta.

### Archivos

| Archivo | Propósito |
|---|---|
| `database/migration_pets.sql` | **Nuevo.** Migración standalone para proyectos ya desplegados — tabla `pets` + RLS. Segura de re-ejecutar (usa `drop policy if exists`) |
| `database/schema.sql` | +tabla `pets` (sección 9) e índices, para que una instalación nueva desde cero ya la incluya |
| `database/policies.sql` | +políticas RLS de `pets` (select/insert/update para miembros, delete solo ADMIN — mismo patrón que `clients`/`services`) |
| `src/types/pet.ts` | **Nuevo.** `Pet`, `PetWithOwner` (con el nombre del dueño ya resuelto) |
| `src/services/pets.ts` | **Nuevo.** `listPets` (join manual contra `clients` para mostrar el nombre del dueño), `listPetsForOwner`, `createPet`, `updatePet`, `deletePet` |
| `src/pages/pets/PetsPage.tsx` | **Nuevo.** Lista + modal de crear/editar, con un selector de propietario poblado desde `listClients`. Mismo patrón que `ServicesPage.tsx` |
| `src/App.tsx` | Ruta `/pets` |

### Cómo probarlo

**Antes que nada, corre la migración**: entra a tu proyecto de Supabase →
SQL Editor → pega el contenido completo de `database/migration_pets.sql`
→ Run. Sin este paso la tabla `pets` no existe todavía y el módulo
mostrará error al cargar.

1. `npm run dev`, entra con una empresa de tipo **Veterinaria** (si tu
   empresa de prueba es de otro rubro, "Mascotas" no aparecerá en el
   Sidebar — es intencional, el Sidebar es 100% dependiente de
   `business_type`).
2. Ve a "Mascotas". Si no tienes ningún cliente todavía, la pantalla te
   avisa que registres uno primero en "Propietarios" antes de poder
   crear una mascota.
3. Crea una mascota, elige un propietario del selector.
4. Haz clic en el nombre del propietario dentro de la tabla — debería
   llevarte a `/clients/:id` (su ficha de cliente).
5. Edítala y bórrala (el botón de eliminar solo aparece si tu rol es
   ADMIN).

### Qué deberías aprender

- Cuándo una entidad nueva justifica una tabla nueva vs. cuándo conviene
  reutilizar datos existentes (comparar con la decisión tomada en
  Historia/Tratamientos).
- El patrón de "join manual en el cliente": Supabase permite pedir datos
  relacionados con `select("*, owner:clients(full_name)")`, que Postgres
  resuelve como un join real en la base de datos — no son dos consultas
  separadas hechas por el navegador.
- Por qué mantener `schema.sql` (instalación nueva) y
  `migration_pets.sql` (proyectos ya existentes) sincronizados, en vez
  de solo modificar uno de los dos.

---

## Fase 15 — Vehículos (Taller)

### Qué se hizo

Segundo módulo de "entidad nueva", calcado del patrón de Mascotas: tabla
`vehicles` propia (placa, marca, modelo, año, notas, propietario) con
CRUD completo y su selector de propietario. Confirma que el patrón
Mascotas es reutilizable tal cual para cualquier vertical con una
entidad física propia — el próximo (Medidas visuales para Óptica, Ventas
para Óptica, etc.) sigue el mismo molde.

### Archivos

| Archivo | Propósito |
|---|---|
| `database/migration_vehicles.sql` | **Nuevo.** Migración standalone — tabla `vehicles` + RLS |
| `database/schema.sql` | +tabla `vehicles` (sección 10) e índices |
| `database/policies.sql` | +políticas RLS de `vehicles` (mismo patrón que `pets`) |
| `src/types/vehicle.ts` | **Nuevo.** `Vehicle`, `VehicleWithOwner` |
| `src/services/vehicles.ts` | **Nuevo.** `listVehicles` (join contra `clients`), `listVehiclesForOwner`, `createVehicle`, `updateVehicle`, `deleteVehicle` |
| `src/pages/vehicles/VehiclesPage.tsx` | **Nuevo.** Lista + modal, idéntico en estructura a `PetsPage.tsx` |
| `src/App.tsx` | Ruta `/vehicles` |

### Cómo probarlo

1. **Corre `database/migration_vehicles.sql`** en el SQL Editor de
   Supabase antes de probar — igual que con Mascotas, sin esto la tabla
   no existe.
2. `npm run dev`, entra con una empresa tipo **Taller mecánico**, ve a
   "Vehículos" en el Sidebar.
3. Si no tienes clientes, la pantalla te avisa que registres uno primero.
4. Crea/edita/elimina un vehículo y confirma que el nombre del
   propietario te lleva a su ficha de cliente.

### Qué deberías aprender

Cuando un segundo módulo resulta ser una copia casi exacta de la
estructura del primero (mismos tipos de campo, mismo flujo de formulario,
mismo join), es la señal de que el patrón ya está bien encontrado — no
hace falta inventar una abstracción genérica "EntityWithOwnerPage" salvo
que aparezca un tercer o cuarto caso que la justifique. Tres
implementaciones parecidas siguen siendo más simples de mantener que una
abstracción prematura.

---

## Fase 16 — Medidas visuales y Ventas (Óptica)

### Qué se hizo

Los dos módulos específicos que le faltaban a Óptica. "Medidas visuales"
es distinto a Mascotas/Vehículos: en vez de una ficha única por entidad,
es un **historial** — un cliente puede tener varias medidas a lo largo
del tiempo (la vista más reciente arriba), como una receta óptica real:
esfera, cilindro y eje por cada ojo (OD = ojo derecho, OS = ojo
izquierdo, nomenclatura estándar del rubro) más distancia pupilar.
"Ventas" registra artículos vendidos (lentes, armazones, accesorios)
ligados a un cliente, con cantidad, precio unitario y total calculado, y
agrega 3 StatCards con el acumulado (mismo componente que usa el
Dashboard).

### Archivos

| Archivo | Propósito |
|---|---|
| `database/migration_eye_measurements.sql` | **Nuevo.** Tabla `eye_measurements` + RLS |
| `database/migration_sales.sql` | **Nuevo.** Tabla `sales` + RLS |
| `database/schema.sql` | +tablas `eye_measurements` (11) y `sales` (12) e índices |
| `database/policies.sql` | +políticas RLS de ambas (mismo patrón que `pets`/`vehicles`) |
| `src/types/eyeMeasurement.ts`, `src/services/eyeMeasurements.ts` | **Nuevos.** CRUD + `listEyeMeasurementsForOwner` para uso futuro en la ficha de cliente |
| `src/types/sale.ts`, `src/services/sales.ts` | **Nuevos.** CRUD, con `quantity * unit_price` calculado en el frontend (no se guarda un "total" redundante en la tabla) |
| `src/pages/measurements/MeasurementsPage.tsx` | **Nuevo.** Formulario con 2 bloques (OD/OS) de esfera/cilindro/eje + distancia pupilar |
| `src/pages/sales/SalesPage.tsx` | **Nuevo.** Lista + StatCards de resumen (ventas registradas, total acumulado, ticket promedio) |
| `src/App.tsx` | Rutas `/measurements` y `/sales` |

### Cómo probarlo

1. **Corre ambas migraciones** (`migration_eye_measurements.sql` y
   `migration_sales.sql`) en el SQL Editor de Supabase.
2. `npm run dev`, entra con una empresa tipo **Óptica**.
3. En "Medidas visuales": crea una medida para un cliente, confirma que
   el signo se muestra explícito (+1.25, -0.50) como en una receta real,
   y que crear una segunda medida para el mismo cliente no reemplaza la
   primera — ambas quedan en el historial, ordenadas por fecha.
4. En "Ventas": registra una venta, confirma que el total (cantidad ×
   precio) se calcula solo, y que las 3 StatCards de arriba se
   actualizan.

### Qué deberías aprender

- La diferencia entre una entidad de "ficha única" (Mascotas, Vehículos
  — una fila por mascota/auto) y una de "historial" (Medidas visuales —
  varias filas por cliente a lo largo del tiempo, como las citas). El
  modelo de datos es el mismo (`owner_id` + tabla propia), pero la
  decisión de diseño (¿reemplazar o acumular?) depende del dominio, no
  de la estructura SQL.
- Por qué el total de una venta NO se guarda en la base de datos: es un
  valor derivado (`quantity * unit_price`) que siempre se puede
  recalcular; guardarlo aparte crearía la posibilidad de que quedara
  desincronizado si se edita la cantidad o el precio después.

---

## Fase 17 — Padres/Apoderados, Grados, Docentes y Comunicados (Colegio)

### Qué se hizo

Los 4 módulos específicos de Colegio, el vertical más grande construido
hasta ahora. Tres formas de modelar datos distintas, todas ya vistas
antes pero aplicadas juntas por primera vez:

- **Docentes** (`teachers`): catálogo simple (como Servicios), sin
  ligar a un estudiante. **Deliberadamente compartida con Academia** —
  la tabla y el módulo son los mismos; solo cambia la etiqueta
  ("Docentes" vs. "Profesores") según `business_type`, igual que ya
  pasa con Historial/Tratamientos en otros rubros. Cuando se construya
  Academia, este módulo ya está listo — no hace falta repetirlo.
- **Grados** (`grades`): catálogo que además referencia a un docente a
  cargo (`teacher_id`, opcional). Primera tabla que depende de OTRA
  tabla nueva del proyecto (no solo de `clients`), así que el orden de
  migración importa: `migration_teachers.sql` antes que
  `migration_grades.sql`.
- **Padres/Apoderados** (`guardians`): ligado a un estudiante
  (`owner_id` → `clients`, mismo patrón que Mascotas/Vehículos), con un
  campo de parentesco (madre/padre/tutor/otro). Si un estudiante tiene
  dos apoderados, son dos filas — no hay una relación muchos-a-muchos
  todavía (ver "Qué deberías aprender").
- **Comunicados** (`announcements`): sin `owner_id` — un aviso no
  pertenece a ningún estudiante en particular, aplica a todos. Es el
  primer módulo que se muestra como tarjetas en vez de tabla (nadie lee
  comunicados en filas de una hoja de cálculo).

### Archivos

| Archivo | Propósito |
|---|---|
| `database/migration_teachers.sql`, `migration_grades.sql`, `migration_guardians.sql`, `migration_announcements.sql` | **Nuevos.** Ejecutar EN ESE ORDEN — `grades` depende de `teachers` |
| `database/schema.sql` | +4 tablas (secciones 13-16) e índices |
| `database/policies.sql` | +políticas RLS de las 4 (mismo patrón que módulos anteriores) |
| `src/types/teacher.ts`, `src/services/teachers.ts`, `src/pages/teachers/TeachersPage.tsx` | **Nuevos.** Catálogo simple, sin owner |
| `src/types/grade.ts`, `src/services/grades.ts`, `src/pages/grades/GradesPage.tsx` | **Nuevos.** Catálogo + join contra `teachers` |
| `src/types/guardian.ts`, `src/services/guardians.ts`, `src/pages/guardians/GuardiansPage.tsx` | **Nuevos.** Mismo patrón que `pets`/`vehicles`, con `RELATIONSHIP_LABEL` para el parentesco |
| `src/types/announcement.ts`, `src/services/announcements.ts`, `src/pages/announcements/AnnouncementsPage.tsx` | **Nuevos.** Sin owner, vista de tarjetas con `EmptyState` |
| `src/App.tsx` | Rutas `/teachers`, `/grades`, `/guardians`, `/announcements` |

### Cómo probarlo

1. **Corre las 4 migraciones en orden**: `migration_teachers.sql` →
   `migration_grades.sql` → `migration_guardians.sql` →
   `migration_announcements.sql`. Si corres `grades` antes que
   `teachers`, va a fallar (la columna `teacher_id` no puede referenciar
   una tabla que no existe todavía).
2. `npm run dev`, entra con una empresa tipo **Colegio**.
3. Crea un docente en "Docentes", luego un grado en "Grados" y asígnale
   ese docente — confirma que aparece su nombre en la tabla.
4. Crea un estudiante en "Estudiantes" (la entidad base), luego un
   apoderado en "Padres/Apoderados" ligado a ese estudiante.
5. Publica un comunicado — debería verse como tarjeta, no como fila de
   tabla.

### Qué deberías aprender

- Un mismo módulo (Docentes) puede servir a dos verticales distintas
  sin duplicar código: la clave "teachers" en `extraModules` es la
  misma para Colegio y Academia, así que un solo componente,
  `TeachersPage.tsx`, atiende a ambos — solo el texto cambia.
- Cuándo una tabla nueva depende de otra tabla nueva (no de las 8
  originales del proyecto): el orden de las migraciones deja de ser
  arbitrario. `schema.sql` ya refleja ese orden porque Postgres exige
  que la tabla referenciada exista antes de crear la referencia.
- La limitación consciente de `guardians`: un padre con dos hijos en el
  mismo colegio queda registrado dos veces (una fila por hijo), en vez
  de una relación muchos-a-muchos con tabla intermedia. Es una
  simplificación deliberada para no construir una relación compleja
  antes de que el proyecto la necesite de verdad — se puede migrar más
  adelante si se vuelve un problema real, no antes.

---

## Fase 18 — Cursos y Matrículas (Academia)

### Qué se hizo

Los últimos dos módulos específicos que faltaban de la ronda de "módulos
por vertical" que arrancó con Mascotas. Con esto, **Docentes** (Fase
17) queda demostrado como reutilizable de verdad: Academia no repitió
esa tabla ni ese componente, solo agregó "Cursos" y "Matrículas" encima.

- **Cursos** (`courses`): catálogo igual a Grados — nombre, profesor a
  cargo (`teacher_id`, reutiliza la misma tabla `teachers` de Colegio),
  descripción, precio.
- **Matrículas** (`enrollments`): la primera relación
  **muchos-a-muchos real** del proyecto. A diferencia de Padres/
  Apoderados (Fase 17), donde deliberadamente evitamos esa complejidad
  porque no hacía falta, acá SÍ se justifica: un alumno puede cursar
  varios cursos y un curso tiene varios alumnos, y ambos lados
  importan igual. La tabla tiene un `unique (student_id, course_id)`
  para que la base de datos misma impida matricular dos veces al mismo
  alumno en el mismo curso — no es una validación que dependa de que el
  frontend se acuerde de chequearlo.

### Archivos

| Archivo | Propósito |
|---|---|
| `database/migration_courses.sql`, `migration_enrollments.sql` | **Nuevos.** Ejecutar en ese orden — `enrollments` depende de `courses` (y `courses` depende de `teachers`, ya creada en la Fase 17) |
| `database/schema.sql` | +tablas `courses` (17) y `enrollments` (18) e índices |
| `database/policies.sql` | +políticas RLS de ambas |
| `src/types/course.ts`, `src/services/courses.ts`, `src/pages/courses/CoursesPage.tsx` | **Nuevos.** Calcado de `GradesPage.tsx` |
| `src/types/enrollment.ts`, `src/services/enrollments.ts`, `src/pages/enrollments/EnrollmentsPage.tsx` | **Nuevos.** Doble join (alumno + curso), maneja el error de duplicado (código Postgres `23505`) con un mensaje legible en vez del texto crudo de la base de datos |
| `src/App.tsx` | Rutas `/courses` y `/enrollments` |

### Cómo probarlo

1. Si tu proyecto ya tiene `teachers` de la Fase 17, corre solo
   `migration_courses.sql` y después `migration_enrollments.sql`. Si es
   un proyecto nuevo, recuerda que `teachers` tiene que existir primero.
2. `npm run dev`, entra con una empresa tipo **Academia**.
3. Crea un curso en "Cursos" (opcionalmente asígnale un profesor — la
   lista sale de la misma tabla que ya usa Colegio).
4. Crea un alumno en "Alumnos", luego matricúlalo en "Matrículas".
5. Intenta matricular al mismo alumno en el mismo curso una segunda
   vez — debería rechazarlo con "Este alumno ya está matriculado en ese
   curso" en vez de un error técnico.

### Qué deberías aprender

- La diferencia entre una relación que se modela con `owner_id` (una
  fila "pertenece" a un cliente — Mascotas, Vehículos, Padres/
  Apoderados) y una que necesita una tabla de unión de verdad
  (Matrículas): la señal es si ambos lados de la relación necesitan
  poder verse desde el otro (¿cuántos alumnos tiene este curso? Y
  también, ¿en qué cursos está este alumno?). Cuando la pregunta
  importa en las dos direcciones, hace falta una tabla propia.
- Por qué un `unique (a, b)` en la base de datos es mejor que confiar
  en que el frontend valide "no dejes matricular dos veces": cualquier
  otro cliente de la API (un script, otra pantalla futura, Supabase
  Studio) queda protegido igual, sin depender de que alguien recuerde
  repetir la misma validación en JavaScript.

Con esto quedan construidos todos los módulos específicos que se
identificaron al inicio de esta ronda (Mascotas, Vehículos, Medidas
visuales, Ventas, Docentes/Grados/Padres-Apoderados/Comunicados,
Cursos/Matrículas) — los 18 verticales de NEXA360 ya tienen contenido
real y diferenciado en su Sidebar, no solo el Dashboard genérico.

---

## Fase 19 — Cambiar roles desde Configuración → Usuarios

### Qué se hizo

La pestaña "Usuarios" de Configuración mostraba el rol de cada persona
(`ADMIN`/`USUARIO`) como una etiqueta de solo lectura. Ahora, si tú eres
ADMIN, esa etiqueta se convierte en un `<select>` para reasignar el rol
de cualquier otro miembro — con una excepción: nunca se te muestra el
select sobre tu propia fila, para que no puedas quitarte a ti mismo el
único acceso de administrador que tienes por accidente.

No fue necesario crear ninguna tabla nueva: `company_users.role` y su
política RLS de UPDATE (`company_users_update_admin_or_superadmin`) ya
existían desde la Fase 5 — solo faltaba la interfaz para usarlo.

### Archivos

| Archivo | Propósito |
|---|---|
| `src/services/companies.ts` | +`companyUserId` en `CompanyMemberDetailed` (antes solo tenía el id del perfil, no el de la fila `company_users` — hacía falta para poder apuntar el UPDATE) y +`updateMemberRole()` |
| `src/pages/settings/UsersTab.tsx` | El Badge de rol se reemplaza por un `<select>` cuando el usuario actual es ADMIN y la fila no es la suya propia |

### Cómo probarlo

Necesitas una empresa con al menos 2 usuarios (tú como ADMIN + otra
cuenta que hayas agregado antes a `company_users` manualmente, ya que
"Invitar usuario" todavía no está construido). Entra a Configuración →
Usuarios, cambia el rol del otro usuario, y confirma que el cambio
persiste al recargar la página.

### Qué deberías aprender

La protección real no está en que el `<select>` se oculte en tu propia
fila — eso es solo UX. La protección real es la política RLS: si
alguien manipulase el HTML con las herramientas de desarrollador para
mostrar el select en su propia fila e intentara bajarse el rol (o
peor, subírselo desde una cuenta ajena sin ser ADMIN), Supabase
rechazaría la actualización igual, porque `is_company_admin()` se
evalúa en la base de datos, no en el navegador.

---

## Fase 20 — Horarios, Notificaciones e Integraciones (Configuración)

### Qué se hizo

Pediste completar las 4 pestañas que le faltaban a Configuración
(Permisos, Horarios, Notificaciones, Integraciones). Construí 3 de
forma distinta a propósito — no todas merecían el mismo tratamiento:

- **Horarios**: módulo real y completo, nueva tabla `business_hours`
  (una fila por día de la semana por empresa). La pantalla siempre
  muestra 7 filas (Lunes a Domingo) aunque la empresa nunca haya
  guardado nada — si no hay filas en la base de datos todavía, el
  servicio rellena valores por defecto razonables (Lunes-Viernes
  09:00-18:00, fin de semana cerrado) que solo se guardan de verdad
  cuando el usuario aprieta "Guardar horario".
- **Notificaciones** e **Integraciones**: pestañas reales en el sentido
  de que existen y son navegables, pero su contenido es un
  `EmptyState` honesto ("Próximamente") — NO construí interruptores de
  "activar notificación por email" ni botones de "Conectar WhatsApp",
  porque no hay ningún backend de envío ni integración de terceros
  conectada todavía. Un interruptor que no controla nada real sería
  exactamente el tipo de simulación que este proyecto evita a propósito
  desde el principio (mismo criterio que "WhatsApp/SMS: Próximamente"
  en Recordatorios).
- **Permisos granulares**: **NO se construyó**, y es una decisión
  deliberada, no un olvido. Ahora mismo el modelo de acceso completo de
  NEXA360 son 2 roles (ADMIN/USUARIO) — no hay una tabla de "permisos
  por función" (ej. "este USUARIO puede editar Clientes pero no
  eliminarlos"). Construir eso significaría: (1) una tabla nueva de
  permisos, (2) reescribir cada chequeo `role === "ADMIN"` que hoy
  existe en ~15 páginas para que en su lugar consulte esa tabla, y (3)
  actualizar las políticas RLS de cada tabla para que dependan de
  permisos en vez del rol simple. Es un cambio de arquitectura, no una
  pantalla más — y justo el tipo de complejidad que puede no valer la
  pena todavía para una empresa chica con 2-3 usuarios. Lo dejo
  explícitamente pendiente de tu confirmación antes de tocarlo.

### Archivos

| Archivo | Propósito |
|---|---|
| `database/migration_business_hours.sql` | **Nuevo.** Tabla `business_hours` + RLS |
| `database/schema.sql` | +tabla `business_hours` (sección 19) e índice |
| `database/policies.sql` | +políticas RLS de `business_hours` |
| `src/types/businessHours.ts`, `src/services/businessHours.ts` | **Nuevos.** `listBusinessHours` rellena los 7 días con defaults si la empresa no guardó nada aún; `saveBusinessHours` hace un `upsert` de las 7 filas en una sola llamada |
| `src/pages/settings/HoursTab.tsx` | **Nuevo.** Checkbox "Cerrado" + inputs de hora por día, solo editable por ADMIN (mismo patrón que `MyCompanyTab.tsx`) |
| `src/pages/settings/NotificationsTab.tsx`, `IntegrationsTab.tsx` | **Nuevos.** Placeholders honestos con `EmptyState`, sin controles falsos |
| `src/pages/settings/SettingsPage.tsx` | +3 pestañas nuevas |

### Cómo probarlo

1. Corre `database/migration_business_hours.sql` en el SQL Editor de
   Supabase.
2. `npm run dev` → Configuración → **Horarios**: cambia algún día a
   "Cerrado" o edítale el horario, guarda, recarga la página y confirma
   que persiste.
3. Entra a **Notificaciones** e **Integraciones**: deberían verse como
   una pantalla de "Próximamente" — sin ningún botón que parezca
   funcional pero no haga nada.

### Qué deberías aprender

La decisión más importante de esta fase no fue código, fue **decir que
no a una parte del pedido** ("Permisos granulares") explicando por qué,
en vez de fabricar algo a medias para marcar la casilla de "todo
listo". Como estudiante de ciberseguridad, este es un buen ejemplo de
por qué "menos privilegios, pero bien aplicados" (2 roles reales,
reforzados por RLS en la base de datos) es preferible a un sistema de
permisos granular mal implementado que dé una falsa sensación de
control fino sin estar realmente probado ni protegido en cada capa.

---

## Fase 21 — Envío real de recordatorios por email

### Qué se hizo

Hasta ahora, un recordatorio se guardaba en la tabla `reminders` pero
nunca se enviaba de verdad — quedaba en `status = 'pendiente'` para
siempre. Esta fase conecta el envío real usando
[Resend](https://resend.com) como proveedor de email, con la pieza que
faltaba: **algo que corra del lado del servidor**, no en el navegador.

El proyecto no tiene (ni necesita) un backend propio tipo Node/Express
— para esto se usa una **Supabase Edge Function**, que es código que
corre en los servidores de Supabase bajo demanda. Un cron job de
Postgres la llama cada 10 minutos; ella revisa qué recordatorios ya
deberían enviarse, llama a la API de Resend, y actualiza el estado a
`enviado` o `fallido` según el resultado.

### Por qué esto no podía vivir en el frontend

Enviar el email requiere la API key de Resend, y actualizar el estado
del recordatorio para CUALQUIER empresa requiere saltarse RLS (la
`SERVICE_ROLE_KEY`). Ninguna de las dos puede existir en código que se
descarga al navegador — cualquiera podría abrir las herramientas de
desarrollador y robarlas. Una Edge Function es la pieza de
infraestructura mínima necesaria para tener un lugar seguro donde vivan
esos secretos, sin montar un servidor propio que mantener.

### Archivos

| Archivo | Propósito |
|---|---|
| `supabase/functions/send-reminders/index.ts` | **Nuevo.** La Edge Function: busca recordatorios pendientes vencidos, llama a Resend, actualiza el estado |
| `supabase/config.toml` | **Nuevo.** Mínimo necesario — declara la función y desactiva la verificación de JWT de usuario (quien la llama es el cron de Postgres, no una persona logueada) |
| `database/migration_reminder_cron.sql` | **Nuevo.** Activa `pg_cron`/`pg_net` y programa la llamada cada 10 minutos. El secreto que autoriza la llamada se guarda con `vault.create_secret` — nunca queda escrito en texto plano en este archivo ni en git |
| `docs/notificaciones.md` | Reescrito con los pasos reales de despliegue (antes era solo el plan conceptual) |
| `.gitignore` | +`supabase/.temp`, `supabase/.branches` (metadata local del CLI, no secretos, pero tampoco pertenece al repositorio) |

### Cómo desplegarlo (pasos que tienes que hacer tú — ver `docs/notificaciones.md` para el detalle completo)

1. Cuenta gratis en resend.com → copiar API key.
2. `npx supabase login` y `npx supabase link --project-ref ogfdrizmfqufodxnfxvt`.
3. `npx supabase secrets set RESEND_API_KEY=... CRON_SECRET=...` (el
   `CRON_SECRET` te lo di en el chat — un valor aleatorio de 32 bytes,
   generado una sola vez para este propósito).
4. `npx supabase functions deploy send-reminders`.
5. Guardar ese mismo `CRON_SECRET` en Supabase Vault (un comando SQL,
   ver el encabezado de `migration_reminder_cron.sql`) y correr el resto
   de ese archivo.

### Qué deberías aprender

- **Vault vs. variables de entorno de la función**: el `CRON_SECRET`
  vive en dos lugares — como secreto de la Edge Function (para que ella
  pueda comparar el header que recibe) y en Supabase Vault (para que el
  cron job de Postgres pueda mandarlo sin que quede escrito en texto
  plano en la definición del job, que cualquier administrador de la
  base de datos podría leer con `select * from cron.job`).
- **`verify_jwt = false` no es "sin seguridad"**: significa que esta
  función en particular no exige la sesión de un usuario humano, porque
  quien la llama es un proceso interno de Postgres — pero sigue exigiendo
  su propio secreto (`x-cron-secret`). Desactivar una capa de seguridad
  está bien cuando la reemplazas por otra apropiada al caso real, no
  cuando simplemente la quitas.
- **Por qué un cron en la base de datos y no un `setInterval` en algún
  lado**: no hay ningún servidor propio corriendo 24/7 en este proyecto
  (a propósito, para no tener infraestructura que mantener) — Postgres
  ya está corriendo siempre, así que programar el trabajo ahí (con
  `pg_cron`) no agrega una pieza nueva de infraestructura.

---

## Próximos pasos

**Fase 11 — Servicios**: completada (`ServicesPage.tsx` ya tiene el
CRUD completo — crear, editar, activar/desactivar, eliminar — este
apunte quedó desactualizado desde entonces).

**Pendiente real**: el código del envío real de recordatorios ya está
construido (Fase 21), pero falta que TÚ lo despliegues (cuenta de
Resend, secretos, `supabase functions deploy`) — hasta que eso pase,
los recordatorios se siguen quedando en "Pendiente" para siempre.
WhatsApp/SMS siguen mostrando "Próximamente" a propósito. También queda
pendiente el deploy a Vercel.

---

## Fase 22 — Registro controlado por invitación

### Qué se hizo

Hasta ahora, cualquier persona podía entrar a "Crear cuenta" y terminar
con su propia empresa dentro de NEXA360 — el registro estaba
completamente abierto. Esta fase lo cierra por completo: ahora hace
falta un código de invitación válido, generado por un SUPERADMIN, para
poder crear una cuenta nueva.

**El cambio más importante no es una pantalla, es una política de base
de datos que se eliminó.** `companies_insert_authenticated` decía
literalmente "cualquier usuario logueado puede crear una empresa" — se
borró, y no se reemplazó por nada. Sin ninguna política permisiva de
`insert` sobre `companies`, Postgres deniega esa operación por defecto
para cualquier rol normal. La única puerta que queda abierta es la
función `redeem_invitation_code()`, que corre con privilegios elevados
(`SECURITY DEFINER`) y exige haber verificado un código antes de hacer
ese insert. Esto es "seguro por diseño": no depende de que el frontend
se acuerde de chequear el código — aunque alguien llame a la API de
Supabase directamente con Postman, sin pasar por React, la base de
datos igual rechaza la creación de una empresa sin invitación.

### El flujo completo

```
SUPERADMIN → genera código (se guarda solo su hash, SHA-256)
   → entrega el código en texto plano al cliente (una sola vez, nunca
     más se puede volver a ver — ni el propio SUPERADMIN)
Cliente → Paso 1: pega el código → validate_invitation_code() (RPC,
     sin sesión todavía) confirma que existe/activo/no expiró/no gastado
   → Paso 2: nombre de empresa + tipo de negocio
   → Paso 3: nombre, correo, teléfono, contraseña → signUp() crea la
     cuenta en Supabase Auth
   → redeem_invitation_code() (RPC, YA con sesión) vuelve a validar todo
     (pudieron pasar minutos) y esta vez SÍ crea la empresa, marca el
     código usado, y el trigger handle_new_company (Fase 5) ya existente
     te deja como ADMIN de esa empresa
   → Dashboard
```

### Por qué dos funciones y no una

`validate_invitation_code` se llama en el Paso 1, **antes de que exista
sesión** (rol `anon` de Supabase) — solo para darle feedback inmediato
al usuario ("✓ Código válido") sin comprometerse a nada todavía. Nunca
modifica datos.

`redeem_invitation_code` se llama al final, **con sesión ya creada**
(necesita `auth.uid()` para saber a quién hacer ADMIN). Vuelve a
validar el código desde cero — no confía en que el resultado del Paso 1
siga vigente, porque entre medio pudo pasar cualquier cosa (el código
expiró, alguien más lo usó). Usa `select ... for update` para bloquear
la fila del código mientras dura la operación: si dos personas envían
el mismo código de un solo uso al mismo milisegundo, la segunda espera
a que la primera termine, y para cuando le toca, `used_count` ya está
al máximo — la rechaza limpiamente en vez de dejar pasar a las dos.

### Cómo se guarda el código (y por qué no es como una contraseña)

Se guarda `code_hash` (SHA-256), nunca el código en texto plano. La
diferencia con hashear una contraseña: una contraseña la elige un
humano (baja entropía — `123456`, nombres, fechas), por eso se usan
hashes **lentos** a propósito (bcrypt, argon2), para que probar millones
de combinaciones sea costoso. Un código de invitación
(`NX-7K4P-92LM`) lo genera la máquina con `crypto.getRandomValues()` —
alta entropía, no hay "diccionario de códigos típicos" que probar — así
que un hash rápido como SHA-256 ya es suficiente. Usar bcrypt acá sería
complejidad sin ningún beneficio real.

El código en texto plano **nunca llega a viajar por la red hacia
Supabase**: se genera y se hashea en el propio navegador del SUPERADMIN
(`src/services/invitations.ts`), y solo el hash se manda a guardar. El
código se muestra una única vez, en el modal de generación — ni
siquiera el SUPERADMIN puede volver a verlo después (por diseño: la
tabla `invitations` en la interfaz muestra "•••• (oculto)" para
cualquier código ya generado).

### Protección contra fuerza bruta — honesta sobre sus límites

`validate_invitation_code` cuenta cuántos intentos fallidos hubo desde
la misma IP en los últimos 15 minutos (tabla `invitation_attempts`) y
corta en 10. La IP sale de los headers que Supabase ya le pasa a
cualquier función de Postgres — no hace falta una Edge Function aparte
para esto. **Limitación real**: varias personas detrás de la misma IP
compartida (oficina, wifi público) comparten el mismo contador, y
alguien con muchas IPs distintas puede evadirlo. Es una primera capa
razonable para esta etapa del proyecto, no una solución de nivel
empresarial — si más adelante hay abuso real, ahí se justifica algo más
(captcha, límites de Supabase Auth, Cloudflare).

### Qué pasa si el email de confirmación está activado

Si tu proyecto de Supabase tiene "Confirmar email" activado en Auth,
`signUp()` no entrega sesión hasta que el usuario confirma su correo —
y sin sesión, `redeem_invitation_code` no puede ejecutarse todavía
(`auth.uid()` sería `null`). Para no perder el registro a mitad de
camino, `RegisterPage.tsx` guarda el código + nombre de empresa + tipo
de negocio en `localStorage` (dato no sensible, no es una contraseña)
y `useCompany.tsx` lo detecta y termina el canje automáticamente en el
primer login, sin que el usuario tenga que volver a escribir nada.

### Archivos

| Archivo | Propósito |
|---|---|
| `database/migration_invitations.sql` | **Nuevo.** Tablas `invitations`/`invitation_attempts`, elimina `companies_insert_authenticated`, crea `validate_invitation_code`/`redeem_invitation_code`, agrega `profiles.phone` |
| `database/schema.sql`, `database/policies.sql` | Reflejan lo mismo para instalaciones nuevas |
| `src/types/invitation.ts`, `src/services/invitations.ts` | **Nuevos.** Generación/hash del código en el navegador, CRUD de invitaciones, wrappers de las 2 funciones RPC, manejo de la redención pendiente |
| `src/pages/auth/RegisterPage.tsx` | Reescrito como wizard de 4 pasos (código → empresa → administrador → confirmación) |
| `src/pages/onboarding/NoCompanyPage.tsx` | **Nuevo**, reemplaza a `SelectBusinessTypePage.tsx` (eliminado) — pantalla de recuperación, no de autoservicio |
| `src/hooks/useCompany.tsx` | +lógica para completar una redención pendiente en el primer login |
| `src/hooks/useIsSuperAdmin.ts` | **Nuevo.** Guardia para las rutas `/superadmin/*` |
| `src/pages/superadmin/*` | **Nuevo.** Panel completo: `SuperAdminLayout`, `SuperAdminDashboardPage`, `CompaniesPage`, `PlatformUsersPage`, `InvitationsPage` + `GenerateInvitationModal` (todos reales), `AuditPage` (real, vista global de `audit_logs`), `PlansPage`/`ModulesPage`/`ActivityPage`/`SuperAdminSettingsPage` (placeholders honestos — explican en su propio código por qué no son reales todavía) |
| `src/services/superadmin.ts` | **Nuevo.** `listAllCompanies` (con conteo de usuarios), `listAllProfiles` |
| `src/services/auditLogs.ts` | +`listAllAuditLogs` (vista global, sin filtrar por empresa) |
| `src/services/companies.ts` | Se eliminó `createCompany` (ya no existe la creación de autoservicio) |
| `src/App.tsx` | Rutas `/superadmin/*` con su propio layout; `/onboarding` ahora usa `NoCompanyPage` |
| `docs/seguridad.md` | Tabla de RLS actualizada + nueva sección explicando esta fase |

### Cómo probarlo

1. Corre `database/migration_invitations.sql` en el SQL Editor de Supabase.
2. Convierte tu propio usuario en SUPERADMIN (una sola vez, a mano):
   ```sql
   update profiles set is_superadmin = true where id = 'tu-user-id';
   ```
   (tu `user-id` lo ves en Supabase → Authentication → Users).
3. Entra a NEXA360, ve a `/superadmin` (o el link "Volver a mi empresa"
   al revés — como SUPERADMIN puedes navegar a esa URL directamente).
4. En "Invitaciones", genera un código — cópialo, es tu única
   oportunidad de verlo en texto plano.
5. Abre una ventana de incógnito (para no mezclar tu sesión de
   SUPERADMIN), ve a `/register`, pega el código, y completa el wizard
   de 4 pasos con datos de una empresa nueva.
6. Vuelve a "Invitaciones" con tu sesión de SUPERADMIN: el código debe
   aparecer como "Usado" (1/1), con el nombre de la empresa recién
   creada en la columna correspondiente.
7. Intenta registrarte de nuevo con el mismo código — debe rechazarlo
   con "Este código ya fue utilizado."

### Qué deberías aprender

- **Eliminar una política puede ser la corrección de seguridad más
  importante de todas** — a veces "arreglar" algo es quitar el permiso
  que sobraba, no agregar más código encima.
- **Validar dos veces (Paso 1 y en el canje final) no es duplicar
  trabajo por descuido** — es la diferencia entre "verificar" (dar
  feedback rápido al usuario) y "autorizar" (la decisión que de verdad
  importa, tomada en el último momento posible, sobre el estado más
  actual de los datos). Es un patrón general en seguridad: time-of-check
  distinto de time-of-use, y confiar solo en el primero es un error
  común.
- **No todo hash es igual** — la elección entre un hash rápido (SHA-256)
  y uno lento (bcrypt) depende de la entropía de lo que estás
  protegiendo, no es "siempre usa el más seguro posible".

### Addendum — auditoría completa (los 5 eventos que pediste)

Tu pedido original (sección 23 del brief) listaba 5 eventos a auditar:
`INVITATION_CREATED`, `INVITATION_USED`, `INVITATION_DISABLED`,
`REGISTRATION_SUCCESS`, `REGISTRATION_FAILED`. Los primeros 3 ya
quedaron en la primera pasada de esta fase; los últimos 2 necesitaron un
ajuste adicional que vale la pena que entiendas:

- **`registration.failed`** solo se registra cuando el canje de la
  invitación falla DESPUÉS de que la cuenta ya existe (alguien más usó
  el mismo código mientras tanto, expiró justo en ese momento, etc.) —
  ahí sí hay un usuario autenticado real a quien atribuirle el evento.
  Un fallo del `signUp()` en sí (contraseña débil, correo ya
  registrado) **no** se audita en `audit_logs`: en ese punto no existe
  ningún usuario todavía, no hay `user_id` real al que atribuirle el
  evento, y guardar un log sin dueño sería inútil (no se podría cruzar
  con nada). Supabase Auth ya guarda sus propios registros de esos
  intentos a nivel de autenticación.
- **`registration.success`** deliberadamente NO se creó como evento
  aparte — `invitation.used` (que ya se registraba dentro de
  `redeem_invitation_code`) es exactamente el mismo momento visto desde
  otro ángulo. Registrarlo dos veces con nombres distintos solo
  ensuciaría el historial de auditoría sin agregar información nueva.
- Para que `registration.failed` se pudiera guardar, hizo falta ampliar
  la política de `insert` de `audit_logs`: antes solo un miembro de una
  empresa (o un SUPERADMIN) podía escribir un log. Se agregó
  `company_id is null and user_id = auth.uid()` — un usuario recién
  registrado, todavía sin empresa, ahora puede registrar SU PROPIO
  evento. Esto no afecta quién puede **leer** logs (esa política no
  cambió), solo abre una puerta de escritura muy angosta y específica.

---

## Fase 23 — Arreglar a dónde va un SUPERADMIN después de iniciar sesión

### Qué se hizo

Bug real, no percepción: `LoginPage.tsx` mandaba a **todo el mundo** a
`/dashboard` después de iniciar sesión, sin mirar el rol. Un SUPERADMIN
no tiene empresa (por diseño, desde la Fase 22) — así que `ProtectedRoute`
lo interceptaba antes de llegar a `/dashboard` y lo mandaba a
`/onboarding`, que ahora es `NoCompanyPage` ("tu cuenta no tiene una
empresa asociada, contacta al administrador que te invitó"). Un
SUPERADMIN real leyendo ese mensaje sobre sí mismo es exactamente el
síntoma que reportaste.

El arreglo tenía que hacerse en 3 lugares, no solo en el Login — porque
hay 3 formas distintas de "llegar" a la app ya logueado:

1. **Login** (`LoginPage.tsx`): después de `signIn()`, consulta
   `profiles.is_superadmin` y navega a `/superadmin` o `/dashboard`
   según corresponda — no asume nada guardado en `localStorage`.
2. **Refrescar la página / pegar una URL estando ya logueado**
   (`ProtectedRoute` en `App.tsx`): si no hay empresa, ahora mira si es
   SUPERADMIN antes de decidir a dónde mandarlo (`/superadmin` en vez
   de `/onboarding`).
3. **Entrar a `/login` ya con sesión activa** (`PublicOnlyRoute`): antes
   redirigía siempre a `/dashboard`; ahora también consulta el rol.

`OnboardingRoute` (la que protege `NoCompanyPage`) también se ajustó:
si un SUPERADMIN de alguna forma llega ahí, lo saca hacia `/superadmin`
en vez de mostrarle el mensaje de "registro incompleto", que no aplica
a su caso.

### Archivos

| Archivo | Propósito |
|---|---|
| `src/pages/auth/LoginPage.tsx` | Consulta `is_superadmin` después de `signIn()` y navega según corresponda |
| `src/App.tsx` | `ProtectedRoute`, `OnboardingRoute` y `PublicOnlyRoute` ahora usan `useIsSuperAdmin()` para decidir el destino cuando no hay empresa |

### Cómo probarlo

1. Inicia sesión con tu cuenta SUPERADMIN — debe llevarte directo a
   `/superadmin`, no a una pantalla de "no tienes empresa".
2. Estando ahí, refresca la página (F5) — debe quedarte en
   `/superadmin`, no rebotarte a ningún lado.
3. Cierra sesión y vuelve a `/login` manualmente mientras aún tuvieras
   una sesión activa en otra pestaña — también debe respetar el rol.
4. Con una cuenta normal (ADMIN de una empresa), confirma que sigue
   entrando a `/dashboard` como siempre — este cambio no le afecta.

### Qué deberías aprender

El bug no estaba en un solo lugar porque **hay más de una puerta de
entrada a una app autenticada** — no solo el formulario de Login. Cada
guardia de ruta (`ProtectedRoute`, `OnboardingRoute`, `PublicOnlyRoute`)
toma su propia decisión de a dónde mandar a alguien, así que arreglar
solo el Login habría dejado el bug vivo en cuanto alguien refrescara la
página. Es la misma lección de "validar en un solo lugar no alcanza"
que ya vimos en la Fase 22 con `validate_invitation_code` vs.
`redeem_invitation_code`, aplicada ahora a navegación en vez de a
seguridad de datos.

---

## Fase 24 — Suspender/Activar empresas de verdad

### Qué se hizo

Decidiste mantener "USUARIO" (no renombrar a "COLABORADOR") y mantener
`company_users` separado de `profiles` — ambas decisiones confirmadas,
sin cambios de esquema por esos dos puntos.

Se agregó "Administrador" al panel de Empresas y un botón
Suspender/Activar real — no solo un cambio de etiqueta. La parte
importante no es el botón: es que `companies.is_active` existía desde
la Fase 5 pero **nada lo revisaba**. Antes de esta fase, suspender una
empresa era pura decoración — sus usuarios seguían con acceso normal a
todo.

### Cómo se corrigió (el cambio real está en 2 funciones, no en 20 tablas)

`is_company_member()` e `is_company_admin()` — las dos funciones que
prácticamente TODAS las políticas RLS del proyecto usan (clientes,
citas, servicios, recordatorios, mascotas, vehículos, matrículas...) —
ahora exigen también `companies.is_active = true`. Un solo cambio, en
un solo lugar, corta el acceso en todas las tablas del proyecto a la
vez. La alternativa hubiera sido agregar `and company.is_active` a cada
política de cada tabla una por una — lo mismo, pero copiado 40 veces
con 40 oportunidades de olvidarse en alguna.

También hizo falta ampliar la política de `insert` de `audit_logs`:
un SUPERADMIN suspende empresas de las que normalmente NO es miembro
(`is_company_member()` da falso para él), así que sin agregar
`company_id is not null and is_superadmin()` a esa política, el propio
log de "se suspendió esta empresa" se hubiera rechazado por RLS.

### Archivos

| Archivo | Propósito |
|---|---|
| `database/migration_company_suspension.sql` | **Nuevo.** Redefine `is_company_member`/`is_company_admin` con el chequeo de `is_active`, y amplía la política de insert de `audit_logs` |
| `database/policies.sql` | Refleja lo mismo para instalaciones nuevas |
| `src/services/superadmin.ts` | +`updateCompanyStatus`, `listAllCompanies` ahora también trae el nombre del administrador (`owner_name`, join contra `profiles`) |
| `src/pages/superadmin/CompaniesPage.tsx` | +columna "Administrador", +botón Suspender/Activar con confirmación y auditoría |

### Cómo probarlo

1. Corre `database/migration_company_suspension.sql` en el SQL Editor.
2. Desde `/superadmin/companies`, suspende una empresa de prueba.
3. Con una cuenta ADMIN/USUARIO de ESA empresa (en otra pestaña o
   incógnito), intenta entrar o refrescar — debería caer en la pantalla
   de "tu cuenta no tiene una empresa asociada" (ver limitación conocida
   más abajo).
4. Vuelve a activarla desde el panel — la misma cuenta debería recuperar
   acceso normal sin tener que cerrar sesión.

### Qué deberías aprender

- **Un dato que existe en la base de datos no significa que esté
  "implementado"** — `is_active` llevaba desde la Fase 5 sin que ninguna
  política lo mirara. Es fácil, revisando solo el esquema, asumir que
  algo funciona porque la columna está ahí.
- **Arreglar en el punto de mayor apalancamiento**: cuando muchas
  políticas comparten una función auxiliar, corregir la función corrige
  todas las políticas a la vez. Vale la pena identificar esos puntos
  centrales antes de salir a parchear tabla por tabla.
- **Limitación honesta documentada, no escondida**: un usuario de una
  empresa suspendida ve el mismo mensaje que alguien sin empresa nunca
  asociada — no es ideal para la experiencia, pero el bloqueo de acceso
  (lo que de verdad importa) ya es real. Se documentó en
  `docs/seguridad.md` en vez de dejarlo como una sorpresa para descubrir
  después.

---

## Fase 25 — Invitar usuarios a una empresa (tipo B, distinta de la Fase 22)

### Qué se hizo

La invitación tipo A (Fase 22) la genera un SUPERADMIN y crea una
**empresa nueva**. Esta es la tipo B: el ADMIN de una empresa YA
existente invita a alguien puntual (nombre, correo, rol) a **su**
empresa. Flujos, tablas y funciones completamente separados a
propósito — tu propio pedido lo remarcaba (sección 14: "no confundir
ambos procesos").

Antes de programar, te expliqué por qué el token se guarda hasheado
(mismo criterio que los códigos de empresa: alta entropía generada por
la máquina, no hace falta un hash lento tipo bcrypt) y por qué este
token es más largo y no "legible" — va dentro de un link que se hace
clic, no un código que se escribe a mano.

### El flujo completo

```
ADMIN de "Clínica Sonrisa" → Configuración → Usuarios → "Invitar usuario"
   → nombre + correo + rol → se genera un token, se hashea en el
     navegador, se guarda el hash → se muestra un LINK completo una
     sola vez (no hay envío de correo real conectado todavía — se
     entrega el link a mano, igual que con los códigos de empresa)
Invitado → abre el link (/accept-invite?token=...)
   → validate_user_invitation() confirma que es válido y muestra a qué
     empresa y con qué rol
   → si no tiene cuenta: la crea ahí mismo (correo fijo, no editable)
   → si ya tiene cuenta: inicia sesión ahí mismo
   → accept_user_invitation() compara su correo real contra el
     invitado — si coincide, lo agrega a company_users con el rol
     indicado
   → Dashboard de esa empresa
```

### La protección que este tipo de invitación necesita y la otra no

Un código de empresa (Fase 22) es anónimo — cualquiera con el código
puede usarlo, sin importar quién sea. Una invitación de usuario está
dirigida a **una persona específica**, así que hace falta una
verificación extra: `accept_user_invitation()` lee el correo real de
quien está aceptando desde `auth.users` (una tabla que solo una función
`SECURITY DEFINER` puede leer — nunca el frontend) y lo compara contra
`invited_email`. Si no coinciden, rechaza el canje. Sin esto, cualquiera
que consiguiera el link (reenviado por error, copiado de una
conversación) podría entrar a la empresa con el rol que sea, sin
importar para quién era.

### Por qué "Reenviar" no muestra el mismo link de nuevo

El token en texto plano se pierde apenas se genera — es la misma regla
de "se muestra una sola vez" que ya aplicamos a los códigos de empresa.
"Reenviar" en `UsersTab.tsx` en realidad **cancela la invitación vieja y
crea una nueva** (nuevo token, nuevos 7 días), no reenvía nada — el
nombre del botón describe la intención del ADMIN ("quiero que esta
persona reciba otra oportunidad"), no literalmente "repetir el mismo
mensaje".

### Archivos

| Archivo | Propósito |
|---|---|
| `database/migration_user_invitations.sql` | **Nuevo.** Tabla `user_invitations`, RLS, `validate_user_invitation`/`accept_user_invitation` |
| `database/schema.sql`, `database/policies.sql` | Reflejan lo mismo para instalaciones nuevas |
| `src/types/userInvitation.ts`, `src/services/userInvitations.ts` | **Nuevos.** Generación/hash del token, CRUD, wrappers de las 2 funciones RPC, manejo de aceptación pendiente (mismo patrón que la Fase 22 para "Confirmar email" activado) |
| `src/pages/auth/AcceptInvitePage.tsx` | **Nuevo.** Ruta pública `/accept-invite` — valida el token y deja iniciar sesión o crear cuenta ahí mismo, con el correo fijo |
| `src/pages/settings/InviteUserModal.tsx` | **Nuevo.** Modal de "Invitar usuario", muestra el link generado una sola vez |
| `src/pages/settings/UsersTab.tsx` | Botón "Invitar usuario" ya real (antes decía "Próximamente"), + tabla de invitaciones enviadas con Cancelar/Reenviar |
| `src/hooks/useCompany.tsx` | +misma lógica de "completar en el primer login" que ya existía para redimir un código de empresa, ahora también para aceptar una invitación de usuario |
| `src/App.tsx` | Ruta `/accept-invite`, sin `ProtectedRoute` ni `PublicOnlyRoute` — la página decide sola qué mostrar según haya sesión o no |

### Cómo probarlo

1. Corre `database/migration_user_invitations.sql` en el SQL Editor.
2. Con tu cuenta ADMIN, ve a Configuración → Usuarios → "Invitar
   usuario" — usa un correo que NO sea el tuyo (necesitas poder
   registrarte con él después).
3. Copia el link generado, ábrelo en una ventana de incógnito.
4. Elige "Soy nuevo", crea la cuenta — debe unirte automáticamente a la
   empresa con el rol que elegiste.
5. Vuelve a tu sesión ADMIN: la invitación debe verse como "Aceptada" en
   la tabla, y la nueva persona debe aparecer en la lista de usuarios de
   arriba.
6. Prueba también: generar una invitación y "Cancelarla" antes de que
   nadie la use — el link ya no debería funcionar.

### Qué deberías aprender

- **Dos "invitaciones" que suenan parecido pueden ser conceptos
  completamente distintos** — mismo patrón técnico de fondo (token
  hasheado, validar-y-canjear en dos pasos), pero un propósito de
  negocio diferente amerita tablas y funciones separadas, no forzar una
  sola tabla a servir para dos cosas con un `if` extra.
- **Cuándo SÍ hace falta leer `auth.users`**: normalmente nunca se toca
  esa tabla desde el frontend (por eso `profiles` existe, para no
  necesitarlo). Pero comparar "¿el correo de quien acepta es el correo
  invitado?" es exactamente el tipo de chequeo que solo tiene sentido
  hacer del lado del servidor, con una función que sí tiene permiso de
  mirar esa tabla — y ni siquiera devuelve el correo al frontend, solo
  un `true`/`false` disfrazado de `success`.
