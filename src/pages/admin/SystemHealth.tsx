import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/Layout";
import { Spinner } from "../../components/ui";
import type { HealthReport } from "../../types";

export default function AdminSystemHealth() {
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.get<HealthReport>("/api/health").then(setHealth).finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <PageHeader title="سلامت سیستم" />
      <div className="content">
        {loading || !health ? <Spinner /> : (
          <>
            <div className="card" style={{ marginBottom: 16 }}>
              وضعیت کلی: {health.status === "ok" ? <span className="badge badge-success">سالم</span> : <span className="badge badge-error">دارای اختلال</span>}
              <span style={{ marginRight: 12, color: "var(--color-text-muted)", fontSize: ".85rem" }}>مدت فعالیت سرور: {Math.floor(health.uptimeMs / 60000)} دقیقه</span>
            </div>
            <div className="grid grid-3">
              <ServiceCard title="دیتابیس" ok={health.services.database.status === "ok"} detail={`تأخیر: ${health.services.database.latencyMs ?? "—"} میلی‌ثانیه`} />
              <ServiceCard title="ذخیره‌سازی فایل" ok={health.services.storage.status === "ok"} detail={`ارائه‌دهنده: ${health.services.storage.provider}`} />
              <ServiceCard title="اتصال GitHub" ok={health.services.github.status === "ok"} detail={health.services.github.message ?? (health.services.github.configured ? "پیکربندی شده" : "پیکربندی نشده")} />
            </div>
            <button className="btn btn-outline" onClick={load} style={{ marginTop: 16 }}>بازخوانی</button>
          </>
        )}
      </div>
    </>
  );
}

function ServiceCard({ title, ok, detail }: { title: string; ok: boolean; detail: string }) {
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <strong>{title}</strong>
        <span className={`badge ${ok ? "badge-success" : "badge-error"}`}>{ok ? "سالم" : "خطا"}</span>
      </div>
      <div style={{ fontSize: ".82rem", color: "var(--color-text-muted)" }}>{detail}</div>
    </div>
  );
}
