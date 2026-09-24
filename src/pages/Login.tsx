import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, ApiError } from "../lib/auth";

export default function Login() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Do not redirect while AuthProvider is still restoring
    // the existing session.
    if (loading || !user) {
      return;
    }

    const isAdmin =
      user.role === "ADMIN" || user.role === "SUPER_ADMIN";

    navigate(isAdmin ? "/admin" : "/seller", {
      replace: true,
    });
  }, [loading, user, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (submitting) {
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      // Redirect is intentionally handled by the effect above.
      // This prevents navigation during the login render/update cycle.
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof TypeError
            ? "ارتباط با سرور برقرار نشد. آدرس API، CORS و وضعیت Backend را بررسی کنید."
            : "ورود ناموفق بود."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="login-loading">
            <div className="login-spinner" aria-hidden="true" />
            <p>در حال بررسی نشست کاربری...</p>
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="login-loading">
            <div className="login-spinner" aria-hidden="true" />
            <p>در حال ورود به پنل...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>ورود به پنل</h1>

        <p className="sub">
          برای ادمین و فروشندگان پلتفرم
        </p>

        {error && (
          <div
            className="alert alert-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="email">
            ایمیل
          </label>

          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            inputMode="email"
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">
            رمز عبور
          </label>

          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={submitting}
          />
        </div>

        <button
          className="btn btn-primary btn-block"
          disabled={submitting}
          type="submit"
        >
          {submitting
            ? "در حال ورود..."
            : "ورود"}
        </button>
      </form>
    </div>
  );
}
