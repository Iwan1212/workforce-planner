import { Calendar, LogOut, Settings, Users, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/authStore";

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

const NAV_ITEMS = [
  { path: "/", label: "Timeline", icon: Calendar },
  { path: "/employees", label: "Pracownicy", icon: Users },
  { path: "/projects", label: "Projekty", icon: FolderKanban },
] as const;

export function Sidebar({ currentPath, onNavigate }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === "admin";

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="p-4">
        <h1 className="text-lg font-bold">Workforce Planner</h1>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <a
            key={path}
            href={path}
            onClick={(e) => { e.preventDefault(); onNavigate(path); }}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              currentPath === path
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </a>
        ))}
      </nav>
      <Separator />
      <div className="p-2">
        {isAdmin && (
          <a
            href="/users"
            onClick={(e) => { e.preventDefault(); onNavigate("/users"); }}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              currentPath === "/users"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <Settings className="h-4 w-4" />
            Zarządzaj użytkownikami
          </a>
        )}
        <div className="mt-1 px-3 py-1 text-xs text-muted-foreground truncate">
          {user?.full_name}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Wyloguj
        </Button>
      </div>
    </aside>
  );
}
