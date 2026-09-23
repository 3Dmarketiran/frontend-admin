import React from "react";

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: string;
  tone?: "primary" | "blue" | "green" | "orange" | "red";
}) {
  return (
    <div className={`card stat-card stat-card-${tone}`}>
      <div className="stat-card-glow" />

      <div className="stat-card-top">
        <div className="stat-card-icon">
          {icon || "✦"}
        </div>

        <span className="stat-card-dot" />
      </div>

      <div className="stat-card-content">
        <div className="label">{label}</div>
        <div className="value">{value}</div>

        {sub && <div className="sub">{sub}</div>}
      </div>
    </div>
  );
}

const VIS_MAP: Record<string, { label: string; cls: string; icon: string }> = {
  DRAFT: {
    label: "پیش‌نویس",
    cls: "badge-muted",
    icon: "○",
  },
  PUBLISHED: {
    label: "منتشرشده",
    cls: "badge-success",
    icon: "✓",
  },
  HIDDEN: {
    label: "مخفی",
    cls: "badge-warning",
    icon: "−",
  },
};

export function VisibilityBadge({ v }: { v: string }) {
  const m = VIS_MAP[v] ?? {
    label: v,
    cls: "badge-muted",
    icon: "○",
  };

  return (
    <span className={`badge ${m.cls}`}>
      <span>{m.icon}</span>
      {m.label}
    </span>
  );
}

const JOB_MAP: Record<string, { label: string; cls: string; icon: string }> = {
  QUEUED: {
    label: "در صف",
    cls: "badge-muted",
    icon: "○",
  },
  PROCESSING: {
    label: "در حال پردازش",
    cls: "badge-info",
    icon: "◌",
  },
  SUCCESS: {
    label: "موفق",
    cls: "badge-success",
    icon: "✓",
  },
  FAILED: {
    label: "ناموفق",
    cls: "badge-error",
    icon: "!",
  },
};

export function JobStatusBadge({ v }: { v: string }) {
  const m = JOB_MAP[v] ?? {
    label: v,
    cls: "badge-muted",
    icon: "○",
  };

  return (
    <span className={`badge ${m.cls}`}>
      <span>{m.icon}</span>
      {m.label}
    </span>
  );
}

const SUB_MAP: Record<string, { label: string; cls: string; icon: string }> = {
  ACTIVE: {
    label: "فعال",
    cls: "badge-success",
    icon: "✓",
  },
  EXPIRED: {
    label: "منقضی",
    cls: "badge-error",
    icon: "!",
  },
  PENDING: {
    label: "در انتظار",
    cls: "badge-warning",
    icon: "◌",
  },
  CANCELLED: {
    label: "لغوشده",
    cls: "badge-muted",
    icon: "−",
  },
};

export function SubStatusBadge({ v }: { v: string }) {
  const m = SUB_MAP[v] ?? {
    label: v,
    cls: "badge-muted",
    icon: "○",
  };

  return (
    <span className={`badge ${m.cls}`}>
      <span>{m.icon}</span>
      {m.label}
    </span>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="modal-eyebrow">3D MARKET</span>
            <h3>{title}</h3>
          </div>

          <button
            className="modal-close"
            onClick={onClose}
            aria-label="بستن"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon = "◇",
  text,
  title,
  description,
}: {
  icon?: string;
  text?: string;
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-visual">
        <div className="empty-state-icon" aria-hidden>
          {icon}
        </div>
      </div>

      <h3>{title ?? "چیزی برای نمایش وجود ندارد"}</h3>
      <p>{description ?? text}</p>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="loading-panel">
      <div className="loading-spinner" />
      <span>در حال دریافت اطلاعات...</span>
    </div>
  );
}

export function fmtDate(d?: string | null) {
  if (!d) return "—";

  return new Date(d).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtDateTime(d?: string | null) {
  if (!d) return "—";

  return new Date(d).toLocaleString("fa-IR");
}