import { cn } from "@/lib/utils";
import type { DataTableProps } from "@/types/ui";

const DEFAULT_SKELETON_ROWS = 5;

export function DataTable<T>({
  data,
  columns,
  getRowKey,
  renderActions,
  isLoading = false,
  skeletonRowCount = DEFAULT_SKELETON_ROWS,
  emptyContent,
  className,
}: DataTableProps<T>) {
  if (isLoading) {
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
            {Array.from({ length: skeletonRowCount }).map((_, i) => (
              <tr key={i} className="border-b last:border-0">
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={cn(
                      "px-4 py-3",
                      col.align === "right" ? "text-right" : "text-left",
                    )}
                  >
                    <div
                      className={cn(
                        "h-4 animate-pulse rounded bg-muted",
                        i % 2 === 0 ? "w-3/4" : "w-1/2",
                      )}
                    />
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <div className="ml-auto h-4 w-8 animate-pulse rounded bg-muted" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        {emptyContent ?? "Brak danych."}
      </div>
    );
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
            <th className="px-4 py-3 text-right text-sm font-medium">Akcje</th>
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
