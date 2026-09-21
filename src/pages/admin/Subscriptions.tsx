import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/Layout";
import { EmptyState, Spinner, SubStatusBadge, fmtDate } from "../../components/ui";
import type { Seller, Subscription } from "../../types";

export default function AdminSubscriptions() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<Subscription[]>([]);

  useEffect(() => {
    api.get<{ sellers: Seller[] }>("/api/sellers").then((r) => setSellers(r.sellers)).finally(() => setLoading(false));
  }, []);

  async function toggle(seller: Seller) {
    if (expanded === seller.id) { setExpanded(null); return; }
    const r = await api.get<{ subscriptions: Subscription[] }>(`/api/subscriptions/seller/${seller.id}`);
    setHistory(r.subscriptions);
    setExpanded(seller.id);
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
                                <thead><tr><th>پلن</th><th>وضعیت</th><th>شروع</th><th>پایان</th><th>یادداشت</th></tr></thead>
                                <tbody>
                                  {history.map((h) => (
                                    <tr key={h.id}>
                                      <td>{h.plan?.name}</td>
                                      <td><SubStatusBadge v={h.status} /></td>
                                      <td>{fmtDate(h.startDate)}</td>
                                      <td>{fmtDate(h.endDate)}</td>
                                      <td>{h.notes ?? "—"}</td>
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
        <p className="form-help" style={{ marginTop: 10 }}>برای فعال‌سازی اشتراک جدید، از صفحه «فروشندگان» استفاده کنید.</p>
      </div>
    </>
  );
}
