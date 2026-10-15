import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuthConfig } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { AuthCard } from "./AuthCard";
import { GoogleSignInButton } from "./GoogleSignInButton";

export function LoginForm() {
  const { loginWithGoogle, error } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const config = useQuery({
    queryKey: ["auth-config"],
    queryFn: getAuthConfig,
    staleTime: Infinity,
  });

  const handleCredential = async (credential: string) => {
    setIsSubmitting(true);
    try {
      await loginWithGoogle(credential);
    } catch {
      // error is set in store
    } finally {
      setIsSubmitting(false);
    }
  };

  const clientId = config.data?.google_client_id;

  return (
    <AuthCard
      title={
        <>
          Workforce <span className="text-violet-500">Planner</span>
        </>
      }
      description="Zaloguj się do systemu"
    >
      <div className="space-y-4">
        {config.isPending ? (
          <p className="text-center text-sm text-muted-foreground">
            Ładowanie...
          </p>
        ) : config.isError ? (
          <p className="text-sm text-destructive">
            Wystąpił błąd. Spróbuj ponownie.
          </p>
        ) : !clientId ? (
          <p className="text-sm text-muted-foreground">
            Logowanie przez Google nie jest jeszcze skonfigurowane. Skontaktuj
            się z administratorem.
          </p>
        ) : isSubmitting ? (
          <p className="text-center text-sm text-muted-foreground">
            Logowanie...
          </p>
        ) : (
          <GoogleSignInButton
            clientId={clientId}
            onCredential={handleCredential}
          />
        )}
        {error && !isSubmitting && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    </AuthCard>
  );
}
