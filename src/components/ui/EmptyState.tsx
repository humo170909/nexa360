import { Button } from "./Button";

interface EmptyStateAction {
  label: string;
  icon?: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: EmptyStateAction;
}

// Para cuando un módulo no tiene nada que mostrar todavía (sin citas, sin
// recordatorios...) — evita una pantalla en blanco. DataTable ya resuelve
// esto para tablas simples con su prop "emptyMessage"; este componente es
// para pantallas que necesitan algo más (ícono, botón de acción).
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-[32px] text-on-surface-variant">
          {icon}
        </span>
      </div>
      <h2 className="text-headline-lg text-primary mb-2">{title}</h2>
      {description ? (
        <p className="text-body-md text-on-surface-variant max-w-sm mb-6">{description}</p>
      ) : null}
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
