import { useState } from "react";
import { Calendar, LogOut, Settings, UserCog, Users, FolderKanban } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuthStore } from "@/stores/authStore";
import type { SidebarProps } from "@/types/layout";

const NAV_ITEMS = [
  { path: "/", label: "Timeline", icon: Calendar, viewerAllowed: true },
  { path: "/employees", label: "Pracownicy", icon: Users, viewerAllowed: false },
  { path: "/projects", label: "Projekty", icon: FolderKanban, viewerAllowed: false },
] as const;

const SETTINGS_ITEMS = [
  { path: "/settings", label: "Ustawienia", icon: Settings, adminOnly: false },
  { path: "/users", label: "Zarządzaj użytkownikami", icon: UserCog, adminOnly: true },
] as const;

const navItemClass = (active: boolean) =>
  `flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
    active
      ? "bg-violet-500/10 text-violet-700 font-medium dark:bg-violet-500/15 dark:text-violet-400"
      : "text-sidebar-foreground hover:bg-violet-500/8 hover:text-violet-700 dark:hover:text-violet-400"
  }`;

function NavLink({
  path,
  label,
  icon: Icon,
  currentPath,
  onNavigate,
}: {
  path: string;
  label: string;
  icon: React.ElementType;
  currentPath: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <a
      href={path}
      onClick={(e) => { e.preventDefault(); onNavigate(path); }}
      className={navItemClass(currentPath === path)}
    >
      <Icon className="h-4 w-4" />
      {label}
    </a>
  );
}

export function Sidebar({ currentPath, onNavigate }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const isViewer = user?.role === "viewer";
  const [confirmOpen, setConfirmOpen] = useState(false);

  const visibleNavItems = NAV_ITEMS.filter((item) => !isViewer || item.viewerAllowed);
  const visibleSettingsItems = SETTINGS_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="p-4">
        <h1 className="text-xl font-bold">Workforce <span className="text-violet-500">Planner</span></h1>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 p-2">
        {visibleNavItems.map((item) => (
          <NavLink key={item.path} {...item} currentPath={currentPath} onNavigate={onNavigate} />
        ))}
      </nav>
      <Separator />
      <div className="p-2 space-y-1">
        {visibleSettingsItems.map((item) => (
          <NavLink key={item.path} {...item} currentPath={currentPath} onNavigate={onNavigate} />
        ))}
        <div className="px-3 py-1 text-xs text-muted-foreground truncate">
          {user?.full_name}
        </div>
        <button
          className={navItemClass(false)}
          onClick={() => setConfirmOpen(true)}
        >
          <LogOut className="h-4 w-4" />
          Wyloguj
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Wylogowanie"
        description="Czy na pewno chcesz się wylogować?"
        confirmLabel="Wyloguj"
        onConfirm={logout}
      />
    </aside>
  );
}
