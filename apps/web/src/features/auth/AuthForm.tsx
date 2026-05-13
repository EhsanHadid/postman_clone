import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

const brandLogoUrl = `${import.meta.env.BASE_URL}assets/brand/logo.svg`;

export function AuthForm() {
  const navigate = useNavigate();
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("demo123");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === "login") {
      await login({ username, password });
    } else {
      await register({ username, password });
    }
    navigate("/");
  };

  return (
    <form className="auth-form card" onSubmit={submit}>
      <img className="auth-form__logo" src={brandLogoUrl} alt="Postman Clone" />
      <div className="auth-form__eyebrow">Local API Workspace</div>
      <h1>Postman Clone</h1>
      <p>Private, dark-mode API tooling for local HTTP and tRPC workflows.</p>

      <label className="auth-form__field">
        <span>Username</span>
        <input
          className="input"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </label>

      <label className="auth-form__field">
        <span>Password</span>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      {error ? <div className="auth-form__error">{error}</div> : null}

      <div className="auth-form__actions">
        <button className="button button-primary" disabled={loading} type="submit">
          {loading ? "Working..." : mode === "login" ? "Login" : "Create User"}
        </button>
        <button
          className="button button-subtle"
          onClick={() => setMode((current) => (current === "login" ? "register" : "login"))}
          type="button"
        >
          {mode === "login" ? "Register Instead" : "Use Existing User"}
        </button>
      </div>
    </form>
  );
}
