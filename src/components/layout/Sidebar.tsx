import { NavLink } from "react-router-dom";
import { CORE_MODULES } from "../../config/navigation";
import { useBusinessType } from "../../hooks/useBusinessType";
import { useCompany } from "../../hooks/useCompany";

export function Sidebar() {
  const { company } = useCompany();
  const businessType = useBusinessType();

  const modules = [...CORE_MODULES, ...(businessType?.extraModules ?? [])];

  return (
    <aside className="hidden md:flex flex-col w-sidebar-width h-screen sticky left-0 top-0 py-6 px-4 bg-surface-container-lowest border-r border-outline-variant shrink-0 z-30">
      <div className="flex items-center gap-2 mb-8 px-1">
        <div className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[20px]">
            {businessType?.icon ?? "hub"}
          </span>
        </div>
        <div className="overflow-hidden">
          <h1 className="text-headline-md font-bold text-primary truncate">NEXA360</h1>
          <p className="text-label-sm text-on-surface-variant truncate">
            {company?.name ?? "Cargando..."}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto space-y-1 pr-1">
        {modules.map((mod) => (
          <NavLink
            key={mod.key}
            to={mod.path}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-2.5 rounded-lg text-label-md transition-colors ${
                isActive
                  ? "text-secondary font-bold bg-secondary-fixed"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`
            }
          >
            <span className="material-symbols-outlined">{mod.icon}</span>
            <span>
              {/* "Clientes" del módulo core se reemplaza por la etiqueta
                  propia del rubro (Pacientes, Propietarios, Estudiantes...) */}
              {mod.key === "clients" && businessType ? businessType.entityLabel : mod.label}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-outline-variant space-y-1">
        <NavLink
          to="/settings"
          className="flex items-center gap-4 px-4 py-2.5 text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-lg"
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="text-label-md">Configuración</span>
        </NavLink>
      </div>
    </aside>
  );
}
