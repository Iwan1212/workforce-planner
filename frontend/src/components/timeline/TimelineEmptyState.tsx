import { Search, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

type TimelineEmptyStateProps = {
  searchQuery: string;
  isViewer: boolean;
  onNavigateToEmployees: () => void;
};

export function TimelineEmptyState({
  searchQuery,
  isViewer,
  onNavigateToEmployees,
}: TimelineEmptyStateProps) {
  const trimmed = searchQuery.trim();
  const isSearch = trimmed.length > 0;

  const title = isSearch
    ? `Brak wyników dla „${trimmed}”`
    : "Brak pracowników dla wybranych zespołów";

  const description = isSearch
    ? "Spróbuj innej frazy albo wyczyść wyszukiwanie. Jeśli katalog jest pusty, najpierw dodaj pracowników."
    : "Dodaj pracowników i przypisania do projektów, aby zobaczyć plan obłożenia w tym widoku.";

  const Icon = isSearch ? Search : Users;

  return (
    <div className="mx-6 flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 px-6 py-12 text-center">
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted"
        aria-hidden
      >
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      {!isViewer && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" onClick={onNavigateToEmployees}>
            <UserPlus className="h-4 w-4" />
            Dodaj pracownika
          </Button>
        </div>
      )}
    </div>
  );
}
