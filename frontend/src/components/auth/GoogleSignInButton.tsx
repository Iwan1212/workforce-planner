import { useEffect, useRef, useState } from "react";

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let gisScript: Promise<void> | null = null;

/** Load Google Identity Services once per page, however many times asked. */
function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gisScript) {
    gisScript = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GIS_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        gisScript = null; // allow a retry on the next mount
        reject(new Error("Google Identity Services failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return gisScript;
}

type GoogleSignInButtonProps = {
  clientId: string;
  onCredential: (credential: string) => void;
};

/**
 * Google's own sign-in button. Google renders it, including its text, in an
 * iframe; this component only decides where it goes and what happens with the
 * ID token Google hands back.
 */
export function GoogleSignInButton({
  clientId,
  onCredential,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;
    loadGoogleIdentity()
      .then(() => {
        const container = containerRef.current;
        const gis = window.google?.accounts.id;
        if (cancelled || !container || !gis) return;
        gis.initialize({
          client_id: clientId,
          callback: (response) => onCredentialRef.current(response.credential),
        });
        container.replaceChildren();
        gis.renderButton(container, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
          logo_alignment: "center",
          // Google caps the button at 400px and needs a number, not "100%".
          width: Math.min(container.offsetWidth, 400),
          locale: "pl",
        });
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (loadFailed) {
    return (
      <p className="text-sm text-destructive">
        Nie udało się połączyć z Google. Spróbuj ponownie za chwilę.
      </p>
    );
  }

  return <div ref={containerRef} className="flex min-h-11 w-full justify-center" />;
}
