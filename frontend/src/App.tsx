import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { LoginForm } from "@/components/auth/LoginForm";
import { Layout } from "@/components/layout/Layout";
import { EmployeeList } from "@/components/employees/EmployeeList";
import { ProjectList } from "@/components/projects/ProjectList";
import { Timeline } from "@/components/timeline/Timeline";
import { UserManagement } from "@/components/users/UserManagement";
import { SettingsPage } from "@/components/settings/SettingsPage";

function App() {
  const { isAuthenticated, isLoading, checkAuth, user } = useAuthStore();
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
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
    setCurrentPath(path);
  };

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
    navigate("/");
    return null;
  }

  return (
    <Layout currentPath={currentPath} onNavigate={navigate}>
      {currentPath === "/" && <Timeline />}
      {currentPath === "/employees" && <EmployeeList />}
      {currentPath === "/projects" && <ProjectList />}
      {currentPath === "/users" && <UserManagement />}
      {currentPath === "/settings" && <SettingsPage />}
    </Layout>
  );
}

export default App;
