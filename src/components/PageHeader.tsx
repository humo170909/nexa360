import { Button } from "./ui/Button";

interface PageHeaderAction {
  label: string;
  icon?: string;
  onClick: () => void;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: PageHeaderAction;
}

// El bloque "título + subtítulo + botón" que se repetía igual en Clientes,
// Servicios y Agenda. El Dashboard NO lo usa — su encabezado (saludo +
// nombre de empresa + fecha) es genuinamente distinto, no una variación
// de este mismo patrón.
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h2 className="text-display-lg text-primary tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="text-body-md text-on-surface-variant mt-2">{subtitle}</p>
        ) : null}
      </div>
      {action ? (
        <Button fullWidth={false} onClick={action.onClick}>
          {action.icon ? (
            <span className="material-symbols-outlined text-[18px]">{action.icon}</span>
          ) : null}
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
