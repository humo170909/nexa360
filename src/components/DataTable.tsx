import type { ReactNode } from "react";

interface Column<T> {
  header: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage: string;
}

export function DataTable<T>({ columns, rows, getRowKey, emptyMessage }: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="py-16 text-center text-body-sm text-on-surface-variant">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[11px]">
            {columns.map((col) => (
              <th
                key={col.header}
                className={`px-6 py-3 border-b border-outline-variant font-semibold ${
                  col.align === "right" ? "text-right" : ""
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-body-sm">
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className="border-b border-outline-variant last:border-b-0 hover:bg-surface-bright transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={col.header}
                  className={`px-6 py-4 ${col.align === "right" ? "text-right" : ""}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
