export interface ActivityItem {
  id: string;
  title: string;
  timestamp: string; // ya formateado, ej. "Hace 15 min"
  tone?: "neutral" | "success" | "error";
}

const dotClasses = {
  neutral: "bg-outline-variant",
  success: "bg-secondary",
  error: "bg-error",
};

export function ActivityFeed({
  items,
  emptyMessage,
}: {
  items: ActivityItem[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-body-sm text-on-surface-variant">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="relative border-l border-outline-variant ml-3 space-y-6">
      {items.map((item) => (
        <div key={item.id} className="relative pl-6">
          <span
            className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-surface-container-lowest ${
              dotClasses[item.tone ?? "neutral"]
            }`}
          />
          <p className="text-label-md text-primary mb-0.5">{item.title}</p>
          <span className="text-label-sm text-outline text-[10px] uppercase">
            {item.timestamp}
          </span>
        </div>
      ))}
    </div>
  );
}
