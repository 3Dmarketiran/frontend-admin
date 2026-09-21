import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, ApiError } from "../lib/auth";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
    navigate(isAdmin ? "/admin" : "/seller", { replace: true });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ورود ناموفق بود.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>ورود به پنل</h1>
        <p className="sub">برای ادمین و فروشندگان پلتفرم</p>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-group">
          <label htmlFor="email">ایمیل</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </div>
        <div className="form-group">
          <label htmlFor="password">رمز عبور</label>
          <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        <button className="btn btn-primary btn-block" disabled={submitting} type="submit">
          {submitting ? "در حال ورود..." : "ورود"}
        </button>
      </form>
    </div>
  );
}
