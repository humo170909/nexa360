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
- [Incidente resuelto — colisión de nombres en Tailwind v4](#incidente-resuelto--colisión-de-nombres-en-tailwind-v4)
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

## Próximos pasos

**Fase 10 — Agenda**: vista de calendario (día/semana/mes), crear cita
(cliente, servicio, fecha, hora, profesional, observaciones), cambiar
estado. Aún no iniciada.
