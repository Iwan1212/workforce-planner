// The part of Google Identity Services (accounts.google.com/gsi/client) the
// login screen uses. Declared here rather than pulling in @types/google.accounts.

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
}

interface GoogleButtonConfiguration {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
  locale?: string;
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: GoogleIdConfiguration) => void;
        renderButton: (
          parent: HTMLElement,
          options: GoogleButtonConfiguration,
        ) => void;
      };
    };
  };
}
