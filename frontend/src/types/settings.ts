export interface CalamariConfig {
  subdomain: string | null;
  is_configured: boolean;
  last_synced_at: string | null;
}

export interface ThemeCardProps {
  theme: "light" | "dark";
  label: string;
  selected: boolean;
  disabled: boolean;
  onSelect: (theme: "light" | "dark") => void;
}
