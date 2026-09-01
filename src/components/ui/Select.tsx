import { forwardRef, type SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, id, className = "", children, ...rest }, ref) => {
    const selectId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={selectId} className="text-label-md text-on-surface">
          {label}
        </label>
        <select
          id={selectId}
          ref={ref}
          className={`w-full h-12 px-4 bg-surface-container-lowest border rounded-lg text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all ${
            error ? "border-error" : "border-outline-variant"
          } ${className}`}
          {...rest}
        >
          {children}
        </select>
        {error ? <span className="text-label-sm text-error">{error}</span> : null}
      </div>
    );
  },
);

Select.displayName = "Select";
