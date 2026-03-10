import { useMutation } from "@tanstack/react-query";
import { Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { updateTheme } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";

interface SettingsPageProps {
  onNavigate: (path: string) => void;
}

export function SettingsPage({ onNavigate: _onNavigate }: SettingsPageProps) {
  const { user, setUser } = useAuthStore();
  const currentTheme = user?.theme ?? "light";

  const mutation = useMutation({
    mutationFn: (theme: "light" | "dark") => updateTheme(theme),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
    },
    onError: () => toast.error("Nie udało się zapisać ustawień"),
  });

  const handleSelect = (theme: "light" | "dark") => {
    if (theme === currentTheme || mutation.isPending) return;
    mutation.mutate(theme);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex min-h-9 items-center justify-between">
        <h2 className="text-2xl font-bold">Ustawienia</h2>
      </div>

      <section className="max-w-2xl">
        <p className="mb-1 text-sm font-semibold text-foreground">Wygląd</p>
        <p className="mb-4 text-sm text-muted-foreground">Wybierz schemat kolorystyczny aplikacji</p>

        <div className="flex gap-6">
          <ThemeCard
            theme="light"
            label="Jasny"
            selected={currentTheme === "light"}
            disabled={mutation.isPending}
            onSelect={handleSelect}
          />
          <ThemeCard
            theme="dark"
            label="Ciemny"
            selected={currentTheme === "dark"}
            disabled={mutation.isPending}
            onSelect={handleSelect}
          />
        </div>
      </section>
    </div>
  );
}

interface ThemeCardProps {
  theme: "light" | "dark";
  label: string;
  selected: boolean;
  disabled: boolean;
  onSelect: (theme: "light" | "dark") => void;
}

function ThemeCard({ theme, label, selected, disabled, onSelect }: ThemeCardProps) {
  const isDark = theme === "dark";

  return (
    <div
      onClick={() => !disabled && onSelect(theme)}
      className={`w-44 cursor-pointer select-none ${disabled ? "opacity-50" : ""}`}
    >
      {/* Preview card — border indicates selection */}
      <div
        className={`mb-2.5 overflow-hidden rounded-xl border-2 transition-colors ${
          selected ? "border-primary" : "border-border hover:border-muted-foreground"
        }`}
      >
        <div
          className="flex h-28 w-full"
          style={{ backgroundColor: isDark ? "#121214" : "#f3f4f6" }}
        >
          {/* Mini sidebar */}
          <div
            className="w-8 flex-shrink-0 flex flex-col gap-1 p-1.5"
            style={{ backgroundColor: isDark ? "#18181B" : "#e5e7eb" }}
          >
            <div className="h-1.5 w-full rounded-sm" style={{ backgroundColor: isDark ? "#3F3F46" : "#9ca3af" }} />
            <div className="h-1.5 w-full rounded-sm" style={{ backgroundColor: isDark ? "#3F3F46" : "#9ca3af" }} />
            <div className="h-1.5 w-3/4 rounded-sm" style={{ backgroundColor: isDark ? "#3F3F46" : "#9ca3af" }} />
          </div>
          {/* Mini content */}
          <div className="flex-1 flex flex-col gap-1.5 p-2">
            <div className="h-1.5 w-3/4 rounded-sm" style={{ backgroundColor: isDark ? "#3F3F46" : "#d1d5db" }} />
            <div className="h-4 w-full rounded" style={{ backgroundColor: "#f97316" }} />
            <div className="h-4 w-2/3 rounded" style={{ backgroundColor: isDark ? "#A1A1AA" : "#374151" }} />
            <div className="h-4 w-1/2 rounded" style={{ backgroundColor: "#22c55e" }} />
            <div className="h-4 w-3/4 rounded" style={{ backgroundColor: "#ef4444" }} />
          </div>
        </div>
      </div>

      {/* Label row — outside the card */}
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
        <input
          type="radio"
          name="theme"
          checked={selected}
          onChange={() => !disabled && onSelect(theme)}
          className="h-4 w-4 accent-primary"
        />
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        {label}
      </label>
    </div>
  );
}
