import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { PageHeader } from "../../components/Layout";
import { StatCard, Spinner, fmtDate } from "../../components/ui";
import { useToast } from "../../lib/toast";
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
    return `${Math.max(1, Math.round(mb * 1024))} KB`;
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

function getProductStatus(
  visibility: Product["visibility"]
) {
  switch (visibility) {
    case "PUBLISHED":
      return "منتشرشده";

    case "HIDDEN":
      return "مخفی";

    default:
      return "پیش‌نویس";
  }
}

function getProductStatusClass(
  visibility: Product["visibility"]
) {
  switch (visibility) {
    case "PUBLISHED":
      return "success";

    case "HIDDEN":
      return "warning";

    default:
      return "neutral";
  }
}

export default function SellerOverview() {
  const { user } = useAuth();
  const { push } = useToast();

  const sellerId = user!.seller!.id;

  const [products, setProducts] = useState<Product[]>([]);
  const [overview, setOverview] =
    useState<Overview | null>(null);

  const [usage, setUsage] =
    useState<Usage | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [isMobile, setIsMobile] =
    useState(() =>
      typeof window !== "undefined"
        ? window.matchMedia(
            "(max-width: 760px)"
          ).matches
        : false
    );

  useEffect(() => {
    const media = window.matchMedia(
      "(max-width: 760px)"
    );

    const handleChange = (
      event: MediaQueryListEvent
    ) => {
      setIsMobile(event.matches);
    };

    setIsMobile(media.matches);

    media.addEventListener(
      "change",
      handleChange
    );

    return () => {
      media.removeEventListener(
        "change",
        handleChange
      );
    };
  }, []);

  useEffect(() => {
    setLoading(true);

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
      .then(
        ([
          productsResponse,
          overviewResponse,
          usageResponse,
        ]) => {
          setProducts(
            productsResponse.items
          );

          setOverview(
            overviewResponse
          );

          setUsage(
            usageResponse
          );
        }
      )
      .catch((err) => {
        push(
          err instanceof ApiError
            ? err.message
            : "خطا در دریافت اطلاعات داشبورد.",
          "error"
        );
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

  const hidden = products.filter(
    (p) => p.visibility === "HIDDEN"
  ).length;

  const unpublishedChanges =
    products.filter(
      (p) => p.hasUnpublishedChanges
    ).length;

  const views =
    overview?.eventCounts.find(
      (e) =>
        e.type ===
        "PRODUCT_DETAIL_VIEW"
    )?._count ?? 0;

  const arLaunches =
    overview?.eventCounts.find(
      (e) =>
        e.type === "AR_LAUNCH"
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

  const productLimitReached =
    usage?.productLimit !== null &&
    usage?.productLimit !== undefined &&
    usage.productCount >=
      usage.productLimit;

  const hasSubscription =
    Boolean(usage?.subscription);

  const storageNearlyFull =
    storagePercent >= 80;

  const canAddProduct =
    hasSubscription &&
    !productLimitReached;

  const recentProducts =
    [...products]
      .sort(
        (a, b) =>
          new Date(
            b.createdAt
          ).getTime() -
          new Date(
            a.createdAt
          ).getTime()
      )
      .slice(0, 5);

  return (
    <>
      <PageHeader title="نمای کلی فروشگاه" />

      <div className="content seller-overview-page">
        {loading ? (
          <Spinner />
        ) : (
          <>
            {/* Welcome / Hero */}
            <div
              className="card seller-overview-hero"
              style={{
                marginBottom: 16,
                padding: isMobile
                  ? 18
                  : 24,
                background:
                  "linear-gradient(135deg, #ffffff 0%, #f1f1ef 100%)",
                border:
                  "1px solid #e3e3df",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color:
                      "#555752",
                    marginBottom: 7,
                  }}
                >
                  پنل فروشنده
                </div>

                <h2
                  style={{
                    margin: 0,
                    fontSize: isMobile
                      ? 20
                      : 25,
                    lineHeight: 1.6,
                  }}
                >
                  سلام{" "}
                  {user?.seller?.storeName ||
                    "فروشنده"} 👋
                </h2>

                <p
                  style={{
                    margin:
                      "7px 0 0",
                    color:
                      "var(--muted, #64748b)",
                    fontSize: 13,
                    lineHeight: 1.8,
                  }}
                >
                  وضعیت فروشگاه، محصولات،
                  فضای ذخیره‌سازی و عملکرد
                  واقعیت افزوده را از اینجا
                  مدیریت کنید.
                </p>
              </div>

              <div
                style={{
                  position:
                    "absolute",
                  width: 180,
                  height: 180,
                  borderRadius:
                    "50%",
                  background:
                    "rgba(17,18,20,.045)",
                  left: -70,
                  bottom: -110,
                }}
              />
            </div>

            {/* Subscription Alert */}
            {!usage?.subscription && (
              <div
                className="alert alert-error"
                style={{
                  marginBottom: 16,
                }}
              >
                اشتراک شما فعال نیست. برای
                انتشار محصول و آپلود فایل جدید،
                اشتراک فعال لازم است.
              </div>
            )}

            {/* Main Stats */}
            <div
              className="grid grid-4"
              style={{
                marginBottom: 16,
              }}
            >
              <StatCard
                label="کل محصولات"
                value={
                  usage?.productCount ??
                  products.length
                }
                sub={
                  usage?.productLimit
                    ? `از ${usage.productLimit} محصول`
                    : undefined
                }
              />

              <StatCard
                label="منتشرشده"
                value={published}
                sub={
                  products.length
                    ? `${Math.round(
                        (published /
                          products.length) *
                          100
                      )}٪ از محصولات`
                    : undefined
                }
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
                        usage.subscription
                          .endDate
                      )}`
                    : undefined
                }
              />
            </div>

            {/* Usage */}
            {usage?.subscription && (
              <div
                className="grid grid-2"
                style={{
                  marginBottom: 16,
                }}
              >
                {/* Product Usage */}
                <div className="card usage-card">
                  <div className="usage-card-header">
                    <div>
                      <div className="usage-title">
                        ظرفیت محصولات
                      </div>

                      <div className="usage-subtitle">
                        پلن{" "}
                        {
                          usage.subscription
                            .plan.name
                        }
                      </div>
                    </div>

                    <div className="usage-number">
                      {usage.productCount}

                      <span>
                        {" "}
                        /{" "}
                        {usage.productLimit ??
                          "∞"}
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
                            background:
                              productLimitReached
                                ? "#ef4444"
                                : productPercent >=
                                  80
                                ? "#f59e0b"
                                : undefined,
                          }}
                        />
                      </div>

                      <div className="usage-footer">
                        <span>
                          {Math.round(
                            productPercent
                          )}
                          ٪ مصرف شده
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

                      {productLimitReached && (
                        <div className="usage-alert danger">
                          ظرفیت محصولات این
                          پلن تکمیل شده است.
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="usage-unlimited">
                      بدون محدودیت تعداد
                      محصول
                    </div>
                  )}
                </div>

                {/* Storage Usage */}
                <div className="card usage-card">
                  <div className="usage-card-header">
                    <div>
                      <div className="usage-title">
                        فضای ذخیره‌سازی
                      </div>

                      <div className="usage-subtitle">
                        تصاویر + فایل‌های
                        3D/AR
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

                      {storageNearlyFull && (
                        <div
                          className={
                            storagePercent >=
                            90
                              ? "usage-alert danger"
                              : "usage-alert"
                          }
                        >
                          {storagePercent >=
                          90
                            ? "فضای ذخیره‌سازی تقریباً پر است."
                            : "بیش از ۸۰٪ فضای ذخیره‌سازی مصرف شده است."}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="usage-unlimited">
                      فضای ذخیره‌سازی بدون
                      محدودیت
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Analytics */}
            <div
              className="grid grid-3"
              style={{
                marginBottom: 16,
              }}
            >
              <StatCard
                label="بازدید محصولات"
                value={views}
                sub="مشاهده صفحه محصول"
              />

              <StatCard
                label="اجرای واقعیت افزوده"
                value={arLaunches}
                sub="شروع تجربه AR"
              />

              <div
                className="card"
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  alignItems:
                    "flex-start",
                  justifyContent:
                    "center",
                  gap: 8,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color:
                      "var(--muted, #64748b)",
                  }}
                >
                  اقدام سریع
                </div>

                {canAddProduct ? (
                  <Link
                    to="/seller/products/new"
                    className="btn btn-primary"
                  >
                    + افزودن محصول جدید
                  </Link>
                ) : (
                  <button
                    className="btn btn-primary"
                    disabled
                  >
                    + افزودن محصول جدید
                  </button>
                )}

                {!hasSubscription && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#dc2626",
                    }}
                  >
                    اشتراک فعال لازم است.
                  </div>
                )}

                {productLimitReached && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#dc2626",
                    }}
                  >
                    ظرفیت محصولات تکمیل
                    شده است.
                  </div>
                )}
              </div>
            </div>

            {/* Recent Products */}
            <div
              className="card"
              style={{
                marginBottom: 16,
                overflow: "hidden",
              }}
            >
              <div
                className="section-header"
                style={{
                  paddingBottom: 14,
                  borderBottom:
                    "1px solid rgba(148,163,184,.14)",
                }}
              >
                <div>
                  <h3>
                    آخرین محصولات
                  </h3>

                  <p className="muted">
                    آخرین محصولاتی که به
                    فروشگاه اضافه شده‌اند
                  </p>
                </div>

                <Link
                  to="/seller/products"
                  className="btn btn-outline btn-sm"
                >
                  مشاهده همه
                </Link>
              </div>

              {recentProducts.length === 0 ? (
                <div
                  style={{
                    padding:
                      "28px 10px",
                    textAlign: "center",
                    color:
                      "var(--muted, #64748b)",
                    fontSize: 13,
                  }}
                >
                  هنوز محصولی اضافه
                  نکرده‌اید.
                </div>
              ) : isMobile ? (
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    paddingTop: 14,
                  }}
                >
                  {recentProducts.map(
                    (product) => (
                      <div
                        key={product.id}
                        style={{
                          padding: 13,
                          borderRadius: 12,
                          background:
                            "rgba(148,163,184,.06)",
                          border:
                            "1px solid rgba(148,163,184,.12)",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            gap: 10,
                            alignItems:
                              "flex-start",
                          }}
                        >
                          <div
                            style={{
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: 13,
                                wordBreak:
                                  "break-word",
                              }}
                            >
                              {
                                product.name
                              }
                            </div>

                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 11,
                                color:
                                  "var(--muted, #64748b)",
                              }}
                            >
                              {fmtDate(
                                product.createdAt
                              )}
                            </div>
                          </div>

                          <span
                            className={`badge badge-${getProductStatusClass(
                              product.visibility
                            )}`}
                          >
                            {getProductStatus(
                              product.visibility
                            )}
                          </span>
                        </div>

                        {product.hasUnpublishedChanges && (
                          <div
                            style={{
                              marginTop: 9,
                            }}
                          >
                            <span className="badge badge-warning">
                              تغییرات
                              منتشرنشده
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div
                  className="table-wrap"
                  style={{
                    marginTop: 14,
                  }}
                >
                  <table>
                    <thead>
                      <tr>
                        <th>
                          محصول
                        </th>
                        <th>
                          وضعیت
                        </th>
                        <th>
                          تاریخ
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentProducts.map(
                        (product) => (
                          <tr
                            key={
                              product.id
                            }
                          >
                            <td>
                              <div
                                style={{
                                  display:
                                    "flex",
                                  alignItems:
                                    "center",
                                  gap: 7,
                                  flexWrap:
                                    "wrap",
                                }}
                              >
                                <span>
                                  {
                                    product.name
                                  }
                                </span>

                                {product.hasUnpublishedChanges && (
                                  <span className="badge badge-warning">
                                    تغییرات
                                    منتشرنشده
                                  </span>
                                )}
                              </div>
                            </td>

                            <td>
                              <span
                                className={`badge badge-${getProductStatusClass(
                                  product.visibility
                                )}`}
                              >
                                {getProductStatus(
                                  product.visibility
                                )}
                              </span>
                            </td>

                            <td>
                              {fmtDate(
                                product.createdAt
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Subscription */}
            {usage?.subscription && (
              <div
                className="card"
                style={{
                  marginBottom: 16,
                }}
              >
                <div className="section-header">
                  <div>
                    <h3>
                      اشتراک فعلی
                    </h3>

                    <p className="muted">
                      جزئیات پلن فعال
                      فروشگاه
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
                  style={{
                    marginTop: 16,
                  }}
                >
                  <div>
                    <div className="muted">
                      پلن
                    </div>

                    <strong>
                      {
                        usage.subscription
                          .plan.name
                      }
                    </strong>
                  </div>

                  <div>
                    <div className="muted">
                      شروع
                    </div>

                    <strong>
                      {fmtDate(
                        usage.subscription
                          .startDate
                      )}
                    </strong>
                  </div>

                  <div>
                    <div className="muted">
                      پایان
                    </div>

                    <strong>
                      {fmtDate(
                        usage.subscription
                          .endDate
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Summary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  isMobile
                    ? "1fr 1fr"
                    : "repeat(3, 1fr)",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div
                className="card"
                style={{
                  padding: 15,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color:
                      "var(--muted, #64748b)",
                    marginBottom: 5,
                  }}
                >
                  منتشرشده
                </div>

                <strong
                  style={{
                    fontSize: 21,
                  }}
                >
                  {published}
                </strong>
              </div>

              <div
                className="card"
                style={{
                  padding: 15,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color:
                      "var(--muted, #64748b)",
                    marginBottom: 5,
                  }}
                >
                  مخفی
                </div>

                <strong
                  style={{
                    fontSize: 21,
                  }}
                >
                  {hidden}
                </strong>
              </div>

              <div
                className="card"
                style={{
                  padding: 15,
                  gridColumn:
                    isMobile
                      ? "1 / -1"
                      : undefined,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color:
                      "var(--muted, #64748b)",
                    marginBottom: 5,
                  }}
                >
                  تغییرات منتشرنشده
                </div>

                <strong
                  style={{
                    fontSize: 21,
                    color:
                      unpublishedChanges >
                      0
                        ? "#d97706"
                        : undefined,
                  }}
                >
                  {unpublishedChanges}
                </strong>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
