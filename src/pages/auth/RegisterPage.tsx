import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../../layouts/AuthLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!acceptedTerms) {
      setError("Debes aceptar los términos para continuar.");
      return;
    }

    setLoading(true);
    const { error, needsEmailConfirmation } = await signUp(email, password, fullName);
    setLoading(false);

    if (error) {
      setError(error);
      return;
    }
    if (needsEmailConfirmation) {
      setConfirmationSent(true);
      return;
    }
    navigate("/onboarding");
  }

  if (confirmationSent) {
    return (
      <AuthLayout
        variant="split"
        title="Revisa tu correo"
        subtitle="Te enviamos un enlace para confirmar tu cuenta."
      >
        <p className="text-body-md text-on-surface-variant">
          Abre el correo que enviamos a <strong>{email}</strong> y sigue el
          enlace de confirmación para poder iniciar sesión.
        </p>
        <Link to="/login" className="text-secondary hover:underline text-label-md block mt-6">
          Volver al inicio de sesión
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout variant="split" title="Crear cuenta" subtitle="Configura tu acceso a la plataforma.">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Nombre completo"
          type="text"
          placeholder="Ingresa tu nombre"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <Input
          label="Correo electrónico"
          type="email"
          icon="mail"
          placeholder="nombre@empresa.com"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Contraseña"
          type="password"
          icon="lock"
          placeholder="••••••••"
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
          placeholder="••••••••"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <label className="flex items-start gap-2 text-body-sm text-on-surface-variant">
          <input
            type="checkbox"
            className="h-4 w-4 mt-0.5 rounded border-outline-variant"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
          />
          Acepto los Términos de servicio y la Política de privacidad.
        </label>

        {error ? (
          <p className="text-label-sm text-error" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" loading={loading}>
          Crear cuenta
        </Button>
      </form>

      <p className="text-body-sm text-on-surface-variant text-center mt-8">
        ¿Ya tienes una cuenta?{" "}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  );
}
