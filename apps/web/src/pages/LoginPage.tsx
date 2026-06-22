import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { AuthForm } from "../features/auth/AuthForm";
import { getDesktopDownloadUrl, useAppConfigStore } from "../store/appConfigStore";
import { useAuthStore } from "../store/authStore";
import { isDesktopRenderer } from "../services/runtime";

export function LoginPage() {
  const user = useAuthStore((state) => state.user);
  const desktopDownloadUrl = useAppConfigStore(getDesktopDownloadUrl);
  const fetchAppConfig = useAppConfigStore((state) => state.fetchAppConfig);

  useEffect(() => {
    void fetchAppConfig();
  }, [fetchAppConfig]);

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="login-page">
      <div className="login-page__hero">
        <div className="login-page__panel card">
          <div className="login-page__eyebrow">Private deployment</div>
          <h1>Test APIs without the browser getting in the way.</h1>
          <p>
            HTTP and tRPC execution run through the NestJS backend so cookies, scripts,
            history, and environment interpolation stay centralized.
          </p>
          {!isDesktopRenderer() && desktopDownloadUrl ? (
            <a
              className="button button-subtle login-page__download"
              href={desktopDownloadUrl}
              rel="noreferrer"
              target="_blank"
            >
              Download Desktop App
            </a>
          ) : null}
        </div>
      </div>
      <AuthForm />
    </main>
  );
}
