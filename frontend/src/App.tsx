import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { LoginForm } from "@/components/auth/LoginForm";
import { Layout } from "@/components/layout/Layout";
import { EmployeeList } from "@/components/employees/EmployeeList";
import { ProjectList } from "@/components/projects/ProjectList";
import { Timeline } from "@/components/timeline/Timeline";

function App() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [currentPath, setCurrentPath] = useState("/");

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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

  return (
    <Layout currentPath={currentPath} onNavigate={setCurrentPath}>
      {currentPath === "/" && <Timeline />}
      {currentPath === "/employees" && <EmployeeList />}
      {currentPath === "/projects" && <ProjectList />}
    </Layout>
  );
}

export default App;
