-- ============================================================
-- NEXA360 — Migración: cron job que dispara el envío real de
-- recordatorios (Fase 21)
-- ============================================================
-- Antes de correr ESTE archivo, corre UNA VEZ (y solo una vez) el
-- siguiente comando en el SQL Editor, reemplazando el valor por el
-- secreto que te di en el chat (no lo pegues en ningún archivo del
-- repositorio — vault.create_secret lo guarda cifrado dentro de
-- Supabase, nunca en tu código ni en GitHub):
--
--   select vault.create_secret(
--     'PEGA_AQUI_TU_CRON_SECRET',
--     'cron_secret_send_reminders'
--   );
--
-- Ese mismo valor también debe quedar configurado como secreto de la
-- Edge Function (ver docs/notificaciones.md, sección "Desplegar").
--
-- Recién después de eso, corre este archivo.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Cada 10 minutos, le pide a la Edge Function "send-reminders" que revise
-- si hay recordatorios pendientes cuya fecha de envío ya llegó. El
-- secreto sale de Vault en el momento de ejecutar el cron, nunca queda
-- escrito en texto plano en esta definición.
select cron.schedule(
  'send-reminders-every-10-min',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://ogfdrizmfqufodxnfxvt.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'cron_secret_send_reminders'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Para revisar que el cron corre de verdad (después de esperar ~10 min):
-- select * from cron.job_run_details order by start_time desc limit 5;

-- Para desactivarlo si algo sale mal:
-- select cron.unschedule('send-reminders-every-10-min');
