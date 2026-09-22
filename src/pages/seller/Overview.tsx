import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { PageHeader } from "../../components/Layout";
import { StatCard, Spinner, fmtDate } from "../../components/ui";
import type { Product } from "../../types";

interface Overview {
  eventCounts: {
    type: string;
    _count: number;
  }[];
}

interface Usage {
  productCount: number;
  productLimit: number | null;

  storageUsedBytes: number;
  storageUsedMb: number;
  storageLimitMb: number | null;

  subscription: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    plan: {
      id: string;
      name: string;
      durationDays: number;
      productLimit: number | null;
      storageLimitMb: number | null;
    };
  } | null;
}

function formatStorage(mb: number) {
  if (mb < 1) {
    return `${Math.round(mb * 1024)} KB`;
  }

  if (mb < 1024) {
    return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
  }

  return `${(mb / 1024).toFixed(2)} GB`;
}

function getUsageClass(percent: number) {
  if (percent >= 90) return "usage-danger";
  if (percent >= 80) return "usage-warning";
  return "usage-normal";
}

export default function SellerOverview() {
  const { user } = useAuth();

  const sellerId = user!.seller!.id;

  const [products, setProducts] = useState<Product[]>([]);
  const [overview, setOverview] =
    useState<Overview | null>(null);

  const [usage, setUsage] =
    useState<Usage | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ items: Product[] }>(
        `/api/products?sellerId=${sellerId}&pageSize=100`
      ),

      api.get<Overview>(
        `/api/analytics/seller/${sellerId}/overview`
      ),

      api.get<Usage>(
        `/api/subscriptions/seller/${sellerId}/usage`
      ),
    ])
      .then(([productsResponse, overviewResponse, usageResponse]) => {
        setProducts(productsResponse.items);
        setOverview(overviewResponse);
        setUsage(usageResponse);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [sellerId]);

  const published = products.filter(
    (p) => p.visibility === "PUBLISHED"
  ).length;

  const draft = products.filter(
    (p) => p.visibility === "DRAFT"
  ).length;

  const views =
    overview?.eventCounts.find(
      (e) => e.type === "PRODUCT_DETAIL_VIEW"
    )?._count ?? 0;

  const arLaunches =
    overview?.eventCounts.find(
      (e) => e.type === "AR_LAUNCH"
    )?._count ?? 0;

  const storagePercent =
    usage?.storageLimitMb &&
    usage.storageLimitMb > 0
      ? Math.min(
          100,
          (usage.storageUsedMb /
            usage.storageLimitMb) *
            100
        )
      : 0;

  const productPercent =
    usage?.productLimit &&
    usage.productLimit > 0
      ? Math.min(
          100,
          (usage.productCount /
            usage.productLimit) *
            100
        )
      : 0;

  const usageClass =
    getUsageClass(storagePercent);

  return (
    <>
      <PageHeader title="نمای کلی فروشگاه" />

      <div className="content">
        {loading ? (
          <Spinner />
        ) : (
          <>
            {!usage?.subscription && (
              <div
                className="alert alert-error"
                style={{ marginBottom: 16 }}
              >
                اشتراک شما فعال نیست. برای انتشار محصول و
                آپلود فایل جدید، اشتراک فعال لازم است.
              </div>
            )}

            {/* Main stats */}
            <div
              className="grid grid-4"
              style={{ marginBottom: 16 }}
            >
              <StatCard
                label="کل محصولات"
                value={products.length}
                sub={
                  usage?.productLimit
                    ? `از ${usage.productLimit} محصول`
                    : undefined
                }
              />

              <StatCard
                label="منتشرشده"
                value={published}
              />

              <StatCard
                label="پیش‌نویس"
                value={draft}
              />

              <StatCard
                label="وضعیت اشتراک"
                value={
                  usage?.subscription
                    ? "فعال"
                    : "غیرفعال"
                }
                sub={
                  usage?.subscription
                    ? `تا ${fmtDate(
                        usage.subscription.endDate
                      )}`
                    : undefined
                }
              />
            </div>

            {/* Plan usage */}
            {usage?.subscription && (
              <div
                className="grid grid-2"
                style={{ marginBottom: 16 }}
              >
                {/* Products */}
                <div className="card usage-card">
                  <div className="usage-card-header">
                    <div>
                      <div className="usage-title">
                        ظرفیت محصولات
                      </div>

                      <div className="usage-subtitle">
                        پلن {usage.subscription.plan.name}
                      </div>
                    </div>

                    <div className="usage-number">
                      {usage.productCount}
                      <span>
                        {" "}
                        /{" "}
                        {usage.productLimit ?? "∞"}
                      </span>
                    </div>
                  </div>

                  {usage.productLimit ? (
                    <>
                      <div className="usage-progress">
                        <div
                          className="usage-progress-bar"
                          style={{
                            width: `${productPercent}%`,
                          }}
                        />
                      </div>

                      <div className="usage-footer">
                        <span>
                          {Math.round(productPercent)}٪
                          مصرف شده
                        </span>

                        <span>
                          {Math.max(
                            0,
                            usage.productLimit -
                              usage.productCount
                          )}{" "}
                          جای خالی
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="usage-unlimited">
                      بدون محدودیت تعداد محصول
                    </div>
                  )}
                </div>

                {/* Storage */}
                <div className="card usage-card">
                  <div className="usage-card-header">
                    <div>
                      <div className="usage-title">
                        فضای ذخیره‌سازی
                      </div>

                      <div className="usage-subtitle">
                        تصاویر + فایل‌های 3D/AR
                      </div>
                    </div>

                    <div className="usage-number">
                      {formatStorage(
                        usage.storageUsedMb
                      )}

                      <span>
                        {" "}
                        /{" "}
                        {usage.storageLimitMb
                          ? formatStorage(
                              usage.storageLimitMb
                            )
                          : "∞"}
                      </span>
                    </div>
                  </div>

                  {usage.storageLimitMb ? (
                    <>
                      <div
                        className={`usage-progress ${usageClass}`}
                      >
                        <div
                          className="usage-progress-bar"
                          style={{
                            width: `${storagePercent}%`,
                          }}
                        />
                      </div>

                      <div className="usage-footer">
                        <span>
                          {Math.round(
                            storagePercent
                          )}
                          ٪ مصرف شده
                        </span>

                        <span>
                          {formatStorage(
                            Math.max(
                              0,
                              usage.storageLimitMb -
                                usage.storageUsedMb
                            )
                          )}{" "}
                          باقی‌مانده
                        </span>
                      </div>

                      {storagePercent >= 80 && (
                        <div
                          className={
                            storagePercent >= 90
                              ? "usage-alert danger"
                              : "usage-alert"
                          }
                        >
                          {storagePercent >= 90
                            ? "فضای ذخیره‌سازی تقریباً پر است. برای آپلود فایل‌های بیشتر، پلن خود را افزایش دهید."
                            : "بیش از ۸۰٪ فضای ذخیره‌سازی مصرف شده است."}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="usage-unlimited">
                      فضای ذخیره‌سازی بدون محدودیت
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Analytics */}
            <div
              className="grid grid-3"
              style={{ marginBottom: 16 }}
            >
              <StatCard
                label="بازدید محصولات"
                value={views}
              />

              <StatCard
                label="اجرای واقعیت افزوده"
                value={arLaunches}
              />

              <div
                className="card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Link
                  to="/seller/products/new"
                  className="btn btn-primary"
                >
                  + افزودن محصول جدید
                </Link>
              </div>
            </div>

            {/* Subscription info */}
            {usage?.subscription && (
              <div
                className="card"
                style={{ marginBottom: 16 }}
              >
                <div className="section-header">
                  <div>
                    <h3>اشتراک فعلی</h3>
                    <p className="muted">
                      جزئیات پلن فعال فروشگاه
                    </p>
                  </div>

                  <Link
                    to="/seller/subscription"
                    className="btn btn-secondary"
                  >
                    مشاهده اشتراک
                  </Link>
                </div>

                <div
                  className="grid grid-3"
                  style={{ marginTop: 16 }}
                >
                  <div>
                    <div className="muted">
                      پلن
                    </div>

                    <strong>
                      {usage.subscription.plan.name}
                    </strong>
                  </div>

                  <div>
                    <div className="muted">
                      شروع
                    </div>

                    <strong>
                      {fmtDate(
                        usage.subscription.startDate
                      )}
                    </strong>
                  </div>

                  <div>
                    <div className="muted">
                      پایان
                    </div>

                    <strong>
                      {fmtDate(
                        usage.subscription.endDate
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
