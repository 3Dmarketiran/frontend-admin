import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/Layout";
import { EmptyState, Spinner, fmtDateTime } from "../../components/ui";
import type { AuditLogEntry } from "../../types";

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "ورود",
  LOGOUT: "خروج",
  PRODUCT_CREATED: "ایجاد محصول",
  PRODUCT_EDITED: "ویرایش محصول",
  PRODUCT_DELETED: "حذف محصول",
  PRODUCT_PUBLISHED: "انتشار محصول",
  PRODUCT_UNPUBLISHED: "لغو انتشار محصول",
  PRODUCT_FORCE_HIDDEN: "مخفی‌سازی اجباری محصول",
  SELLER_CREATED: "ایجاد فروشنده",
  SUBSCRIPTION_ACTIVATED: "فعال‌سازی اشتراک",
  SUBSCRIPTION_CANCELLED: "لغو اشتراک",
  PLATFORM_SETTINGS_UPDATED: "تغییر تنظیمات پلتفرم",
  GITHUB_CONFIG_CHANGED: "تغییر پیکربندی GitHub",
  GITHUB_CONNECTION_TESTED: "تست اتصال GitHub",
};

export default function AdminAuditLogs() {
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<{ items: AuditLogEntry[]; total: number }>(`/api/admin/audit-logs?page=${page}&pageSize=30`)
      .then((r) => { setItems(r.items); setTotal(r.total); })
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / 30));

  return (
    <>
      <PageHeader title="گزارش‌های رویداد (Audit Log)" />
      <div className="content">
        <div className="section-head"><h2>{total} رویداد ثبت‌شده</h2></div>
        {loading ? <Spinner /> : items.length === 0 ? (
          <EmptyState icon="🗒️" text="هنوز رویدادی ثبت نشده است." />
        ) : (
          <>
            <div className="card table-wrap">
              <table>
                <thead><tr><th>عملیات</th><th>موجودیت</th><th>عامل</th><th>زمان</th></tr></thead>
                <tbody>
                  {items.map((l) => (
                    <tr key={l.id}>
                      <td>{ACTION_LABELS[l.action] ?? l.action}</td>
                      <td>{l.entity}{l.entityId ? ` (${l.entityId.slice(0, 8)}…)` : ""}</td>
                      <td>{l.actor?.email ?? "سیستم"}</td>
                      <td>{fmtDateTime(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "center" }}>
              <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>قبلی</button>
              <span style={{ alignSelf: "center", fontSize: ".85rem" }}>صفحه {page} از {totalPages}</span>
              <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>بعدی</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
