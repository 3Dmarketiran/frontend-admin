import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/Layout";
import { StatCard, Spinner, JobStatusBadge, fmtDateTime } from "../../components/ui";
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

  const recentJobs = [...jobs]
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
    .slice(0, 6);

  const topSellers = [...sellers]
    .sort((a, b) => (b._count?.products ?? 0) - (a._count?.products ?? 0))
    .slice(0, 5);

  return (
    <>
      <PageHeader title="نمای کلی" description="آمار لحظه‌ای پلتفرم، صف انتشار و فروشندگان برتر" />
      <div className="content">
        {loading ? (
          <Spinner />
        ) : (
          <>
            <div className="grid grid-4" style={{ marginBottom: 16 }}>
              <StatCard icon="🏪" label="کل فروشندگان" value={sellers.length} sub={`${activeSellers} فعال`} />
              <StatCard icon="📦" label="کل محصولات" value={count(overview?.productCounts)} sub={`${published} منتشرشده`} />
              <StatCard icon="⏳" label="انتشارهای در انتظار" value={pendingJobs} sub={failedJobs ? `${failedJobs} ناموفق` : "بدون خطا"} />
              <StatCard icon="👁" label="بازدید محصول" value={productViews} sub="مجموع کل" />
            </div>

            <div className="grid grid-overview-split" style={{ marginBottom: 18 }}>
              <div className="card">
                <div className="section-head">
                  <h2>صف انتشار اخیر</h2>
                  <Link to="/admin/publishing" className="btn btn-outline btn-sm">مشاهده همه</Link>
                </div>
                {recentJobs.length === 0 ? (
                  <div className="empty-state" style={{ padding: "28px 10px" }}>هنوز انتشاری ثبت نشده است.</div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>محصول</th>
                          <th>فروشنده</th>
                          <th>وضعیت</th>
                          <th>زمان</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentJobs.map((job) => (
                          <tr key={job.id}>
                            <td>{job.product?.name ?? "—"}</td>
                            <td>{job.seller?.storeName ?? "—"}</td>
                            <td><JobStatusBadge v={job.status} /></td>
                            <td style={{ color: "var(--neo-muted)", fontSize: ".72rem" }}>{fmtDateTime(job.requestedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="card">
                <div className="section-head">
                  <h2>فروشندگان برتر</h2>
                  <Link to="/admin/sellers" className="btn btn-outline btn-sm">همه</Link>
                </div>
                {topSellers.length === 0 ? (
                  <div className="empty-state" style={{ padding: "28px 10px" }}>فروشنده‌ای ثبت نشده است.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {topSellers.map((seller) => (
                      <div key={seller.id} className="top-seller-row">
                        <span className="top-seller-row__icon" aria-hidden="true">
                          {seller.storeName?.slice(0, 1) ?? "?"}
                        </span>
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <strong style={{ display: "block", fontSize: ".8rem", color: "var(--neo-text-strong)" }}>{seller.storeName}</strong>
                          <span style={{ display: "block", fontSize: ".68rem", color: "var(--neo-muted)" }}>{seller._count?.products ?? 0} محصول</span>
                        </span>
                        <span className={`badge ${seller.isActive ? "badge-success" : "badge-muted"}`}>{seller.isActive ? "فعال" : "غیرفعال"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-3" style={{ marginBottom: 18 }}>
              <StatCard icon="🧊" label="باز شدن نمای سه‌بعدی" value={viewer3d} />
              <StatCard icon="📱" label="اجرای واقعیت افزوده" value={arLaunches} />
              <StatCard icon="📝" label="پیش‌نویس‌ها" value={draft} sub={`${expiredSellers} فروشنده غیرفعال`} />
            </div>

            <div className="card">
              <div className="section-head"><h2>اقدامات سریع</h2></div>
              <div className="quick-actions-grid">
                <Link to="/admin/sellers" className="quick-action-tile">
                  <span aria-hidden="true">➕</span>افزودن فروشنده
                </Link>
                <Link to="/admin/products" className="quick-action-tile">
                  <span aria-hidden="true">📦</span>مدیریت محصولات
                </Link>
                <Link to="/admin/publishing" className="quick-action-tile">
                  <span aria-hidden="true">🚀</span>صف انتشار
                </Link>
                <Link to="/admin/analytics" className="quick-action-tile">
                  <span aria-hidden="true">📊</span>گزارش‌ها
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
