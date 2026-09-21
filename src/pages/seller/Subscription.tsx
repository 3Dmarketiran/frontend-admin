import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { PageHeader } from "../../components/Layout";
import { EmptyState, Spinner, SubStatusBadge, fmtDate } from "../../components/ui";
import type { Subscription } from "../../types";

export default function SellerSubscription() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ subscriptions: Subscription[] }>(`/api/subscriptions/seller/${user!.seller!.id}`).then((r) => setSubs(r.subscriptions)).finally(() => setLoading(false));
  }, [user]);

  const active = subs.find((s) => s.status === "ACTIVE");

  return (
    <>
      <PageHeader title="اشتراک من" />
      <div className="content">
        {loading ? <Spinner /> : (
          <>
            <div className="card" style={{ marginBottom: 16 }}>
              {active ? (
                <>وضعیت فعلی: <SubStatusBadge v="ACTIVE" /> — معتبر تا {fmtDate(active.endDate)}</>
              ) : (
                <div className="alert alert-error" style={{ margin: 0 }}>در حال حاضر اشتراک فعالی ندارید. برای فعال‌سازی یا تمدید، با پشتیبانی پلتفرم تماس بگیرید — این پلتفرم پرداخت آنلاین ندارد.</div>
              )}
            </div>
            <div className="section-head"><h2>تاریخچه اشتراک</h2></div>
            {subs.length === 0 ? <EmptyState icon="💳" text="سابقه‌ی اشتراکی وجود ندارد." /> : (
              <div className="card table-wrap">
                <table>
                  <thead><tr><th>پلن</th><th>وضعیت</th><th>شروع</th><th>پایان</th></tr></thead>
                  <tbody>
                    {subs.map((s) => (
                      <tr key={s.id}><td>{s.plan?.name}</td><td><SubStatusBadge v={s.status} /></td><td>{fmtDate(s.startDate)}</td><td>{fmtDate(s.endDate)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
