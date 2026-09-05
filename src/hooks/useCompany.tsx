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
import {
  getPendingRedemption,
  clearPendingRedemption,
  redeemInvitationCode,
} from "../services/invitations";
import {
  getPendingUserInvite,
  clearPendingUserInvite,
  acceptUserInvitation,
} from "../services/userInvitations";
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
    let memberships = await getMyCompanies();

    // Cubre el caso donde el registro quedó "a medias": el usuario validó
    // un código y confirmó su email más tarde (Supabase Auth con
    // "Confirmar email" activado), así que redeem_invitation_code no
    // pudo correr en el momento del registro por falta de sesión. Ahora
    // que sí hay sesión (llegamos hasta acá), la completamos.
    if (memberships.length === 0) {
      const pending = getPendingRedemption();
      if (pending) {
        const result = await redeemInvitationCode(
          pending.code,
          pending.companyName,
          pending.businessType,
        );
        clearPendingRedemption();
        if (result.success) {
          memberships = await getMyCompanies();
        }
      }
    }

    // Mismo caso, para el otro tipo de invitación (Fase 25): aceptar una
    // invitación de usuario a una empresa ya existente, cuando el correo
    // exigió confirmación antes de que hubiera sesión.
    if (memberships.length === 0) {
      const pendingToken = getPendingUserInvite();
      if (pendingToken) {
        const result = await acceptUserInvitation(pendingToken);
        clearPendingUserInvite();
        if (result.success) {
          memberships = await getMyCompanies();
        }
      }
    }

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
