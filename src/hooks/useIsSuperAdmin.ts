import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "../lib/supabaseClient";

// Sin contexto propio a propósito: solo lo usa la guardia de ruta del
// panel SUPERADMIN (App.tsx) — no vale la pena otro Provider en main.tsx
// para una sola consulta de una fila. is_superadmin vive en "profiles",
// no en la sesión de Supabase Auth, así que hace falta esta consulta.
export function useIsSuperAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("profiles")
      .select("is_superadmin")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setIsSuperAdmin(data?.is_superadmin ?? false);
        setLoading(false);
      });
  }, [user, authLoading]);

  return { isSuperAdmin, loading: authLoading || loading };
}
