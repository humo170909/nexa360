import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { AuthLayout } from "../../layouts/AuthLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import {
  validateUserInvitation,
  acceptUserInvitation,
  savePendingUserInvite,
} from "../../services/userInvitations";
import { INVALID_USER_INVITATION_MESSAGE, type ValidateUserInvitationReason } from "../../types/userInvitation";

type Mode = "login" | "signup";

// Ruta pública (no requiere sesión) — a diferencia de RegisterPage
// (Fase 22, crea una empresa NUEVA), esta página une a alguien a una
// empresa YA existente. El correo viene fijo desde la invitación, nunca
// editable — es la garantía de que el link solo sirve para esa persona.
export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const { session, user, signIn, signUp } = useAuth();
  const { refetch } = useCompany();

  const [loading, setLoading] = useState(true);
  const [invalidReason, setInvalidReason] = useState<ValidateUserInvitationReason | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [invitedEmail, setInvitedEmail] = useState("");
  const [role, setRole] = useState("");

  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);

  useEffect(() => {
    if (!token) {
      setInvalidReason("invalid");
      setLoading(false);
      return;
    }
    validateUserInvitation(token).then((result) => {
      if (!result.valid) {
        setInvalidReason((result.reason as ValidateUserInvitationReason) ?? "invalid");
      } else {
        setCompanyName(result.company_name ?? "");
        setInvitedEmail(result.invited_email ?? "");
        setRole(result.role ?? "");
        setFullName(result.invited_name ?? "");
      }
      setLoading(false);
    });
  }, [token]);

  async function handleAccept() {
    setSubmitting(true);
    setError(null);
    const result = await acceptUserInvitation(token);
    setSubmitting(false);

    if (!result.success) {
      setError(
        INVALID_USER_INVITATION_MESSAGE[result.reason as ValidateUserInvitationReason] ??
          "No se pudo aceptar la invitación.",
      );
      return;
    }
    await refetch();
    setAccepted(true);
  }

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signup" && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);

    if (mode === "login") {
      const { error } = await signIn(invitedEmail, password);
      if (error) {
        setSubmitting(false);
        setError(error);
        return;
      }
      // Tras signIn exitoso ya hay sesión — se acepta enseguida, sin
      // pedirle a la persona un segundo clic.
      await handleAccept();
      return;
    }

    const { error, needsEmailConfirmation } = await signUp(invitedEmail, password, fullName);
    if (error) {
      setSubmitting(false);
      setError(error);
      return;
    }
    if (needsEmailConfirmation) {
      // Sin sesión todavía, accept_user_invitation no puede correr —
      // se completa sola en el primer login (ver hooks/useCompany.tsx).
      savePendingUserInvite(token);
      setSubmitting(false);
      setConfirmationPending(true);
      return;
    }
    await handleAccept();
  }

  if (loading) return null;

  if (invalidReason) {
    return (
      <AuthLayout variant="centered" title="Invitación no válida" subtitle="">
        <p className="text-body-md text-on-surface-variant text-center">
          {INVALID_USER_INVITATION_MESSAGE[invalidReason]}
        </p>
        <Link to="/login" className="text-secondary hover:underline text-label-md block text-center mt-6">
          Ir al inicio de sesión
        </Link>
      </AuthLayout>
    );
  }

  if (confirmationPending) {
    return (
      <AuthLayout variant="centered" title="Revisa tu correo" subtitle="">
        <p className="text-body-md text-on-surface-variant text-center">
          Abre el correo que enviamos a <strong>{invitedEmail}</strong> y confirma tu cuenta. Al
          iniciar sesión por primera vez, te unimos a <strong>{companyName}</strong>{" "}
          automáticamente.
        </p>
      </AuthLayout>
    );
  }

  if (accepted) {
    return (
      <AuthLayout variant="centered" title="¡Listo!" subtitle="">
        <div className="text-center space-y-6">
          <span className="material-symbols-outlined text-[48px] text-secondary">check_circle</span>
          <p className="text-body-md text-on-surface-variant">
            Ya formas parte de <strong>{companyName}</strong>.
          </p>
          <Button onClick={() => navigate("/dashboard")}>Ir a mi Dashboard</Button>
        </div>
      </AuthLayout>
    );
  }

  const emailMismatch = session && user?.email?.toLowerCase() !== invitedEmail.toLowerCase();

  return (
    <AuthLayout
      variant="centered"
      title={`Te invitaron a ${companyName}`}
      subtitle={`Como ${role}, para el correo ${invitedEmail}.`}
    >
      {session ? (
        emailMismatch ? (
          <p className="text-label-sm text-error text-center">
            {INVALID_USER_INVITATION_MESSAGE.email_mismatch}
          </p>
        ) : (
          <div className="space-y-4">
            {error ? <p className="text-label-sm text-error text-center">{error}</p> : null}
            <Button onClick={handleAccept} loading={submitting}>
              Aceptar invitación
            </Button>
          </div>
        )
      ) : (
        <div className="space-y-6">
          <div className="flex bg-surface-container-low rounded-lg p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 px-3 py-1.5 rounded-md text-label-sm transition-colors ${
                mode === "login" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant"
              }`}
            >
              Ya tengo cuenta
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 px-3 py-1.5 rounded-md text-label-sm transition-colors ${
                mode === "signup" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant"
              }`}
            >
              Soy nuevo
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <Input label="Correo electrónico" value={invitedEmail} disabled />
            {mode === "signup" ? (
              <Input
                label="Nombre completo"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            ) : null}
            <Input
              label="Contraseña"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === "signup" ? (
              <Input
                label="Confirmar contraseña"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            ) : null}
            {error ? <p className="text-label-sm text-error">{error}</p> : null}
            <Button type="submit" loading={submitting}>
              {mode === "login" ? "Iniciar sesión y aceptar" : "Crear cuenta y aceptar"}
            </Button>
          </form>
        </div>
      )}
    </AuthLayout>
  );
}
