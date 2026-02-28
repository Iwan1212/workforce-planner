import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { LoginForm } from "@/components/auth/LoginForm";
import { Layout } from "@/components/layout/Layout";
import { EmployeeList } from "@/components/employees/EmployeeList";
import { ProjectList } from "@/components/projects/ProjectList";
import { Timeline } from "@/components/timeline/Timeline";
import { UserManagement } from "@/components/users/UserManagement";

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

  return (
    <Layout currentPath={currentPath} onNavigate={navigate}>
      {currentPath === "/" && <Timeline />}
      {currentPath === "/employees" && <EmployeeList />}
      {currentPath === "/projects" && <ProjectList />}
      {currentPath === "/users" && isAdmin && <UserManagement />}
    </Layout>
  );
}

export default App;
