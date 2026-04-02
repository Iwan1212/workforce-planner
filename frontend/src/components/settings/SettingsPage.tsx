import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sun, Moon, Link, Unlink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout/PageHeader";
import type { ThemeCardProps } from "@/types/settings";
import { updateTheme } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import {
  fetchCalamariConfig,
  updateCalamariConfig,
  deleteCalamariConfig,
  triggerVacationSync,
} from "@/api/settings";

export function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const currentTheme = user?.theme ?? "light";
  const isAdmin = user?.role === "admin";

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
      <PageHeader title="Ustawienia" />

      <section className="max-w-2xl">
        <p className="mb-1 text-base font-semibold text-foreground">Wygląd</p>
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

      {isAdmin && (
        <>
          <Separator className="my-6" />
          <section>
            <CalamariSection />
          </section>
        </>
      )}
    </div>
  );
}

function CalamariSection() {
  const queryClient = useQueryClient();
  const [subdomain, setSubdomain] = useState("");
  const [apiKey, setApiKey] = useState("");

  const { data: config, isLoading } = useQuery({
    queryKey: ["calamari-config"],
    queryFn: fetchCalamariConfig,
  });

  const connectMutation = useMutation({
    mutationFn: () => updateCalamariConfig({ api_key: apiKey, subdomain }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["calamari-config"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      setApiKey("");
      toast.success(result.message);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: deleteCalamariConfig,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["calamari-config"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      setSubdomain("");
      setApiKey("");
      toast.success(result.message);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const syncMutation = useMutation({
    mutationFn: triggerVacationSync,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["calamari-config"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toast.success(`Zsynchronizowano ${result.synced} urlopów`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isConfigured = config?.is_configured ?? false;
  const isPending = connectMutation.isPending || disconnectMutation.isPending;

  return (
    <>
      <p className="mb-1 text-base font-semibold text-foreground">Integracja Calamari</p>
      <p className="mb-4 text-sm text-muted-foreground">
        Podłącz Calamari HR, aby automatycznie pobierać zatwierdzone urlopy pracowników
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Ładowanie...</p>
      ) : isConfigured ? (
        <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Połączono
              </p>
              <p className="text-xs text-muted-foreground">
                Subdomena: {config?.subdomain ?? "—"}
              </p>
              {config?.last_synced_at && (
                <p className="text-xs text-muted-foreground">
                  Ostatnia synchronizacja: {new Date(config.last_synced_at).toLocaleString("pl-PL")}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <RefreshButton
                label="Synchronizuj teraz"
                onClick={() => syncMutation.mutate()}
                isPending={syncMutation.isPending}
              />
              <Button
                variant="destructive"
                size="sm"
                className="dark:bg-destructive dark:hover:bg-destructive/90"
                onClick={() => disconnectMutation.mutate()}
                disabled={isPending}
              >
                <Unlink className="mr-1.5 h-3.5 w-3.5" />
                Rozłącz
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="calamari-subdomain">Subdomena</Label>
            <Input
              id="calamari-subdomain"
              placeholder="np. momentum"
              value={subdomain}
              onChange={(e) => {
              // Extract subdomain if user pastes full URL like https://foo.calamari.io/...
              let val = e.target.value.trim();
              const match = val.match(/^https?:\/\/([^.]+)\.calamari\.io/);
              if (match) val = match[1];
              setSubdomain(val);
            }}
            />
            <p className="text-xs text-muted-foreground">
              Twoja subdomena Calamari (z adresu <strong>subdomena</strong>.calamari.io)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="calamari-apikey">API Key</Label>
            <Input
              id="calamari-apikey"
              type="password"
              placeholder="Klucz API z Calamari"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <Button
            onClick={() => connectMutation.mutate()}
            disabled={!subdomain.trim() || !apiKey.trim() || isPending}
          >
            <Link className="mr-2 h-4 w-4" />
            {connectMutation.isPending ? "Łączenie..." : "Połącz"}
          </Button>
        </div>
      )}
    </>
  );
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
            className="w-8 shrink-0 flex flex-col gap-1 p-1.5"
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
