# Despliegue en Vercel — NEXA360

> Esto se ejecuta recién en la **Fase 17**, cuando el proyecto tenga
> funcionalidad real que valga la pena publicar.

## 1. Subir el proyecto a GitHub

Esta máquina sí tiene Git instalado. Cuando llegue el momento:

```powershell
cd "nexa360"
git init
git add .
git status   # confirma que NO aparezca .env.local en la lista
git commit -m "Estado inicial NEXA360"
git remote add origin https://github.com/TU-USUARIO/nexa360.git
git branch -M main
git push -u origin main
```

Si `git push` pide autenticación, GitHub ya no acepta contraseña de la
cuenta directamente — se necesita un **Personal Access Token** (Settings →
Developer settings → Personal access tokens) o `gh auth login` (GitHub CLI).

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
