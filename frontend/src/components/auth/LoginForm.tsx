import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/authStore";
import { requestPasswordReset } from "@/api/auth";
import { AuthCard } from "./AuthCard";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, error } = useAuthStore();

  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch {
      // error is set in store
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetRequest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!resetEmail) return;

    setResetSending(true);
    setResetMessage("");
    try {
      const result = await requestPasswordReset(resetEmail);
      setResetMessage(result.message);
    } catch {
      setResetMessage("Wystąpił błąd. Spróbuj ponownie.");
    } finally {
      setResetSending(false);
    }
  };

  if (showReset) {
    return (
      <AuthCard
        title="Reset hasła"
        description="Podaj email, aby otrzymać link do resetu"
      >
        <form onSubmit={handleResetRequest} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="email@firma.pl"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
            />
          </div>
          {resetMessage && (
            <p className="text-sm text-muted-foreground">{resetMessage}</p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={resetSending}
          >
            {resetSending ? "Wysyłanie..." : "Wyślij link do resetu"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setShowReset(false);
              setResetMessage("");
            }}
          >
            Wróć do logowania
          </Button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Workforce Planner" description="Zaloguj się do systemu">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="email@firma.pl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Hasło</Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && (
          <p className="text-sm text-destructive">
            Nieprawidłowy email lub hasło
          </p>
        )}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Logowanie..." : "Zaloguj się"}
        </Button>
        <button
          type="button"
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setShowReset(true)}
        >
          Nie pamiętam hasła
        </button>
      </form>
    </AuthCard>
  );
}
