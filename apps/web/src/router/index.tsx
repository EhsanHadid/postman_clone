import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage";
import { WorkspacePage } from "../pages/WorkspacePage";
import { useAuthStore } from "../store/authStore";

function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const initialized = useAuthStore((state) => state.initialized);
  const user = useAuthStore((state) => state.user);

  if (!initialized) {
    return <div className="app-loading">Loading Postman Clone...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export function RouterProvider() {
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <WorkspacePage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
