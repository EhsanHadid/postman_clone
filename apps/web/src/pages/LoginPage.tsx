import { Navigate } from "react-router-dom";
import { DesktopDownloadButton } from "../components/DesktopDownloadButton";
import { AuthForm } from "../features/auth/AuthForm";
import { useAuthStore } from "../store/authStore";

export function LoginPage() {
  const user = useAuthStore((state) => state.user);

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
          <DesktopDownloadButton
            className="button button-subtle login-page__download"
            label="Download Desktop App"
          />
        </div>
      </div>
      <AuthForm />
    </main>
  );
}
