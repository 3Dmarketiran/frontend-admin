import React from "react";

export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

const VIS_MAP: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "پیش‌نویس", cls: "badge-muted" },
  PUBLISHED: { label: "منتشرشده", cls: "badge-success" },
  HIDDEN: { label: "مخفی", cls: "badge-warning" },
};
export function VisibilityBadge({ v }: { v: string }) {
  const m = VIS_MAP[v] ?? { label: v, cls: "badge-muted" };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

const JOB_MAP: Record<string, { label: string; cls: string }> = {
  QUEUED: { label: "در صف", cls: "badge-muted" },
  PROCESSING: { label: "در حال پردازش", cls: "badge-info" },
  SUCCESS: { label: "موفق", cls: "badge-success" },
  FAILED: { label: "ناموفق", cls: "badge-error" },
};
export function JobStatusBadge({ v }: { v: string }) {
  const m = JOB_MAP[v] ?? { label: v, cls: "badge-muted" };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

const SUB_MAP: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "فعال", cls: "badge-success" },
  EXPIRED: { label: "منقضی", cls: "badge-error" },
  PENDING: { label: "در انتظار", cls: "badge-warning" },
  CANCELLED: { label: "لغوشده", cls: "badge-muted" },
};
export function SubStatusBadge({ v }: { v: string }) {
  const m = SUB_MAP[v] ?? { label: v, cls: "badge-muted" };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon = "📭", text }: { icon?: string; text: string }) {
  return (
    <div className="empty-state">
      <div className="icon" aria-hidden>{icon}</div>
      <p>{text}</p>
    </div>
  );
}

export function Spinner() {
  return <div className="skeleton" style={{ height: 120, width: "100%" }} />;
}

export function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fa-IR", { year: "numeric", month: "short", day: "numeric" });
}

export function fmtDateTime(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("fa-IR");
}
