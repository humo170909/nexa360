# Invitaciones — NEXA360

NEXA360 tiene **dos sistemas de invitación completamente distintos**.
Se parecen en la mecánica (un código/token aleatorio, hasheado, que se
valida y se canjea), pero resuelven problemas diferentes. No mezclarlos
es la regla más importante de este documento.

| | Invitación de **empresa** | Invitación de **usuario** |
|---|---|---|
| ¿Quién la genera? | SUPERADMIN | ADMIN de una empresa ya existente |
| ¿Para qué sirve? | Crear una empresa **nueva** | Sumar a alguien a **una empresa que ya existe** |
| ¿A quién va dirigida? | A cualquiera que tenga el código (no se fija un correo) | A un correo **específico** |
| ¿Cómo se entrega? | Código corto, para escribir a mano (`NX-7K4P-92LM`) | Link largo, para hacer clic (`/accept-invite?token=...`) |
| Tabla | `invitations` | `user_invitations` |
| Fase en que se construyó | 22 | 25 |

---

## A. Invitación de empresa — "te autorizo a crear una empresa en NEXA360"

### ¿Quién genera una invitación?

Un SUPERADMIN, desde `/superadmin/invitations` → "Generar código".

### ¿Cómo se genera?

1. El SUPERADMIN elige fecha de expiración y cantidad de usos (por
   defecto: 1 uso).
2. El navegador genera un código aleatorio (`crypto.getRandomValues()`,
   formato `NX-XXXX-XXXX`) y lo **hashea ahí mismo**, antes de mandar
   nada a Supabase — solo el hash se guarda en la tabla `invitations`.
3. El código en texto plano se muestra **una sola vez**, en pantalla.
   Ni el propio SUPERADMIN puede volver a verlo después.

### ¿Para qué sirve?

Es la única forma de crear una empresa en NEXA360 — sin código válido,
no hay registro (`/register` exige el código como Paso 1, antes de
mostrar cualquier otro campo).

### ¿Cómo se entrega?

El SUPERADMIN se lo pasa al cliente por fuera de la aplicación (no hay
envío de correo automático conectado a esto) — WhatsApp, email manual,
en persona.

### ¿Cómo la acepta el usuario?

```
Cliente → /register
   → Paso 1: pega el código → se valida (validate_invitation_code)
   → Paso 2: nombre de empresa + tipo de negocio
   → Paso 3: nombre, correo, teléfono, contraseña → se crea la cuenta
   → redeem_invitation_code() vuelve a validar el código (pudieron
     pasar minutos) y esta vez SÍ crea la empresa
   → Dashboard
```

### ¿Qué ocurre después?

- El código pasa a `used_count: 1/1` (con el valor por defecto) y ya no
  se puede volver a usar.
- Queda registrado en Auditoría (`invitation.used`) qué empresa nació
  de ese código.
- Quien se registró queda automáticamente como `ADMIN` de la empresa
  nueva (lo hace un trigger de base de datos, `handle_new_company`).

---

## B. Invitación de usuario — "te invito a formar parte de mi empresa"

### ¿Quién genera una invitación?

El ADMIN de una empresa ya existente, desde Configuración → Usuarios →
"Invitar usuario".

### ¿Cómo se genera?

1. El ADMIN escribe nombre, correo y rol (ADMIN o USUARIO) de la
   persona que quiere invitar.
2. El navegador genera un token aleatorio (más largo que el código de
   empresa — va en un link, nadie lo escribe a mano) y lo hashea antes
   de mandarlo a Supabase.
3. Se muestra un **link completo** una sola vez: `https://.../accept-invite?token=...`.
   Expira en 7 días.

### ¿Para qué sirve?

Para sumar colaboradores a una empresa que ya existe, con el rol que el
ADMIN decida — sin que esa persona pueda auto-registrarse ni elegir su
propio rol.

### ¿Cómo se entrega?

Igual que la de empresa: el ADMIN se lo pasa a mano a la persona
invitada (no hay envío de correo automático todavía).

### ¿Cómo la acepta el usuario?

```
Invitado → abre el link (/accept-invite?token=...)
   → se valida el token (validate_user_invitation) — muestra a qué
     empresa y con qué rol es la invitación
   → si no tiene cuenta: la crea ahí mismo (correo ya fijo, no editable)
   → si ya tiene cuenta: inicia sesión ahí mismo
   → accept_user_invitation() compara el correo real de la sesión
     contra el correo invitado — si coinciden, lo agrega a esa empresa
   → Dashboard de esa empresa
```

### ¿Qué ocurre después?

- La invitación pasa a estado "Aceptada".
- La persona aparece en la lista de "Usuarios" de esa empresa, con el
  rol asignado.
- Queda registrado en Auditoría (`user_invitation.accepted`).

### La protección extra que esta invitación necesita (y la de empresa no)

Un código de empresa es anónimo — sirve para cualquiera que lo tenga.
Una invitación de usuario está dirigida a **una persona específica**,
así que `accept_user_invitation()` compara el correo de quien está
aceptando contra el correo invitado (leyendo `auth.users`, algo que
solo una función del servidor puede hacer). Si el link se filtra o se
reenvía por error a otra persona, esa persona no puede usarlo.

---

## Estados de una invitación de usuario

```
PENDIENTE  → alguien la generó, todavía no se usó ni venció
   │
   ├── ACEPTADA  → alguien la canjeó con éxito
   ├── EXPIRADA  → pasaron más de 7 días sin usarse
   └── CANCELADA → el ADMIN la canceló a mano, antes de que se usara
```

"Reenviar" no muestra el mismo link de nuevo (el texto plano ya se
perdió, a propósito) — cancela la invitación vieja y genera una nueva,
con un link distinto.

## Por qué no se simula el envío de correo

Ni la invitación de empresa ni la de usuario mandan un email
automático todavía — mostrar "correo enviado" sin que exista una
integración real sería mentirle a quien usa la app (la misma regla que
ya aplicamos a WhatsApp/SMS en Recordatorios). El envío real de email
para Recordatorios ya existe (Fase 21, `docs/notificaciones.md`) — si
algún día se conecta el mismo mecanismo para invitaciones, sería
extender esa Edge Function, no construir una nueva desde cero.
