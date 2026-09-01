import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "error" | "info";

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-container-high text-on-surface-variant",
  success: "bg-secondary-fixed text-on-secondary-fixed-variant",
  warning: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  error: "bg-error-container text-on-error-container",
  info: "border border-outline-variant text-on-surface-variant",
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
