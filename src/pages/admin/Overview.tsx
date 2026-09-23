import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/Layout";
import { StatCard, Spinner } from "../../components/ui";
import type { PublishJob, Seller } from "../../types";

interface Overview {
  sellerCounts: { isActive: boolean; _count: number }[];
  productCounts: { visibility: string; _count: number }[];
  eventCounts: { type: string; _count: number }[];
}

export default function AdminOverview() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [jobs, setJobs] = useState<PublishJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Overview>("/api/analytics/admin/overview"),
      api.get<{ sellers: Seller[] }>("/api/sellers"),
      api.get<{ jobs: PublishJob[] }>("/api/publishing/jobs"),
    ])
      .then(([ov, s, j]) => {
        setOverview(ov);
        setSellers(s.sellers);
        setJobs(j.jobs);
      })
      .finally(() => setLoading(false));
  }, []);

  const count = (arr: { _count: number }[] | undefined) => (arr ?? []).reduce((a, b) => a + b._count, 0);
  const byKey = (arr: { [k: string]: unknown; _count: number }[] | undefined, key: string, val: unknown) =>
    (arr ?? []).find((x) => x[key] === val)?._count ?? 0;

  const activeSellers = sellers.filter((s) => s.isActive).length;
  const expiredSellers = sellers.length - activeSellers;
  const published = byKey(overview?.productCounts as never, "visibility", "PUBLISHED");
  const draft = byKey(overview?.productCounts as never, "visibility", "DRAFT");
  const pendingJobs = jobs.filter((j) => j.status === "QUEUED" || j.status === "PROCESSING").length;
  const failedJobs = jobs.filter((j) => j.status === "FAILED").length;
  const productViews = byKey(overview?.eventCounts as never, "type", "PRODUCT_DETAIL_VIEW");
  const arLaunches = byKey(overview?.eventCounts as never, "type", "AR_LAUNCH");
  const viewer3d = byKey(overview?.eventCounts as never, "type", "VIEWER_3D_OPEN");

  return (
    <>
      <PageHeader title="نمای کلی" />
      <div className="content">
        {loading ? (
          <Spinner />
        ) : (
          <>
            <div className="grid grid-4" style={{ marginBottom: 16 }}>
              <StatCard label="کل فروشندگان" value={sellers.length} />
              <StatCard label="فروشندگان فعال" value={activeSellers} />
              <StatCard label="فروشندگان غیرفعال" value={expiredSellers} />
              <StatCard label="کل محصولات" value={count(overview?.productCounts)} />
            </div>
            <div className="grid grid-4" style={{ marginBottom: 16 }}>
              <StatCard label="محصولات منتشرشده" value={published} />
              <StatCard label="پیش‌نویس‌ها" value={draft} />
              <StatCard label="انتشارهای در انتظار" value={pendingJobs} />
              <StatCard label="انتشارهای ناموفق" value={failedJobs} />
            </div>
            <div className="grid grid-3">
              <StatCard label="بازدید محصول" value={productViews} sub="۳۰ روز اخیر / کل" />
              <StatCard label="باز شدن نمای سه‌بعدی" value={viewer3d} />
              <StatCard label="اجرای واقعیت افزوده" value={arLaunches} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
