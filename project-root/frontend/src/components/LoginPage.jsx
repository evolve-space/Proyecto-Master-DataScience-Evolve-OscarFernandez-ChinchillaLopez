import { useState } from "react";
import appLogo from "../assets/icono_web.png";

export default function LoginPage({
  error,
  language,
  loading,
  onLanguageChange,
  onLogin,
  onThemeChange,
  t,
  theme,
}) {
  const [email, setEmail] = useState("admin.demo@example.com");
  const [password, setPassword] = useState("demo1234");
  const [showPassword, setShowPassword] = useState(false);

  function submitLogin(event) {
    event.preventDefault();
    onLogin({ email, password });
  }

  return (
    <main className="login-page">
      <section className="login-shell panel">
        <div className="login-brand">
          <img className="brand-logo" src={appLogo} alt="" />
          <div>
            <p className="eyebrow">{t.auth.eyebrow}</p>
            <h1>{t.topbar.title}</h1>
            <p>{t.auth.description}</p>
          </div>
        </div>

        <form className="login-form" onSubmit={submitLogin}>
          <label>
            <span>{t.auth.email}</span>
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            <span>{t.auth.password}</span>
            <div className="password-input-wrap">
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                <span aria-hidden="true">{showPassword ? "⊘" : "◉"}</span>
              </button>
            </div>
          </label>

          {error && <p className="inline-error">{error}</p>}

          <button className="primary-button" disabled={loading} type="submit">
            {loading ? t.auth.loading : t.auth.login}
          </button>
        </form>

        <div className="login-demo-box">
          <strong>{t.auth.demoTitle}</strong>
          <code>admin.demo@example.com / demo1234</code>
          <code>empresa.demo@example.com / demo1234</code>
          <code>usuario.demo@example.com / demo1234</code>
        </div>

        <div className="login-controls">
          <div className="compact-control" aria-label={t.controls.theme}>
            <button
              className={theme === "dark" ? "active" : ""}
              onClick={() => onThemeChange("dark")}
              type="button"
            >
              {t.controls.themeDarkShort}
            </button>
            <button
              className={theme === "light" ? "active" : ""}
              onClick={() => onThemeChange("light")}
              type="button"
            >
              {t.controls.themeLightShort}
            </button>
          </div>
          <div className="compact-control" aria-label={t.controls.language}>
            <button
              className={language === "es" ? "active" : ""}
              onClick={() => onLanguageChange("es")}
              type="button"
            >
              {t.controls.languageEs}
            </button>
            <button
              className={language === "en" ? "active" : ""}
              onClick={() => onLanguageChange("en")}
              type="button"
            >
              {t.controls.languageEn}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
