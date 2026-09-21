import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/Layout";
import { StatCard, Spinner } from "../../components/ui";

interface Overview {
  sellerCounts: { isActive: boolean; _count: number }[];
  productCounts: { visibility: string; _count: number }[];
  eventCounts: { type: string; _count: number }[];
}

const EVENT_LABELS: Record<string, string> = {
  PRODUCT_VIEW: "بازدید فهرست محصول",
  PRODUCT_DETAIL_VIEW: "بازدید جزئیات محصول",
  VIEWER_3D_OPEN: "باز شدن نمای سه‌بعدی",
  AR_LAUNCH: "اجرای واقعیت افزوده",
  SELLER_PAGE_VIEW: "بازدید صفحه فروشنده",
  SEARCH: "جستجو",
};

export default function AdminAnalytics() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Overview>("/api/analytics/admin/overview").then(setData).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader title="آنالیتیکس پلتفرم" />
      <div className="content">
        {loading ? <Spinner /> : (
          <div className="grid grid-3">
            {(data?.eventCounts ?? []).map((e) => (
              <StatCard key={e.type} label={EVENT_LABELS[e.type] ?? e.type} value={e._count} />
            ))}
            {(data?.eventCounts ?? []).length === 0 && (
              <div className="card" style={{ gridColumn: "1 / -1" }}>هنوز رویداد آنالیتیکسی ثبت نشده است.</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
