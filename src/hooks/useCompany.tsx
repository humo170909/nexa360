import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./useAuth";
import { getMyCompanies } from "../services/companies";
import type { Company, CompanyRole } from "../types/company";

interface CompanyContextValue {
  /** La empresa activa del usuario. null mientras carga o si aún no creó ninguna. */
  company: Company | null;
  /** Rol del usuario DENTRO de esa empresa (ADMIN o USUARIO). */
  role: CompanyRole | null;
  loading: boolean;
  /** Se llama después de crear una empresa nueva (onboarding) para refrescar el contexto. */
  refetch: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [role, setRole] = useState<CompanyRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompany = useCallback(async () => {
    if (!user) {
      setCompany(null);
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const memberships = await getMyCompanies();
    // MVP: un usuario opera sobre una sola empresa a la vez (la primera
    // que le aparezca). Soportar cambiar entre varias es una mejora futura.
    setCompany(memberships[0]?.company ?? null);
    setRole(memberships[0]?.role ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  return (
    <CompanyContext.Provider value={{ company, role, loading, refetch: fetchCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) {
    throw new Error("useCompany debe usarse dentro de <CompanyProvider>");
  }
  return ctx;
}
