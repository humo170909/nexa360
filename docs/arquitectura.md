# Arquitectura — NEXA360

## Visión general

NEXA360 es una sola aplicación web (no una app por industria) que sirve a
muchas empresas ("tenants") de distintos rubros. Cada empresa ve una interfaz
adaptada a su tipo de negocio, pero todas corren sobre el mismo código.

```
NEXA360 (una sola app)
│
├── Empresa A (óptica)      → ve: Clientes, Agenda, Medidas visuales, Ventas...
├── Empresa B (barbería)    → ve: Clientes, Agenda, Servicios...
├── Empresa C (veterinaria) → ve: Propietarios, Mascotas, Tratamientos...
└── Empresa D (colegio)     → ve: Estudiantes, Docentes, Grados...
```

Los datos de cada empresa están completamente aislados entre sí (ver
`seguridad.md`), y qué módulos/campos se muestran depende de una
configuración declarativa, no de código distinto por empresa.

## Stack tecnológico

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend | React 19 + TypeScript | Tipado fuerte, ecosistema maduro |
| Build | Vite | Configuración mínima, arranque rápido |
| Estilos | Tailwind CSS v4 | Tokens de diseño centralizados, sin CSS a mano |
| Backend / DB | Supabase (PostgreSQL) | Base de datos + autenticación + Row Level Security incluidos, sin servidor propio que mantener |
| Hosting | Vercel | Deploy automático desde GitHub |
| Repositorio | GitHub | Control de versiones |

Deliberadamente **no** se usa: microservicios, Docker/Kubernetes, backend
propio (Node/Express separado) — Supabase cubre esa necesidad sin agregar
piezas de infraestructura que mantener.

## Estructura de carpetas

```
nexa360/
├── src/
│   ├── components/
│   │   ├── ui/        → piezas de diseño genéricas (Button, Input, Badge, Modal)
│   │   └── layout/     → Sidebar, Navbar, AppLayout
│   ├── pages/          → una carpeta por sección (auth, dashboard, clients...)
│   ├── layouts/         → AuthLayout (login/registro/recuperar contraseña)
│   ├── hooks/            → useAuth, useCompany, useBusinessType
│   ├── services/          → funciones que hablan con Supabase
│   ├── lib/                → cliente de Supabase, utilidades genéricas
│   ├── types/                → interfaces TypeScript por entidad
│   ├── config/                 → businessTypes.ts (el corazón de la plataforma configurable)
│   └── assets/
├── database/           → schema.sql, policies.sql
└── docs/                → esta carpeta
```

Ver `MANUAL-DESARROLLADOR.md` para el detalle de qué se ha construido en
cada fase.

## Multi-tenant: cómo se aíslan los datos

Cada tabla operativa (`clients`, `services`, `appointments`, `reminders`)
tiene una columna `company_id`. Un usuario pertenece a una o más empresas a
través de la tabla `company_users`. Las políticas de Row Level Security en
Supabase comparan el `company_id` de cada fila contra las empresas del
usuario autenticado — el aislamiento ocurre en la base de datos, no
depende de que el frontend "se porte bien". Detalle completo en
`seguridad.md` y `supabase.md`.

## Configuración dinámica por tipo de negocio

`src/config/businessTypes.ts` define, para cada tipo de negocio (óptica,
veterinaria, colegio, etc.), qué módulos adicionales aparecen en el menú y
cómo se llama la entidad principal. Componentes como `Sidebar` y
`DashboardPage` leen esta configuración — no existen bifurcaciones de
código por tipo de negocio dentro de los componentes.

## Roles

- **SUPERADMIN**: administra la plataforma NEXA360 completa (todas las empresas).
- **ADMIN**: administra su propia empresa.
- **USUARIO**: usa los módulos que su empresa le habilita.

## Estado actual

Ver `MANUAL-DESARROLLADOR.md` — completadas las Fases 1 a 9 (análisis,
estructura, mapeo de mockups, toolchain, modelo de datos + RLS,
autenticación, onboarding multiempresa, Dashboard real, módulo de
Clientes). Fase 10 (Agenda) es la siguiente.
