import React, { createContext, useCallback, useContext, useState } from "react";

interface Toast { id: number; message: string; kind: "success" | "error" | "info"; }
const ToastContext = createContext<{ push: (message: string, kind?: Toast["kind"]) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, kind: Toast["kind"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div style={{ position: "fixed", bottom: 20, left: 20, zIndex: 200, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`alert ${t.kind === "error" ? "alert-error" : t.kind === "success" ? "alert-success" : ""}`}
            style={{ boxShadow: "var(--shadow-md)", minWidth: 220, background: t.kind === "info" ? "#1E293B" : undefined, color: t.kind === "info" ? "#fff" : undefined }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
