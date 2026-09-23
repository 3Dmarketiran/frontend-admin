import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { PageHeader } from "../../components/Layout";
import { StatCard, Spinner } from "../../components/ui";

interface Overview { eventCounts: { type: string; _count: number }[] }

const EVENT_LABELS: Record<string, string> = {
  PRODUCT_VIEW: "بازدید فهرست محصول",
  PRODUCT_DETAIL_VIEW: "بازدید جزئیات محصول",
  VIEWER_3D_OPEN: "باز شدن نمای سه‌بعدی",
  AR_LAUNCH: "اجرای واقعیت افزوده",
  SELLER_PAGE_VIEW: "بازدید صفحه فروشگاه",
  SEARCH: "جستجو",
};

export default function SellerAnalytics() {
  const { user } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Overview>(`/api/analytics/seller/${user!.seller!.id}/overview`).then(setData).finally(() => setLoading(false));
  }, [user]);

  return (
    <>
      <PageHeader title="آنالیتیکس فروشگاه" />
      <div className="content">
        {loading ? <Spinner /> : (
          <div className="grid grid-3">
            {(data?.eventCounts ?? []).map((e) => <StatCard key={e.type} label={EVENT_LABELS[e.type] ?? e.type} value={e._count} />)}
            {(data?.eventCounts ?? []).length === 0 && <div className="card" style={{ gridColumn: "1 / -1" }}>هنوز داده‌ای برای محصولات شما ثبت نشده است.</div>}
          </div>
        )}
      </div>
    </>
  );
}
