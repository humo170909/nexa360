import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../../layouts/AuthLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import {
  validateInvitationCode,
  redeemInvitationCode,
  savePendingRedemption,
} from "../../services/invitations";
import { INVALID_CODE_MESSAGE, type InvalidCodeReason } from "../../types/invitation";
import { BUSINESS_TYPES } from "../../config/businessTypes";
import type { BusinessType } from "../../types/company";

type Step = "code" | "company" | "admin" | "success";
const STEP_ORDER: Step[] = ["code", "company", "admin", "success"];
const STEP_LABEL: Record<Step, string> = {
  code: "Código de invitación",
  company: "Datos de tu empresa",
  admin: "Tu cuenta de administrador",
  success: "Listo",
};

// El registro es de 4 pasos, no libre: sin un código de invitación
// válido no se puede llegar más allá del Paso 1 (ver
// database/policies.sql, redeem_invitation_code — la base de datos
// exige el mismo código otra vez, no confía en que esta pantalla ya lo
// haya validado).
export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("code");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paso 1
  const [code, setCode] = useState("");

  // Paso 2
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);

  // Paso 3
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmationPending, setConfirmationPending] = useState(false);

  async function handleValidateCode(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError("Ingresa tu código de invitación.");
      return;
    }

    setLoading(true);
    const result = await validateInvitationCode(code);
    setLoading(false);

    if (!result.valid) {
      setError(INVALID_CODE_MESSAGE[result.reason as InvalidCodeReason] ?? INVALID_CODE_MESSAGE.invalid);
      return;
    }
    setStep("company");
  }

  function handleCompanySubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!companyName.trim() || !businessType) {
      setError("Completa el nombre de la empresa y el tipo de negocio.");
      return;
    }
    setStep("admin");
  }

  async function handleCreateAccount(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!businessType) {
      setError("Falta seleccionar el tipo de negocio.");
      return;
    }

    setLoading(true);
    const { error: signUpError, needsEmailConfirmation } = await signUp(
      email,
      password,
      fullName,
      phone,
    );

    if (signUpError) {
      setLoading(false);
      setError(signUpError);
      return;
    }

    // Si el proyecto exige confirmar el correo, todavía no hay sesión —
    // redeem_invitation_code no puede correr sin auth.uid(). Guardamos
    // los datos (no sensibles) para completarlo automáticamente en el
    // primer login (ver hooks/useCompany.tsx).
    if (needsEmailConfirmation) {
      savePendingRedemption({ code, companyName: companyName.trim(), businessType });
      setLoading(false);
      setConfirmationPending(true);
      setStep("success");
      return;
    }

    const result = await redeemInvitationCode(code, companyName.trim(), businessType);
    setLoading(false);

    if (!result.success) {
      setError(
        INVALID_CODE_MESSAGE[result.reason as InvalidCodeReason] ??
          "No se pudo completar el registro. Contacta a soporte.",
      );
      return;
    }
    setStep("success");
  }

  const stepIndex = STEP_ORDER.indexOf(step);

  return (
    <AuthLayout
      variant="split"
      title={STEP_LABEL[step]}
      subtitle={
        step === "code"
          ? "Necesitas un código de invitación válido para crear una cuenta."
          : "Configura tu acceso a la plataforma."
      }
    >
      {step !== "success" ? (
        <div className="flex items-center gap-2 mb-6" aria-hidden="true">
          {STEP_ORDER.slice(0, 3).map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                i <= stepIndex ? "bg-primary" : "bg-outline-variant"
              }`}
            />
          ))}
        </div>
      ) : null}

      {step === "code" ? (
        <form onSubmit={handleValidateCode} className="space-y-6">
          <Input
            label="Código de invitación"
            placeholder="NX-XXXX-XXXX"
            autoComplete="off"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          {error ? (
            <p className="text-label-sm text-error" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" loading={loading}>
            Validar código
          </Button>
        </form>
      ) : null}

      {step === "company" ? (
        <form onSubmit={handleCompanySubmit} className="space-y-6">
          <p className="text-label-sm text-secondary flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            Código válido. Puedes continuar con el registro.
          </p>
          <Input
            label="Nombre de la empresa"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <div className="flex flex-col gap-2">
            <label className="text-label-md text-on-surface">Tipo de negocio</label>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {Object.values(BUSINESS_TYPES).map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setBusinessType(type.id)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-label-sm text-left transition-all ${
                    businessType === type.id
                      ? "border-primary bg-surface-container-low text-primary"
                      : "border-outline-variant text-on-surface-variant hover:border-primary/40"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          {error ? (
            <p className="text-label-sm text-error" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit">Continuar</Button>
        </form>
      ) : null}

      {step === "admin" ? (
        <form onSubmit={handleCreateAccount} className="space-y-6">
          <Input
            label="Nombre completo"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            label="Correo electrónico"
            type="email"
            icon="mail"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Teléfono"
            type="tel"
            icon="call"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Contraseña"
            type="password"
            icon="lock"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            label="Confirmar contraseña"
            type="password"
            icon="lock_reset"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error ? (
            <p className="text-label-sm text-error" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" loading={loading}>
            Crear cuenta
          </Button>
        </form>
      ) : null}

      {step === "success" ? (
        <div className="text-center space-y-6">
          <span className="material-symbols-outlined text-[48px] text-secondary">
            check_circle
          </span>
          {confirmationPending ? (
            <>
              <p className="text-body-md text-on-surface-variant">
                Revisa tu correo (<strong>{email}</strong>) y confirma tu cuenta. Al iniciar
                sesión por primera vez, terminamos de configurar tu empresa automáticamente.
              </p>
              <Link to="/login" className="text-secondary hover:underline text-label-md block">
                Volver al inicio de sesión
              </Link>
            </>
          ) : (
            <>
              <p className="text-headline-sm text-primary">Cuenta creada correctamente.</p>
              <p className="text-body-md text-on-surface-variant">Bienvenido a NEXA360.</p>
              <Button onClick={() => navigate("/dashboard")}>Acceder a la plataforma</Button>
            </>
          )}
        </div>
      ) : null}

      {step !== "success" ? (
        <p className="text-body-sm text-on-surface-variant text-center mt-8">
          ¿Ya tienes una cuenta?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Iniciar sesión
          </Link>
        </p>
      ) : null}
    </AuthLayout>
  );
}
