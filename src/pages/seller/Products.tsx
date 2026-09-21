import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { PageHeader } from "../../components/Layout";
import { EmptyState, Spinner, VisibilityBadge, fmtDate } from "../../components/ui";
import { useToast } from "../../lib/toast";
import type { Product } from "../../types";

export default function SellerProducts() {
  const { user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const sellerId = user!.seller!.id;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "DRAFT" | "PUBLISHED" | "HIDDEN">("all");

  function load() {
    setLoading(true);
    api.get<{ items: Product[] }>(`/api/products?sellerId=${sellerId}&pageSize=100`).then((r) => setProducts(r.items)).finally(() => setLoading(false));
  }
  useEffect(load, [sellerId]);

  const filtered = tab === "all" ? products : products.filter((p) => p.visibility === tab);

  async function publish(p: Product) {
    try {
      await api.post(`/api/products/${p.id}/publish`);
      push("درخواست انتشار ثبت شد — وضعیت در صف انتشار قابل پیگیری است.", "success");
      load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "خطا در انتشار.", "error");
    }
  }
  async function unpublish(p: Product) {
    try {
      await api.post(`/api/products/${p.id}/unpublish`);
      push("درخواست لغو انتشار ثبت شد.", "success");
      load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "خطا در لغو انتشار.", "error");
    }
  }
  async function remove(p: Product) {
    if (!confirm(`محصول «${p.name}» حذف شود؟ این عمل قابل بازگشت نیست.`)) return;
    try {
      await api.delete(`/api/products/${p.id}`);
      push("محصول حذف شد.", "success");
      load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "خطا در حذف.", "error");
    }
  }

  return (
    <>
      <PageHeader title="محصولات من" />
      <div className="content">
        <div className="section-head">
          <h2>{products.length} محصول</h2>
          <Link to="/seller/products/new" className="btn btn-primary">+ افزودن محصول</Link>
        </div>
        <div className="tabs">
          {(["all", "DRAFT", "PUBLISHED", "HIDDEN"] as const).map((t) => (
            <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
              {t === "all" ? "همه" : t === "DRAFT" ? "پیش‌نویس" : t === "PUBLISHED" ? "منتشرشده" : "مخفی"}
            </button>
          ))}
        </div>

        {loading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState icon="📦" text="محصولی در این بخش نیست." />
        ) : (
          <div className="card table-wrap">
            <table>
              <thead><tr><th>محصول</th><th>وضعیت</th><th>تاریخ ایجاد</th><th>عملیات</th></tr></thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}{p.hasUnpublishedChanges && <span className="badge badge-warning" style={{ marginRight: 6 }}>تغییرات منتشرنشده</span>}</td>
                    <td><VisibilityBadge v={p.visibility} /></td>
                    <td>{fmtDate(p.createdAt)}</td>
                    <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="btn btn-outline btn-sm" onClick={() => navigate(`/seller/products/${p.id}/edit`)}>ویرایش</button>
                      {p.visibility !== "PUBLISHED" ? (
                        <button className="btn btn-primary btn-sm" onClick={() => publish(p)}>انتشار</button>
                      ) : (
                        <button className="btn btn-outline btn-sm" onClick={() => unpublish(p)}>لغو انتشار</button>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>حذف</button>
                    </td>
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
