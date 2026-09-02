import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { LoginForm } from "@/components/auth/LoginForm";
import { Layout } from "@/components/layout/Layout";
import { EmployeeList } from "@/components/employees/EmployeeList";
import { ProjectList } from "@/components/projects/ProjectList";
import { Timeline } from "@/components/timeline/Timeline";
import { UserManagement } from "@/components/users/UserManagement";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { ProjectTimeline } from "@/components/project-timeline/ProjectTimeline";
import { Dashboard } from "@/components/dashboard/Dashboard";

const LANDING_PATH = "/dashboard";

/** "/" is an alias for the landing page, never a page of its own. */
function normalizePath(pathname: string): string {
  return pathname === "/" ? LANDING_PATH : pathname;
}

function App() {
  const { isAuthenticated, isLoading, checkAuth, user } = useAuthStore();
  const [currentPath, setCurrentPath] = useState(
    // The app root has to render something, but no page should be "the one
    // without a path": "/" is rewritten to the landing page's own address.
    () => normalizePath(window.location.pathname),
  );

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const handlePopState = () =>
      setCurrentPath(normalizePath(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Apply dark class based on user theme preference
  useEffect(() => {
    if (user?.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [user?.theme]);

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(normalizePath(path));
  };

  // Rewrite the bare root without leaving a history entry, so Back still
  // returns to wherever the user came from.
  useEffect(() => {
    if (window.location.pathname === "/") {
      window.history.replaceState({}, "", LANDING_PATH);
    }
  }, [currentPath]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const isAdmin = user?.role === "admin";
  const isViewer = user?.role === "viewer";

  const ROUTE_ACCESS: Record<string, boolean> = {
    "/employees": !isViewer,
    "/projects": !isViewer,
    "/users": isAdmin,
  };

  if (currentPath in ROUTE_ACCESS && !ROUTE_ACCESS[currentPath]) {
    navigate(LANDING_PATH);
    return null;
  }

  return (
    <Layout currentPath={currentPath} onNavigate={navigate}>
      {currentPath === "/dashboard" && <Dashboard onNavigate={navigate} />}
      {currentPath === "/timeline" && <Timeline onNavigate={navigate} />}
      {currentPath === "/project-timeline" && <ProjectTimeline />}
      {currentPath === "/employees" && <EmployeeList />}
      {currentPath === "/projects" && <ProjectList />}
      {currentPath === "/users" && <UserManagement />}
      {currentPath === "/settings" && <SettingsPage />}
    </Layout>
  );
}

export default App;
