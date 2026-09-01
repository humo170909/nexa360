import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: string; // nombre de un ícono de Material Symbols
  rightElement?: ReactNode; // ej. botón de mostrar/ocultar contraseña
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, rightElement, error, id, className = "", ...rest }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-label-md text-on-surface">
          {label}
        </label>
        <div className="relative flex items-center">
          {icon ? (
            <span className="material-symbols-outlined absolute left-4 text-on-surface-variant text-[20px] pointer-events-none">
              {icon}
            </span>
          ) : null}
          <input
            id={inputId}
            ref={ref}
            className={`w-full h-12 ${icon ? "pl-8" : "pl-4"} ${
              rightElement ? "pr-8" : "pr-4"
            } bg-surface-container-lowest border rounded-lg text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all ${
              error ? "border-error" : "border-outline-variant"
            } ${className}`}
            {...rest}
          />
          {rightElement ? (
            <div className="absolute right-3 flex items-center">
              {rightElement}
            </div>
          ) : null}
        </div>
        {error ? <span className="text-label-sm text-error">{error}</span> : null}
      </div>
    );
  },
);

Input.displayName = "Input";
