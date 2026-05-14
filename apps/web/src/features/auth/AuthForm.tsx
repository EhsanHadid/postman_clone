import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { EyeIcon, EyeOffIcon } from "../../components/AppIcons";
import { useAuthStore } from "../../store/authStore";

const brandLogoUrl = `${import.meta.env.BASE_URL}assets/brand/logo.svg`;

export function AuthForm() {
  const navigate = useNavigate();
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
          autoComplete={mode === "login" ? "username" : "new-username"}
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </label>

      <label className="auth-form__field">
        <span>Password</span>
        <div className="auth-form__password-wrap">
          <input
            className="input"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="icon-button auth-form__password-toggle"
            onClick={() => setShowPassword((value) => !value)}
            title={showPassword ? "Hide password" : "Show password"}
            type="button"
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </label>

      {error ? <div className="auth-form__error">{error}</div> : null}

      <div className="auth-form__actions">
        <button className="button button-primary" disabled={loading} type="submit">
          {loading ? "Working..." : mode === "login" ? "Login" : "Create User"}
        </button>
        <button
          className="button button-subtle"
          onClick={() => {
            setMode((current) => (current === "login" ? "register" : "login"));
            setUsername("");
            setPassword("");
          }}
          type="button"
        >
          {mode === "login" ? "Register Instead" : "Use Existing User"}
        </button>
      </div>
    </form>
  );
}
