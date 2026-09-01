interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  hint?: string;
}

export function StatCard({ label, value, icon, hint }: StatCardProps) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col justify-between shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">
          {label}
        </span>
        <div className="w-8 h-8 rounded-lg bg-surface-bright border border-outline-variant flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
      </div>
      <div>
        <span className="text-display-lg text-primary leading-none">{value}</span>
        {hint ? (
          <p className="text-label-sm text-on-surface-variant mt-2">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
