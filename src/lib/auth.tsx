import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  api,
  ApiError,
  clearStoredSessionId,
  getStoredSessionId,
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

  // Prevent an old /me request from overwriting a newer login state.
  const authRequestId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const requestId = ++authRequestId.current;

    async function restoreSession() {
      const sessionId = getStoredSessionId();

      // There is no local session, so there is no reason to call /me.
      // This also prevents unnecessary auth requests during the first render.
      if (!sessionId) {
        if (!cancelled && requestId === authRequestId.current) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await api.get<{ user: SessionUser }>("/api/auth/me");

        if (
          !cancelled &&
          requestId === authRequestId.current
        ) {
          setUser(response.user);
        }
      } catch {
        // The stored session is no longer valid.
        clearStoredSessionId();

        if (
          !cancelled &&
          requestId === authRequestId.current
        ) {
          setUser(null);
        }
      } finally {
        if (
          !cancelled &&
          requestId === authRequestId.current
        ) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email: string, password: string) {
    // Invalidate any older session-restore request so it cannot
    // overwrite the user returned by this login.
    authRequestId.current += 1;

    setLoading(true);

    try {
      const response = await api.post<{
        user: SessionUser;
        sessionId?: string;
        expiresAt?: string;
      }>("/api/auth/login", {
        email,
        password,
      });

      // Store the session BEFORE updating the authenticated user.
      // This guarantees that every following API request has the
      // correct Authorization header.
      if (response.sessionId) {
        setStoredSessionId(response.sessionId);
      }

      setUser(response.user);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    // Invalidate any pending auth restoration request.
    authRequestId.current += 1;

    try {
      await api.post("/api/auth/logout");
    } catch {
      // Even if the server session is already expired,
      // local authentication state must still be cleared.
    }

    clearStoredSessionId();
    setUser(null);
    setLoading(false);
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
