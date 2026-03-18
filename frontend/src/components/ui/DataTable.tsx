import { cn } from "@/lib/utils";
import type { DataTableProps } from "@/types/ui";

export function DataTable<T>({
  data,
  columns,
  getRowKey,
  renderActions,
  isLoading = false,
  emptyContent,
  className,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Ładowanie...</p>
    );
  }

  if (data.length === 0 && emptyContent) {
    return (
      <p className="text-sm text-muted-foreground">{emptyContent}</p>
    );
  }

  if (data.length === 0) {
    return null;
  }

  return (
    <div className={cn("rounded-md border", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col) => (
              <th
                key={col.id}
                className={cn(
                  "px-4 py-3 text-sm font-medium",
                  col.align === "right" ? "text-right" : "text-left",
                )}
              >
                {col.header}
              </th>
            ))}
            <th className="px-4 py-3 text-right text-sm font-medium">
              Akcje
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={getRowKey(row)} className="border-b last:border-0">
              {columns.map((col) => (
                <td
                  key={col.id}
                  className={cn(
                    "px-4 py-3",
                    col.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  {col.cell(row)}
                </td>
              ))}
              <td className="px-4 py-3 text-right">{renderActions(row)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
