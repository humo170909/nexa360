# Notificaciones y Automatizaciones — NEXA360

## Recordatorios por email (Fase 21) — implementado

El envío real usa una **Supabase Edge Function** (`supabase/functions/send-reminders/`),
no el navegador del usuario ni un servidor propio. Un cron job de
Postgres la llama cada 10 minutos; ella busca recordatorios con
`status = 'pendiente'` cuya `send_at` ya pasó, envía el email real por
[Resend](https://resend.com), y actualiza el estado a `enviado` o
`fallido`.

```
Postgres (cron, cada 10 min)
   │  net.http_post(...) con el secreto guardado en Vault
   ▼
Edge Function "send-reminders" (Deno, corre en el servidor de Supabase)
   │  usa SERVICE_ROLE_KEY (salta RLS a propósito) + RESEND_API_KEY
   ▼
Resend API → email real al cliente
```

### Por qué una Edge Function y no codigo en el frontend

- La `SUPABASE_SERVICE_ROLE_KEY` y la API key de Resend son secretos que
  **nunca** deben llegar al navegador — si estuvieran en el código React,
  cualquiera podría verlas en las herramientas de desarrollador y usarlas
  para leer o borrar los datos de cualquier empresa, sin importar RLS.
- Una Edge Function corre en el servidor de Supabase, no en la máquina
  del usuario — es el único lugar seguro para usar esas claves.

### Desplegar (pasos que tienes que hacer tú)

1. **Crea una cuenta gratis en [resend.com](https://resend.com)** y
   copia tu API key (empieza con `re_`). Mientras no verifiques un
   dominio propio, solo puedes enviar a la casilla con la que te
   registraste — suficiente para probar, no para producción real.
2. **Instala/actualiza el CLI de Supabase** si no lo tienes:
   `npm install -g supabase` (o `npx supabase` para no instalarlo global).
3. **Inicia sesión y enlaza el proyecto** (una sola vez):
   ```powershell
   cd nexa360
   npx supabase login
   npx supabase link --project-ref ogfdrizmfqufodxnfxvt
   ```
4. **Configura los secretos de la función** (nunca van en `.env.local`
   ni en ningún archivo del repositorio — viven solo dentro de Supabase):
   ```powershell
   npx supabase secrets set RESEND_API_KEY=re_tu_api_key
   npx supabase secrets set CRON_SECRET=el_secreto_que_te_di_en_el_chat
   ```
5. **Despliega la función**:
   ```powershell
   npx supabase functions deploy send-reminders
   ```
6. **Activa el cron job**: sigue las instrucciones dentro de
   `database/migration_reminder_cron.sql` (primero guardas el mismo
   `CRON_SECRET` en Supabase Vault vía SQL Editor, después corres el
   resto del archivo).

### Cómo probarlo

Crea una cita para dentro de un par de minutos, prográmale un
recordatorio con fecha de envío en el pasado (para no esperar), y espera
hasta 10 minutos — revisa en "Recordatorios" que el estado cambie de
"Pendiente" a "Enviado", y revisa la bandeja de la casilla con la que te
registraste en Resend.

## WhatsApp

No se implementa todavía. En la interfaz aparece como
"WhatsApp — Próximamente" (sin simular una integración que no existe).
La arquitectura ya queda preparada para agregarlo como un canal más
dentro de la misma Edge Function el día que se decida construirlo.

## Automatizaciones (fase futura)

Lógica simple, sin constructor visual complejo:

```
EVENTO → CONDICIÓN → ACCIÓN
```

Ejemplos:

- Cita creada → 24 horas antes → enviar email (ya es lo que hace Fase 21).
- Servicio realizado → 30 días después → enviar recordatorio de seguimiento.

Diseño de referencia elegido (Fase 1): pantalla de **lista de flujos +
canvas de edición + historial de ejecución**. Sin iniciar todavía.
