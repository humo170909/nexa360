import { useAuth } from "../../hooks/useAuth";
import { Button } from "../../components/ui/Button";

// Antes de la Fase 22, esta pantalla dejaba que cualquier usuario logueado
// SIN empresa creara una libremente ("onboarding" de autoservicio). Eso
// era exactamente el registro libre que se eliminó: ahora una empresa
// solo puede nacer dentro de redeem_invitation_code() (database/policies.sql),
// que exige un código de invitación válido.
//
// Un usuario cae aquí solo en un caso: tiene sesión pero ningún vínculo
// en company_users todavía — por ejemplo, si confirmó su correo pero el
// canje de la invitación falló a mitad de camino (código usado por otra
// persona mientras tanto, código desactivado, etc.). No es un flujo para
// crear una empresa nueva, es una pantalla de recuperación.
export function NoCompanyPage() {
  const { signOut } = useAuth();

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-bright p-4">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-8 text-center space-y-4">
        <span className="material-symbols-outlined text-[40px] text-on-surface-variant">
          domain_disabled
        </span>
        <h1 className="text-headline-md text-primary">Tu cuenta no tiene una empresa asociada</h1>
        <p className="text-body-md text-on-surface-variant">
          Esto puede pasar si tu registro quedó incompleto (por ejemplo, si el código de
          invitación se usó o expiró justo antes de confirmar tu cuenta). Contacta al
          administrador que te invitó para que te genere un nuevo código.
        </p>
        <Button fullWidth={false} onClick={() => signOut()}>
          Cerrar sesión
        </Button>
      </div>
    </main>
  );
}
