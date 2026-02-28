import { useState } from "react";
import { Calendar, LogOut, Users, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="p-4">
        <h1 className="text-lg font-bold">Workforce Planner</h1>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <button
            key={path}
            onClick={() => onNavigate(path)}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              currentPath === path
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>
      <Separator />
      <div className="p-3">
        <div className="mb-2 px-3 text-xs text-muted-foreground truncate">
          {user?.full_name}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3"
          onClick={() => setConfirmOpen(true)}
        >
          <LogOut className="h-4 w-4" />
          Wyloguj
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Wylogowanie</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Czy na pewno chcesz się wylogować?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={logout}>Wyloguj</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
