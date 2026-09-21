import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { PageHeader } from "../../components/Layout";
import { StatCard, Spinner, fmtDate } from "../../components/ui";
import type { Product, Subscription } from "../../types";

interface Overview { eventCounts: { type: string; _count: number }[] }

export default function SellerOverview() {
  const { user } = useAuth();
  const sellerId = user!.seller!.id;
  const [products, setProducts] = useState<Product[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ items: Product[] }>(`/api/products?sellerId=${sellerId}&pageSize=100`),
      api.get<{ subscriptions: Subscription[] }>(`/api/subscriptions/seller/${sellerId}`),
      api.get<Overview>(`/api/analytics/seller/${sellerId}/overview`),
    ]).then(([p, s, o]) => { setProducts(p.items); setSubs(s.subscriptions); setOverview(o); }).finally(() => setLoading(false));
  }, [sellerId]);

  const published = products.filter((p) => p.visibility === "PUBLISHED").length;
  const draft = products.filter((p) => p.visibility === "DRAFT").length;
  const activeSub = subs.find((s) => s.status === "ACTIVE");
  const views = overview?.eventCounts.find((e) => e.type === "PRODUCT_DETAIL_VIEW")?._count ?? 0;
  const arLaunches = overview?.eventCounts.find((e) => e.type === "AR_LAUNCH")?._count ?? 0;

  return (
    <>
      <PageHeader title="نمای کلی فروشگاه" />
      <div className="content">
        {loading ? <Spinner /> : (
          <>
            {!activeSub && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                اشتراک شما فعال نیست — محصولات شما در وب‌سایت عمومی نمایش داده نمی‌شوند و امکان انتشار وجود ندارد. برای فعال‌سازی با پشتیبانی پلتفرم تماس بگیرید.
              </div>
            )}
            <div className="grid grid-4" style={{ marginBottom: 16 }}>
              <StatCard label="کل محصولات" value={products.length} />
              <StatCard label="منتشرشده" value={published} />
              <StatCard label="پیش‌نویس" value={draft} />
              <StatCard label="وضعیت اشتراک" value={activeSub ? "فعال" : "غیرفعال"} sub={activeSub ? `تا ${fmtDate(activeSub.endDate)}` : undefined} />
            </div>
            <div className="grid grid-3" style={{ marginBottom: 16 }}>
              <StatCard label="بازدید محصولات" value={views} />
              <StatCard label="اجرای واقعیت افزوده" value={arLaunches} />
              <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Link to="/seller/products/new" className="btn btn-primary">+ افزودن محصول جدید</Link>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
