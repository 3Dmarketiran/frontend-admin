import React, { createContext, useContext, useEffect, useState } from "react";
import {
  api,
  ApiError,
  clearStoredSessionId,
  setStoredSessionId,
} from "./api";
import type { SessionUser } from "../types";

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const { user } = await api.get<{ user: SessionUser }>("/api/auth/me");
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(email: string, password: string) {
    const response = await api.post<{
      user: SessionUser;
      sessionId?: string;
      expiresAt?: string;
    }>("/api/auth/login", {
      email,
      password,
    });

    // ذخیره سشن برای درخواست‌های بعدی
    if (response.sessionId) {
      setStoredSessionId(response.sessionId);
    }

    // مهم:
    // بعد از ورود، مستقیماً کاربر برگشتی از login را ثبت می‌کنیم.
    // دیگر برای کامل شدن login منتظر /me نمی‌مانیم.
    setUser(response.user);
    setLoading(false);
  }

  async function logout() {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // حتی اگر سشن سرور منقضی شده باشد،
      // وضعیت محلی باید پاک شود.
    }

    clearStoredSessionId();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
}

export { ApiError };
