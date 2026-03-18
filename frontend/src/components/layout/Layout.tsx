import { Sidebar } from "./Sidebar";
import type { LayoutProps } from "@/types/layout";

export function Layout({ children, currentPath, onNavigate }: LayoutProps) {
  return (
    <div className="flex min-w-[1280px] h-screen overflow-hidden">
      <Sidebar currentPath={currentPath} onNavigate={onNavigate} />
      <main className="flex-1 overflow-auto bg-background">{children}</main>
    </div>
  );
}
