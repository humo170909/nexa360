import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "../../layouts/AuthLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await requestPasswordReset(email);
    setLoading(false);

    // Por seguridad, se muestra el mismo mensaje exista o no la cuenta
    // (evita que alguien use este formulario para adivinar qué correos
    // están registrados).
    if (error) {
      setError(error);
      return;
    }
    setSent(true);
  }

  return (
    <AuthLayout
      variant="centered"
      title="Recupera el acceso a tu cuenta"
      subtitle="Si existe una cuenta asociada a este correo, recibirás instrucciones para recuperar tu contraseña."
    >
      {sent ? (
        <p className="text-body-md text-on-surface-variant text-center">
          Revisa tu bandeja de entrada (y la carpeta de spam) para continuar.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Input
            label="Correo electrónico"
            type="email"
            icon="mail"
            placeholder="nombre@empresa.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error ? (
            <p className="text-label-sm text-error" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" loading={loading}>
            Enviar enlace
          </Button>
        </form>
      )}

      <div className="text-center pt-4 border-t border-outline-variant mt-6">
        <Link
          to="/login"
          className="text-label-md text-on-surface-variant hover:text-primary inline-flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Volver al inicio de sesión
        </Link>
      </div>
    </AuthLayout>
  );
}
