import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Traduce los mensajes técnicos de Supabase a algo que un usuario final
// pueda entender. Nunca se muestra el error crudo (punto 12 del proyecto),
// pero SÍ se deja en la consola del navegador para poder depurar (F12).
function friendlyAuthError(error: AuthError): string {
  const message = error.message ?? "";
  console.error("[Auth error]", error.status, error.code, message);

  if (message.includes("Invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (message.includes("User already registered")) {
    return "Ya existe una cuenta con ese correo.";
  }
  if (message.includes("Password should be at least")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  if (message.includes("Email not confirmed")) {
    return "Debes confirmar tu correo antes de iniciar sesión.";
  }
  if (message.includes("Email rate limit exceeded") || message.includes("over_email_send_rate_limit")) {
    return "Se enviaron demasiados correos en poco tiempo. Espera unos minutos e intenta de nuevo.";
  }
  if (message.includes("signup") && message.toLowerCase().includes("disabled")) {
    return "El registro de nuevas cuentas está deshabilitado en este momento.";
  }
  if (error.status === 429) {
    return "Demasiados intentos seguidos. Espera unos minutos e intenta de nuevo.";
  }
  return "Ocurrió un problema. Intenta de nuevo en unos segundos.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error ? friendlyAuthError(error) : null };
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return {
      error: error ? friendlyAuthError(error) : null,
      needsEmailConfirmation: !error && !data.session,
    };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error ? friendlyAuthError(error) : null };
  }

  // Requiere que ya haya una sesión activa (a diferencia de
  // requestPasswordReset, que es para cuando NO puedes iniciar sesión).
  // Se usa en Configuración → Seguridad.
  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error ? friendlyAuthError(error) : null };
  }

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
