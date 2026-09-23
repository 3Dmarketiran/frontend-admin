import React, { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { PageHeader } from "../../components/Layout";
import { EmptyState, Spinner, VisibilityBadge, fmtDate } from "../../components/ui";
import { useToast } from "../../lib/toast";
import type { Product } from "../../types";

export default function AdminProducts() {
  const { push } = useToast();
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState("");

  function load() {
    setLoading(true);
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (visibility) q.set("visibility", visibility);
    q.set("pageSize", "50");
    api.get<{ items: Product[]; total: number }>(`/api/products?${q}`)
      .then((r) => { setItems(r.items); setTotal(r.total); })
      .finally(() => setLoading(false));
  }
  useEffect(load, [visibility]);

  async function forceHide(p: Product) {
    if (!confirm(`محصول «${p.name}» به‌صورت سراسری مخفی شود؟`)) return;
    try {
      await api.post(`/api/products/${p.id}/force-hide`);
      push("محصول مخفی شد.", "success");
      load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "خطا در مخفی‌سازی.", "error");
    }
  }

  return (
    <>
      <PageHeader title="محصولات" />
      <div className="content">
        <div className="section-head">
          <h2>همه محصولات ({total})</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="جستجو..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-border)" }} />
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-border)" }}>
              <option value="">همه وضعیت‌ها</option>
              <option value="DRAFT">پیش‌نویس</option>
              <option value="PUBLISHED">منتشرشده</option>
              <option value="HIDDEN">مخفی</option>
            </select>
            <button className="btn btn-outline" onClick={load}>جستجو</button>
          </div>
        </div>

        {loading ? <Spinner /> : items.length === 0 ? (
          <EmptyState icon="📦" text="محصولی یافت نشد." />
        ) : (
          <div className="card table-wrap">
            <table>
              <thead><tr><th>محصول</th><th>فروشنده</th><th>وضعیت</th><th>تاریخ ایجاد</th><th>عملیات</th></tr></thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.seller?.storeName}</td>
                    
                    <td><VisibilityBadge v={p.visibility} /></td>
                    <td>{fmtDate(p.createdAt)}</td>
                    <td>{p.visibility !== "HIDDEN" && <button className="btn btn-danger btn-sm" onClick={() => forceHide(p)}>مخفی‌سازی</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
