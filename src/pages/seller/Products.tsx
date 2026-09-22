import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { PageHeader } from "../../components/Layout";
import {
  EmptyState,
  Spinner,
  VisibilityBadge,
  fmtDate,
} from "../../components/ui";
import { useToast } from "../../lib/toast";
import type { Product } from "../../types";

type UsageData = {
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
      productLimit: number | null;
      storageLimitMb: number | null;
    };
  } | null;
};

function formatStorage(mb: number): string {
  if (mb < 1024) {
    return `${Math.round(mb)} MB`;
  }

  return `${(mb / 1024).toFixed(2)} GB`;
}

function getStoragePercent(
  usedMb: number,
  limitMb: number | null
): number {
  if (!limitMb || limitMb <= 0) return 0;

  return Math.min(
    100,
    Math.round((usedMb / limitMb) * 100)
  );
}

function getStorageStatus(percent: number) {
  if (percent >= 90) {
    return {
      label: "تقریباً پر",
      className: "danger",
    };
  }

  if (percent >= 80) {
    return {
      label: "مصرف بالا",
      className: "warning",
    };
  }

  return {
    label: "مناسب",
    className: "success",
  };
}

export default function SellerProducts() {
  const { user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const sellerId = user!.seller!.id;

  const [products, setProducts] = useState<Product[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<
    "all" | "DRAFT" | "PUBLISHED" | "HIDDEN"
  >("all");

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 760px)").matches
      : false
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");

    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    setIsMobile(media.matches);

    media.addEventListener("change", handleChange);

    return () => {
      media.removeEventListener("change", handleChange);
    };
  }, []);

  async function load() {
    setLoading(true);

    try {
      const [productsResponse, usageResponse] =
        await Promise.all([
          api.get<{ items: Product[] }>(
            `/api/products?sellerId=${sellerId}&pageSize=100`
          ),

          api.get<UsageData>(
            `/api/subscriptions/seller/${sellerId}/usage`
          ),
        ]);

      setProducts(productsResponse.items);
      setUsage(usageResponse);
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "خطا در دریافت اطلاعات محصولات.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [sellerId]);

  const filtered =
    tab === "all"
      ? products
      : products.filter(
          (p) => p.visibility === tab
        );

  const productCount =
    usage?.productCount ?? products.length;

  const productLimit =
    usage?.productLimit ??
    usage?.subscription?.plan.productLimit ??
    null;

  const storageUsedMb =
    usage?.storageUsedMb ?? 0;

  const storageLimitMb =
    usage?.storageLimitMb ??
    usage?.subscription?.plan.storageLimitMb ??
    null;

  const productPercent =
    productLimit && productLimit > 0
      ? Math.min(
          100,
          Math.round(
            (productCount / productLimit) * 100
          )
        )
      : 0;

  const storagePercent = getStoragePercent(
    storageUsedMb,
    storageLimitMb
  );

  const storageStatus =
    getStorageStatus(storagePercent);

  const productLimitReached =
    productLimit !== null &&
    productCount >= productLimit;

  const hasActiveSubscription =
    Boolean(usage?.subscription);

  const canCreateProduct =
    hasActiveSubscription &&
    !productLimitReached;

  async function publish(p: Product) {
    try {
      await api.post(
        `/api/products/${p.id}/publish`
      );

      push(
        "درخواست انتشار ثبت شد — وضعیت در صف انتشار قابل پیگیری است.",
        "success"
      );

      load();
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "خطا در انتشار.",
        "error"
      );
    }
  }

  async function unpublish(p: Product) {
    try {
      await api.post(
        `/api/products/${p.id}/unpublish`
      );

      push(
        "درخواست لغو انتشار ثبت شد.",
        "success"
      );

      load();
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "خطا در لغو انتشار.",
        "error"
      );
    }
  }

  async function remove(p: Product) {
    if (
      !confirm(
        `محصول «${p.name}» حذف شود؟ این عمل قابل بازگشت نیست.`
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/api/products/${p.id}`
      );

      push("محصول حذف شد.", "success");

      load();
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "خطا در حذف.",
        "error"
      );
    }
  }

  function renderAddButton() {
    if (!hasActiveSubscription) {
      return (
        <button
          className="btn btn-primary"
          disabled
          title="برای افزودن محصول باید اشتراک فعال داشته باشید."
        >
          + افزودن محصول
        </button>
      );
    }

    if (productLimitReached) {
      return (
        <button
          className="btn btn-primary"
          disabled
          title="سقف تعداد محصولات پلن شما تکمیل شده است."
        >
          + افزودن محصول
        </button>
      );
    }

    return (
      <Link
        to="/seller/products/new"
        className="btn btn-primary"
      >
        + افزودن محصول
      </Link>
    );
  }

  function renderProductActions(p: Product) {
    return (
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <button
          className="btn btn-outline btn-sm"
          onClick={() =>
            navigate(
              `/seller/products/${p.id}/edit`
            )
          }
        >
          ویرایش
        </button>

        {p.visibility !== "PUBLISHED" ? (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => publish(p)}
          >
            انتشار
          </button>
        ) : (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => unpublish(p)}
          >
            لغو انتشار
          </button>
        )}

        <button
          className="btn btn-danger btn-sm"
          onClick={() => remove(p)}
        >
          حذف
        </button>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="محصولات من" />

      <div className="content">

        {/* Header */}
        <div
          className="section-head"
          style={{
            alignItems: isMobile
              ? "stretch"
              : "center",
            flexDirection: isMobile
              ? "column"
              : "row",
            gap: 12,
          }}
        >
          <div>
            <h2 style={{ marginBottom: 4 }}>
              محصولات من
            </h2>

            <div
              style={{
                color: "var(--muted, #64748b)",
                fontSize: 13,
              }}
            >
              مدیریت، ویرایش و انتشار محصولات فروشگاه
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: isMobile
                ? "stretch"
                : "flex-end",
            }}
          >
            {renderAddButton()}
          </div>
        </div>

        {/* Usage Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(3, minmax(0, 1fr))",
            gap: 14,
            marginBottom: 20,
          }}
        >
          {/* Product Capacity */}
          <div
            className="card"
            style={{
              padding: 18,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--muted, #64748b)",
                    marginBottom: 6,
                  }}
                >
                  ظرفیت محصولات
                </div>

                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                  }}
                >
                  {productCount}
                  {productLimit !== null
                    ? ` / ${productLimit}`
                    : ""}
                </div>
              </div>

              <div
                style={{
                  fontSize: 22,
                }}
              >
                📦
              </div>
            </div>

            {productLimit !== null && (
              <>
                <div
                  style={{
                    height: 7,
                    background:
                      "rgba(100,116,139,.14)",
                    borderRadius: 999,
                    overflow: "hidden",
                    marginTop: 14,
                  }}
                >
                  <div
                    style={{
                      width: `${productPercent}%`,
                      height: "100%",
                      borderRadius: 999,
                      background:
                        productLimitReached
                          ? "#ef4444"
                          : productPercent >= 80
                          ? "#f59e0b"
                          : "linear-gradient(90deg,#635bff,#8b5cf6)",
                    }}
                  />
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color:
                      productLimitReached
                        ? "#dc2626"
                        : productPercent >= 80
                        ? "#d97706"
                        : "var(--muted, #64748b)",
                  }}
                >
                  {productLimitReached
                    ? "سقف محصولات پلن شما تکمیل شده است."
                    : `${productPercent}% از ظرفیت پلن مصرف شده`}
                </div>
              </>
            )}
          </div>

          {/* Storage */}
          <div
            className="card"
            style={{
              padding: 18,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--muted, #64748b)",
                    marginBottom: 6,
                  }}
                >
                  فضای ذخیره‌سازی
                </div>

                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                  }}
                >
                  {formatStorage(storageUsedMb)}
                </div>
              </div>

              <div
                style={{
                  fontSize: 22,
                }}
              >
                ☁️
              </div>
            </div>

            {storageLimitMb !== null ? (
              <>
                <div
                  style={{
                    height: 7,
                    background:
                      "rgba(100,116,139,.14)",
                    borderRadius: 999,
                    overflow: "hidden",
                    marginTop: 14,
                  }}
                >
                  <div
                    style={{
                      width: `${storagePercent}%`,
                      height: "100%",
                      borderRadius: 999,
                      background:
                        storagePercent >= 90
                          ? "#ef4444"
                          : storagePercent >= 80
                          ? "#f59e0b"
                          : "linear-gradient(90deg,#06b6d4,#635bff)",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 8,
                    marginTop: 8,
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      color:
                        storageStatus.className ===
                        "danger"
                          ? "#dc2626"
                          : storageStatus.className ===
                            "warning"
                          ? "#d97706"
                          : "var(--muted, #64748b)",
                    }}
                  >
                    {storageStatus.label}
                  </span>

                  <span
                    style={{
                      color:
                        "var(--muted, #64748b)",
                    }}
                  >
                    {formatStorage(storageLimitMb)}
                  </span>
                </div>
              </>
            ) : (
              <div
                style={{
                  marginTop: 14,
                  fontSize: 12,
                  color:
                    "var(--muted, #64748b)",
                }}
              >
                بدون محدودیت ذخیره‌سازی
              </div>
            )}
          </div>

          {/* Subscription */}
          <div
            className="card"
            style={{
              padding: 18,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--muted, #64748b)",
                    marginBottom: 6,
                  }}
                >
                  پلن فعال
                </div>

                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                  }}
                >
                  {usage?.subscription?.plan
                    .name ?? "بدون اشتراک"}
                </div>
              </div>

              <div
                style={{
                  fontSize: 22,
                }}
              >
                ✨
              </div>
            </div>

            {usage?.subscription ? (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  color:
                    "var(--muted, #64748b)",
                  lineHeight: 1.9,
                }}
              >
                <div>
                  شروع:{" "}
                  {fmtDate(
                    usage.subscription.startDate
                  )}
                </div>

                <div>
                  پایان:{" "}
                  {fmtDate(
                    usage.subscription.endDate
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: 12,
                  padding: "9px 11px",
                  borderRadius: 10,
                  background:
                    "rgba(239,68,68,.08)",
                  color: "#dc2626",
                  fontSize: 12,
                }}
              >
                برای آپلود فایل و استفاده کامل
                از امکانات، اشتراک فعال لازم است.
              </div>
            )}
          </div>
        </div>

        {/* Warnings */}
        {productLimitReached && (
          <div
            className="alert alert-error"
            style={{
              marginBottom: 14,
            }}
          >
            ظرفیت محصولات این پلن تکمیل شده است.
            برای افزودن محصول جدید، ابتدا محصولی
            حذف کنید یا پلن خود را ارتقا دهید.
          </div>
        )}

        {!productLimitReached &&
          productLimit !== null &&
          productPercent >= 80 && (
            <div
              className="alert alert-warning"
              style={{
                marginBottom: 14,
              }}
            >
              به {productPercent}% ظرفیت محصولات
              پلن خود رسیده‌اید.
            </div>
          )}

        {storageLimitMb !== null &&
          storagePercent >= 80 && (
            <div
              className={
                storagePercent >= 90
                  ? "alert alert-error"
                  : "alert alert-warning"
              }
              style={{
                marginBottom: 14,
              }}
            >
              مصرف فضای ذخیره‌سازی شما{" "}
              {storagePercent}% است. فایل‌های
              3D و تصاویر فضای بیشتری مصرف می‌کنند.
            </div>
          )}

        {/* Filters */}
        <div
          className="tabs"
          style={{
            overflowX: "auto",
            whiteSpace: "nowrap",
            marginBottom: 16,
          }}
        >
          {(
            [
              "all",
              "DRAFT",
              "PUBLISHED",
              "HIDDEN",
            ] as const
          ).map((t) => {
            const count =
              t === "all"
                ? products.length
                : products.filter(
                    (p) => p.visibility === t
                  ).length;

            return (
              <button
                key={t}
                className={
                  tab === t ? "active" : ""
                }
                onClick={() => setTab(t)}
              >
                {t === "all"
                  ? "همه"
                  : t === "DRAFT"
                  ? "پیش‌نویس"
                  : t === "PUBLISHED"
                  ? "منتشرشده"
                  : "مخفی"}{" "}
                <span
                  style={{
                    opacity: 0.65,
                    marginRight: 4,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="📦"
            text="محصولی در این بخش نیست."
          />
        ) : isMobile ? (
          /* Mobile Product Cards */
          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            {filtered.map((p) => (
              <div
                key={p.id}
                className="card"
                style={{
                  padding: 15,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 12,
                    alignItems: "flex-start",
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
                        fontWeight: 800,
                        fontSize: 15,
                        lineHeight: 1.7,
                        wordBreak: "break-word",
                      }}
                    >
                      {p.name}
                    </div>

                    <div
                      style={{
                        marginTop: 5,
                        fontSize: 12,
                        color:
                          "var(--muted, #64748b)",
                      }}
                    >
                      ایجاد شده در{" "}
                      {fmtDate(p.createdAt)}
                    </div>
                  </div>

                  <VisibilityBadge
                    v={p.visibility}
                  />
                </div>

                {p.hasUnpublishedChanges && (
                  <div
                    style={{
                      marginTop: 11,
                    }}
                  >
                    <span className="badge badge-warning">
                      تغییرات منتشرنشده
                    </span>
                  </div>
                )}

                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop:
                      "1px solid rgba(148,163,184,.18)",
                  }}
                >
                  {renderProductActions(p)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Desktop Table */
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>محصول</th>
                  <th>وضعیت</th>
                  <th>تاریخ ایجاد</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span>{p.name}</span>

                        {p.hasUnpublishedChanges && (
                          <span className="badge badge-warning">
                            تغییرات منتشرنشده
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <VisibilityBadge
                        v={p.visibility}
                      />
                    </td>

                    <td>
                      {fmtDate(p.createdAt)}
                    </td>

                    <td>
                      {renderProductActions(p)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
