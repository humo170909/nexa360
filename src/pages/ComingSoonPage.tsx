import { useLocation } from "react-router-dom";
import { CORE_MODULES } from "../config/navigation";
import { useBusinessType } from "../hooks/useBusinessType";

// Se muestra para cualquier módulo que ya aparece en el Sidebar (porque
// config/businessTypes.ts lo declaró) pero todavía no tiene pantalla real
// construida. Evita que el usuario caiga en una ruta rota.
export function ComingSoonPage() {
  const location = useLocation();
  const businessType = useBusinessType();
  const allModules = [...CORE_MODULES, ...(businessType?.extraModules ?? [])];
  const current = allModules.find((m) => m.path === location.pathname);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-[32px] text-on-surface-variant">
          {current?.icon ?? "hourglass_empty"}
        </span>
      </div>
      <h2 className="text-headline-lg text-primary mb-2">
        {current?.label ?? "Este módulo"}
      </h2>
      <p className="text-body-md text-on-surface-variant max-w-sm">
        Todavía estamos construyendo esta sección. Pronto vas a poder usarla
        aquí mismo.
      </p>
    </div>
  );
}
