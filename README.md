# NEXA360

Plataforma SaaS multiempresa (multi-tenant) para micro y pequeñas empresas de
distintos rubros (odontología, ópticas, barberías, veterinarias, talleres,
colegios, academias, etc.), construida sobre un núcleo común configurable por
tipo de negocio.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- Supabase (base de datos + autenticación)
- Vercel (hosting) — se configura en Fase 17

## Requisitos

- Node.js 20+
- npm

## Empezar

```bash
npm install
cp .env.example .env.local   # y completa las variables (ver docs/supabase.md)
npm run dev
```

## Estructura del proyecto

Ver `docs/arquitectura.md` para la explicación completa de cada carpeta
bajo `src/`.

## Estado

Proyecto en desarrollo por fases. Ver `MANUAL-DESARROLLADOR.md` para el
registro de qué se ha hecho en cada fase, cómo probarlo, y el incidente de
Tailwind ya resuelto.
