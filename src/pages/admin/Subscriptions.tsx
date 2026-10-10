import React, { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { PageHeader } from "../../components/Layout";
import { EmptyState, Spinner, SubStatusBadge, fmtDate } from "../../components/ui";
import type { Seller, Subscription } from "../../types";

export default function AdminSubscriptions() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<Subscription[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { push } = useToast();

  useEffect(() => {
    api.get<{ sellers: Seller[] }>("/api/sellers").then((r) => setSellers(r.sellers)).finally(() => setLoading(false));
  }, []);

  async function toggle(seller: Seller) {
    if (expanded === seller.id) { setExpanded(null); return; }
    const r = await api.get<{ subscriptions: Subscription[] }>(`/api/subscriptions/seller/${seller.id}`);
    setHistory(r.subscriptions);
    setExpanded(seller.id);
  }

  async function deleteUnusedSubscription(subscription: Subscription) {
    if (subscription.status === "ACTIVE" && subscription.endDate && new Date(subscription.endDate).getTime() >= Date.now()) {
      push("اشتراک فعال قابل حذف نیست. ابتدا آن را منقضی کنید.", "error");
      return;
    }
    const confirmation = window.confirm(`سابقه اشتراک «${subscription.plan?.name || "بدون نام"}» حذف شود؟ این عملیات دائمی است.`);
    if (!confirmation) return;
    setDeletingId(subscription.id);
    try {
      await api.delete(`/api/subscriptions/${subscription.id}`);
      setHistory((items) => items.filter((item) => item.id !== subscription.id));
      push("سابقه اشتراک حذف شد.", "success");
    } catch (err) {
      push(err instanceof ApiError ? err.message : "حذف سابقه اشتراک انجام نشد.", "error");
    } finally { setDeletingId(null); }
  }

  return (
    <>
      <PageHeader title="اشتراک‌ها" />
      <div className="content">
        <div className="section-head"><h2>وضعیت اشتراک فروشندگان</h2></div>
        {loading ? <Spinner /> : sellers.length === 0 ? (
          <EmptyState icon="💳" text="فروشنده‌ای ثبت نشده است." />
        ) : (
          <div className="card table-wrap">
            <table>
              <thead><tr><th>فروشنده</th><th>وضعیت فعلی</th><th>تاریخ انقضا</th><th></th></tr></thead>
              <tbody>
                {sellers.map((s) => {
                  const active = s.subscriptions?.[0];
                  return (
                    <React.Fragment key={s.id}>
                      <tr>
                        <td>{s.storeName}</td>
                        <td>{active ? <SubStatusBadge v="ACTIVE" /> : <SubStatusBadge v="EXPIRED" />}</td>
                        <td>{active ? fmtDate(active.endDate) : "—"}</td>
                        <td><button className="btn btn-outline btn-sm" onClick={() => toggle(s)}>{expanded === s.id ? "بستن تاریخچه" : "تاریخچه"}</button></td>
                      </tr>
                      {expanded === s.id && (
                        <tr>
                          <td colSpan={4} style={{ background: "#F8FAFC" }}>
                            {history.length === 0 ? "بدون سابقه." : (
                              <table>
                                <thead><tr><th>پلن</th><th>وضعیت</th><th>شروع</th><th>پایان</th><th>یادداشت</th><th>عملیات</th></tr></thead>
                                <tbody>
                                  {history.map((h) => (
                                    <tr key={h.id}>
                                      <td>{h.plan?.name}</td>
                                      <td><SubStatusBadge v={h.status} /></td>
                                      <td>{fmtDate(h.startDate)}</td>
                                      <td>{fmtDate(h.endDate)}</td>
                                      <td>{h.notes ?? "—"}</td>
                                      <td>{h.status === "ACTIVE" && (!h.endDate || new Date(h.endDate).getTime() >= Date.now()) ? <span className="form-help">اشتراک فعال</span> : <button className="btn btn-danger btn-sm" disabled={deletingId === h.id} onClick={() => void deleteUnusedSubscription(h)}>{deletingId === h.id ? "در حال حذف…" : "حذف سابقه"}</button>}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="form-help" style={{ marginTop: 10 }}>برای فعال‌سازی اشتراک جدید از صفحه «فروشندگان» استفاده کنید. سوابق منقضی، لغوشده یا استفاده‌نشده را می‌توان از تاریخچه حذف کرد؛ اشتراک فعال محافظت می‌شود.</p>
      </div>
    </>
  );
}
