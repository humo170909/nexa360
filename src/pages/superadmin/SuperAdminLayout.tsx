import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

// Panel aparte del de cada empresa (AppLayout) — a propósito, para que
// quede visualmente claro que esto NO es la vista de una empresa
// cualquiera. Navegación fija (no depende de business_type, como sí pasa
// en Sidebar.tsx): un SUPERADMIN administra la plataforma, no un rubro.
const NAV_ITEMS = [
  { path: "/superadmin", label: "Dashboard", icon: "dashboard", end: true },
  { path: "/superadmin/companies", label: "Empresas", icon: "domain" },
  { path: "/superadmin/users", label: "Usuarios", icon: "group" },
  { path: "/superadmin/invitations", label: "Invitaciones", icon: "confirmation_number" },
  { path: "/superadmin/plans", label: "Planes", icon: "workspace_premium" },
  { path: "/superadmin/modules", label: "Módulos", icon: "widgets" },
  { path: "/superadmin/activity", label: "Actividad", icon: "monitoring" },
  { path: "/superadmin/audit", label: "Auditoría", icon: "history" },
  { path: "/superadmin/settings", label: "Configuración", icon: "settings" },
];

export function SuperAdminLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <aside className="hidden md:flex flex-col w-sidebar-width h-screen sticky left-0 top-0 py-6 px-4 bg-primary text-on-primary shrink-0 z-30">
        <div className="flex items-center gap-2 mb-8 px-1">
          <div className="w-10 h-10 rounded-lg bg-on-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">shield_person</span>
          </div>
          <div className="overflow-hidden">
            <h1 className="text-headline-md font-bold truncate">NEXA360</h1>
            <p className="text-label-sm text-on-primary/70 truncate">Panel SUPERADMIN</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-1 pr-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-2.5 rounded-lg text-label-md transition-colors ${
                  isActive
                    ? "bg-on-primary/15 font-bold"
                    : "text-on-primary/80 hover:bg-on-primary/10"
                }`
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-on-primary/20">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-4 px-4 py-2.5 text-on-primary/80 hover:bg-on-primary/10 transition-colors rounded-lg"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="text-label-md">Volver a mi empresa</span>
          </NavLink>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex justify-between items-center w-full px-6 h-16 bg-surface-bright border-b border-outline-variant sticky top-0 z-20 shrink-0">
          <div className="md:hidden text-headline-sm font-black text-primary">NEXA360</div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-body-sm text-on-surface-variant">
              {user?.email}
            </span>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1 text-label-sm text-on-surface-variant hover:text-primary transition-colors px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container-low"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Cerrar sesión
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-container-max mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
