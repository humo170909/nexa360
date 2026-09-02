import { useLocation } from "react-router-dom";
import { CORE_MODULES } from "../config/navigation";
import { useBusinessType } from "../hooks/useBusinessType";
import { EmptyState } from "../components/ui/EmptyState";

// Se muestra para cualquier módulo que ya aparece en el Sidebar (porque
// config/businessTypes.ts lo declaró) pero todavía no tiene pantalla real
// construida. Evita que el usuario caiga en una ruta rota.
export function ComingSoonPage() {
  const location = useLocation();
  const businessType = useBusinessType();
  const allModules = [...CORE_MODULES, ...(businessType?.extraModules ?? [])];
  const current = allModules.find((m) => m.path === location.pathname);

  return (
    <EmptyState
      icon={current?.icon ?? "hourglass_empty"}
      title={current?.label ?? "Este módulo"}
      description="Todavía estamos construyendo esta sección. Pronto vas a poder usarla aquí mismo."
    />
  );
}
