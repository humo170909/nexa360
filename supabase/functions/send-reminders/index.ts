// Edge Function: send-reminders
// ============================================================
// Corre en el servidor de Supabase (Deno), NUNCA en el navegador del
// usuario — por eso es el único lugar del proyecto donde es seguro usar
// la SERVICE_ROLE_KEY (que se salta RLS a propósito) y la API key de
// Resend. Ninguna de las dos llega jamás al frontend.
//
// Qué hace: busca recordatorios con status="pendiente" cuya fecha de
// envío ya llegó, les manda el email real por Resend, y actualiza su
// estado a "enviado" o "fallido". La llama periódicamente un cron job
// de Postgres (ver database/migration_reminder_cron.sql), no el
// navegador de nadie.
//
// Seguridad: esta función NO verifica el JWT de un usuario normal
// (verify_jwt = false en supabase/config.toml, porque quien la llama es
// el propio Postgres, no una persona logueada) — en su lugar exige un
// secreto compartido (CRON_SECRET) en el header "x-cron-secret". Sin
// ese secreto, cualquiera que encuentre la URL podría disparar el envío
// de todos los recordatorios pendientes de todas las empresas.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
// Mientras no verifiques un dominio propio en Resend, solo puedes enviar
// desde esta dirección de prueba (y solo a la casilla con la que te
// registraste en Resend). Cuando verifiques tu dominio, cambia esto por
// algo como "recordatorios@tudominio.com".
const FROM_ADDRESS = Deno.env.get("REMINDERS_FROM_ADDRESS") ?? "onboarding@resend.dev";

interface ReminderRow {
  id: string;
  send_at: string;
  appointment: {
    starts_at: string;
    client: { full_name: string; email: string | null } | null;
    service: { name: string } | null;
  } | null;
}

function buildEmail(reminder: ReminderRow) {
  const appointment = reminder.appointment;
  const clientName = appointment?.client?.full_name ?? "Cliente";
  const serviceName = appointment?.service?.name ?? "tu cita";
  const startsAt = appointment ? new Date(appointment.starts_at) : null;
  const dateLabel = startsAt
    ? startsAt.toLocaleString("es", { dateStyle: "full", timeStyle: "short" })
    : "";

  return {
    subject: `Recordatorio: ${serviceName}`,
    html: `<p>Hola ${clientName},</p><p>Te recordamos que tienes una cita (${serviceName}) el ${dateLabel}.</p>`,
  };
}

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: reminders, error } = await supabase
    .from("reminders")
    .select(
      "id, send_at, appointment:appointments(starts_at, client:clients(full_name, email), service:services(name))",
    )
    .eq("status", "pendiente")
    .eq("channel", "email")
    .lte("send_at", new Date().toISOString())
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const reminder of (reminders ?? []) as unknown as ReminderRow[]) {
    const email = reminder.appointment?.client?.email;

    if (!email) {
      failed++;
      await supabase.from("reminders").update({ status: "fallido" }).eq("id", reminder.id);
      continue;
    }

    const { subject, html } = buildEmail(reminder);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to: email, subject, html }),
    });

    if (response.ok) {
      sent++;
      await supabase
        .from("reminders")
        .update({ status: "enviado", sent_at: new Date().toISOString() })
        .eq("id", reminder.id);
    } else {
      failed++;
      await supabase.from("reminders").update({ status: "fallido" }).eq("id", reminder.id);
    }
  }

  return new Response(JSON.stringify({ processed: reminders?.length ?? 0, sent, failed }), {
    headers: { "Content-Type": "application/json" },
  });
});
