# Notificaciones y Automatizaciones — NEXA360

> Módulo a implementar en las Fases 12–14. Este documento describe el plan
> conceptual acordado; el detalle técnico se completa cuando lleguemos ahí.

## Recordatorios (Fase 12)

Primera versión: **solo email**. No se implementa WhatsApp todavía.

Ejemplo de flujo:

```
Cita: 15/09/2026, 16:00
Recordatorio: 24 horas antes
Mensaje: "Hola Juan, te recordamos que tienes una cita mañana a las 4:00 p. m."
```

## Automatizaciones (Fase 14)

Lógica simple, sin constructor visual complejo:

```
EVENTO → CONDICIÓN → ACCIÓN
```

Ejemplos:

- Cita creada → 24 horas antes → enviar email.
- Servicio realizado → 30 días después → enviar recordatorio de seguimiento.

Diseño de referencia elegido (Fase 1): pantalla de **lista de flujos +
canvas de edición + historial de ejecución**.

## Proveedor de email (Fase 13)

Se preparará la arquitectura para usar un proveedor externo (ej. Resend).
Reglas:

- La API key del proveedor de email vive únicamente en variables de entorno
  del backend/función serverless — **nunca en el frontend**.
- El envío real de emails no ocurre desde el navegador del usuario.

## WhatsApp

No se implementa todavía. En la interfaz aparece como "WhatsApp — Próximamente"
(sin simular una integración que no existe). Se deja la arquitectura
preparada para agregarlo más adelante como un canal adicional del mismo
sistema de automatizaciones.

## Pendiente

- Elección concreta del proveedor de email y su integración (Fase 13).
