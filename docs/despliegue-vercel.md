# Despliegue en Vercel — NEXA360

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

## 5. Verificar

Abre la URL. Si algo falla, revisa la pestaña "Deployments" en Vercel — ahí
está el log completo del build.

## 6. Errores comunes

| Error | Causa probable |
|---|---|
| Build falla por variables de entorno faltantes | Olvidaste configurarlas en Vercel (paso 3) |
| Pantalla en blanco tras el deploy | Revisa la consola del navegador (F12) — normalmente una URL de Supabase mal copiada |
