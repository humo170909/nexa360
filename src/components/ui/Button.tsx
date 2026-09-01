import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-60",
  outline:
    "bg-transparent border border-outline-variant text-on-surface hover:bg-surface-container-low",
  ghost: "bg-transparent text-on-surface-variant hover:bg-surface-container-low",
};

export function Button({
  variant = "primary",
  loading = false,
  fullWidth = true,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`h-12 ${fullWidth ? "w-full" : "px-12"} flex items-center justify-center gap-2 rounded-lg text-label-md font-medium transition-colors ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="material-symbols-outlined animate-spin text-[18px]">
          progress_activity
        </span>
      ) : null}
      {children}
    </button>
  );
}
