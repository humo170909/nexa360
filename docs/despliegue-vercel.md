# Despliegue en Vercel — NEXA360

> **Estado**: ya desplegado — https://nexa360-navy.vercel.app/

## 1. Subir el proyecto a GitHub — ya hecho ✓

El repositorio ya está en `https://github.com/humo170909/nexa360`, con
todo el trabajo hasta la Fase 27 publicado. No hay nada que hacer acá,
solo confirma con `git status` (dentro de `nexa360/`) que no quede
ningún commit local sin subir antes de conectar Vercel — un deploy
siempre construye desde lo que ya está en GitHub, no desde tu disco.

## 2. Conectar GitHub con Vercel

1. Cuenta en https://vercel.com (puedes entrar con tu cuenta de GitHub).
2. **"Add New" → "Project"** → selecciona el repositorio `nexa360`.
3. Vercel detecta que es un proyecto Vite y configura solo el build command
   (`npm run build`) y el output directory (`dist`).

## 3. Configurar variables de entorno en Vercel

En *Settings → Environment Variables*:

```
VITE_SUPABASE_URL=<tu-url-real-de-supabase>
VITE_SUPABASE_ANON_KEY=<tu-anon-key-real>
```

Nunca pegues ahí la `SUPABASE_SERVICE_ROLE_KEY`.

## 4. Deploy

Cada `git push` a la rama principal dispara un nuevo deploy automático.
Vercel entrega una URL pública (`nexa360.vercel.app` o similar).

## 4b. `vercel.json` — obligatorio para una SPA de React Router

Sin esto, refrescar la página (o entrar directo) en cualquier ruta que
no sea `/` — `/dashboard`, `/superadmin`, `/login` — da un **404 de
Vercel**, no un error de la app: Vercel busca un archivo real en ese
path, no lo encuentra (todo el ruteo lo hace React Router, en el
navegador), y devuelve 404 antes de que React llegue a cargar. El
archivo `vercel.json` en la raíz del proyecto le dice a Vercel que
cualquier ruta sin archivo coincidente se sirva como `index.html`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Los archivos reales (`/assets/index-xxxx.js`, etc.) se siguen sirviendo
normalmente — Vercel revisa primero si existe un archivo en ese path
antes de aplicar el rewrite, así que esto no rompe la carga de tu CSS/JS.

## 5. Verificar

Abre la URL. Si algo falla, revisa la pestaña "Deployments" en Vercel — ahí
está el log completo del build.

## 6. Errores comunes

| Error | Causa probable |
|---|---|
| Build falla por variables de entorno faltantes | Olvidaste configurarlas en Vercel (paso 3) |
| Pantalla en blanco tras el deploy | Revisa la consola del navegador (F12) — normalmente una URL de Supabase mal copiada |
