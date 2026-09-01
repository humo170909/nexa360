import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../../layouts/AuthLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    navigate("/dashboard");
  }

  return (
    <AuthLayout
      variant="split"
      title="Bienvenido de nuevo"
      subtitle="Ingresa a tu cuenta para continuar."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Correo electrónico"
          type="email"
          icon="mail"
          placeholder="tu@empresa.com"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Contraseña"
          type={showPassword ? "text" : "password"}
          icon="lock"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-on-surface-variant hover:text-on-surface"
              aria-label="Mostrar u ocultar contraseña"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          }
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
            <input type="checkbox" className="h-4 w-4 rounded border-outline-variant" />
            Recordarme
          </label>
          <Link
            to="/forgot-password"
            className="text-label-sm text-secondary hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {error ? (
          <p className="text-label-sm text-error" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" loading={loading}>
          Iniciar sesión
        </Button>
      </form>

      <p className="text-body-sm text-on-surface-variant text-center mt-8">
        ¿No tienes una cuenta?{" "}
        <Link to="/register" className="text-primary font-medium hover:underline">
          Crear cuenta
        </Link>
      </p>
    </AuthLayout>
  );
}
