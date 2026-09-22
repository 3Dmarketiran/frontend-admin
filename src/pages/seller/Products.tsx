import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { PageHeader } from "../../components/Layout";
import {
  EmptyState,
  Spinner,
  VisibilityBadge,
  JobStatusBadge,
  fmtDate,
} from "../../components/ui";
import { useToast } from "../../lib/toast";
import type { Product, PublishJob } from "../../types";

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

function isActiveJobStatus(status?: string | null) {
  return (
    status === "QUEUED" ||
    status === "PROCESSING"
  );
}

function getLatestJobForProduct(
  jobs: PublishJob[],
  productId: string
) {
  return jobs.find(
    (job) =>
      job.productId === productId
  );
}

function PublishJobState({
  job,
}: {
  job?: PublishJob;
}) {
  if (!job) {
    return null;
  }

  if (job.status === "SUCCESS") {
    return (
      <div
        style={{
          marginTop: 10,
          padding: "8px 10px",
          borderRadius: 10,
          background: "rgba(34,197,94,.08)",
          border: "1px solid rgba(34,197,94,.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            flexWrap: "wrap",
          }}
        >
          <JobStatusBadge v={job.status} />

          <span
            style={{
              fontSize: 12,
              color: "var(--muted, #64748b)",
            }}
          >
            انتشار با موفقیت انجام شد.
          </span>
        </div>

        {job.commitSha && (
          <div
            style={{
              marginTop: 5,
              fontSize: 11,
              color: "var(--muted, #64748b)",
            }}
          >
            Commit:{" "}
            <code>
              {job.commitSha.slice(0, 8)}
            </code>
          </div>
        )}
      </div>
    );
  }

  if (job.status === "FAILED") {
    return (
      <div
        style={{
          marginTop: 10,
          padding: "8px 10px",
          borderRadius: 10,
          background: "rgba(239,68,68,.08)",
          border: "1px solid rgba(239,68,68,.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            flexWrap: "wrap",
          }}
        >
          <JobStatusBadge v={job.status} />

          <span
            style={{
              fontSize: 12,
              color: "#b91c1c",
            }}
          >
            انتشار ناموفق بود.
          </span>
        </div>

        {job.errorMessage && (
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              lineHeight: 1.7,
              color: "#991b1b",
              wordBreak: "break-word",
            }}
          >
            {job.errorMessage}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 10,
        padding: "8px 10px",
        borderRadius: 10,
        background: "rgba(59,130,246,.07)",
        border: "1px solid rgba(59,130,246,.15)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          flexWrap: "wrap",
        }}
      >
        <JobStatusBadge v={job.status} />

        <span
          style={{
            fontSize: 12,
            color: "var(--muted, #64748b)",
          }}
        >
          {job.status === "QUEUED"
            ? "در صف انتشار قرار دارد."
            : "در حال پردازش و ساخت نسخه عمومی است."}
        </span>
      </div>
    </div>
  );
}

export default function SellerProducts() {
  const { user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const sellerId = user!.seller!.id;

  const [products, setProducts] = useState<Product[]>([]);
  const [jobs, setJobs] = useState<PublishJob[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const [tab, setTab] = useState<
    "all" | "DRAFT" | "PUBLISHED" | "HIDDEN"
  >("all");

  const [busyProductId, setBusyProductId] =
    useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 760px)").matches
      : false
  );

  useEffect(() => {
    const media =
      window.matchMedia("(max-width: 760px)");

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

  async function loadProducts() {
    setLoading(true);

    try {
      const [
        productsResponse,
        usageResponse,
      ] = await Promise.all([
        api.get<{ items: Product[] }>(
          `/api/products?sellerId=${sellerId}&pageSize=100`
        ),

        api.get<UsageData>(
          `/api/subscriptions/seller/${sellerId}/usage`
        ),
      ]);

      setProducts(
        productsResponse.items
      );

      setUsage(
        usageResponse
      );
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

  async function loadJobs(
    silent = false
  ) {
    if (!silent) {
      setLoadingJobs(true);
    }

    try {
      const response =
        await api.get<{
          jobs: PublishJob[];
        }>("/api/publishing/jobs");

      setJobs(
        response.jobs
      );
    } catch (err) {
      if (!silent) {
        push(
          err instanceof ApiError
            ? err.message
            : "خطا در دریافت وضعیت انتشار.",
          "error"
        );
      }
    } finally {
      if (!silent) {
        setLoadingJobs(false);
      }
    }
  }

  async function load() {
    await Promise.all([
      loadProducts(),
      loadJobs(),
    ]);
  }

  useEffect(() => {
    void load();

    const interval =
      window.setInterval(() => {
        void loadJobs(true);
      }, 5000);

    return () =>
      window.clearInterval(
        interval
      );
  }, [sellerId]);

  const filtered =
    tab === "all"
      ? products
      : products.filter(
          (p) =>
            p.visibility === tab
        );

  const productCount =
    usage?.productCount ??
    products.length;

  const productLimit =
    usage?.productLimit ??
    usage?.subscription?.plan
      .productLimit ??
    null;

  const storageUsedMb =
    usage?.storageUsedMb ?? 0;

  const storageLimitMb =
    usage?.storageLimitMb ??
    usage?.subscription?.plan
      .storageLimitMb ??
    null;

  const productPercent =
    productLimit &&
    productLimit > 0
      ? Math.min(
          100,
          Math.round(
            (productCount /
              productLimit) *
              100
          )
        )
      : 0;

  const storagePercent =
    getStoragePercent(
      storageUsedMb,
      storageLimitMb
    );

  const storageStatus =
    getStorageStatus(
      storagePercent
    );

  const productLimitReached =
    productLimit !== null &&
    productCount >=
      productLimit;

  const hasActiveSubscription =
    Boolean(
      usage?.subscription
    );

  function getProductJob(
    productId: string
  ) {
    return getLatestJobForProduct(
      jobs,
      productId
    );
  }

  function hasActivePublishJob(
    productId: string
  ) {
    const job =
      getProductJob(productId);

    return Boolean(
      job &&
        isActiveJobStatus(
          job.status
        )
    );
  }

  async function publish(
    p: Product
  ) {
    if (
      busyProductId ||
      hasActivePublishJob(p.id)
    ) {
      return;
    }

    setBusyProductId(
      p.id
    );

    try {
      await api.post(
        `/api/products/${p.id}/publish`
      );

      push(
        "درخواست انتشار ثبت شد. وضعیت صف به‌صورت خودکار به‌روزرسانی می‌شود.",
        "success"
      );

      await Promise.all([
        loadProducts(),
        loadJobs(),
      ]);
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "خطا در انتشار.",
        "error"
      );
    } finally {
      setBusyProductId(
        null
      );
    }
  }

  async function unpublish(
    p: Product
  ) {
    if (
      busyProductId ||
      hasActivePublishJob(p.id)
    ) {
      return;
    }

    setBusyProductId(
      p.id
    );

    try {
      await api.post(
        `/api/products/${p.id}/unpublish`
      );

      push(
        "درخواست لغو انتشار ثبت شد.",
        "success"
      );

      await Promise.all([
        loadProducts(),
        loadJobs(),
      ]);
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "خطا در لغو انتشار.",
        "error"
      );
    } finally {
      setBusyProductId(
        null
      );
    }
  }

  async function remove(
    p: Product
  ) {
    if (
      busyProductId ||
      hasActivePublishJob(p.id)
    ) {
      return;
    }

    if (
      !confirm(
        `محصول «${p.name}» حذف شود؟ این عمل قابل بازگشت نیست.`
      )
    ) {
      return;
    }

    setBusyProductId(
      p.id
    );

    try {
      await api.delete(
        `/api/products/${p.id}`
      );

      push(
        "محصول حذف شد.",
        "success"
      );

      await loadProducts();
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "خطا در حذف.",
        "error"
      );
    } finally {
      setBusyProductId(
        null
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

  function renderProductActions(
    p: Product
  ) {
    const busy =
      busyProductId === p.id;

    const activeJob =
      hasActivePublishJob(
        p.id
      );

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
          disabled={
            busy ||
            activeJob
          }
          onClick={() =>
            navigate(
              `/seller/products/${p.id}/edit`
            )
          }
        >
          ویرایش
        </button>

        {activeJob ? (
          <button
            className="btn btn-primary btn-sm"
            disabled
          >
            {getProductJob(
              p.id
            )?.status ===
            "QUEUED"
              ? "در صف انتشار..."
              : "در حال انتشار..."}
          </button>
        ) : p.visibility !==
          "PUBLISHED" ? (
          <button
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={() =>
              void publish(p)
            }
          >
            {busy
              ? "در حال ثبت..."
              : "انتشار"}
          </button>
        ) : (
          <button
            className="btn btn-outline btn-sm"
            disabled={busy}
            onClick={() =>
              void unpublish(p)
            }
          >
            {busy
              ? "در حال ثبت..."
              : "لغو انتشار"}
          </button>
        )}

        <button
          className="btn btn-danger btn-sm"
          disabled={
            busy ||
            activeJob
          }
          onClick={() =>
            void remove(p)
          }
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
            <h2
              style={{
                marginBottom: 4,
              }}
            >
              محصولات من
            </h2>

            <div
              style={{
                color:
                  "var(--muted, #64748b)",
                fontSize: 13,
              }}
            >
              مدیریت، ویرایش و انتشار محصولات فروشگاه
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent:
                isMobile
                  ? "stretch"
                  : "flex-end",
            }}
          >
            {renderAddButton()}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              isMobile
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
            gap: 14,
            marginBottom: 20,
          }}
        >
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
                justifyContent:
                  "space-between",
                gap: 10,
                alignItems:
                  "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    color:
                      "var(--muted, #64748b)",
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
                  {productLimit !==
                  null
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

            {productLimit !==
              null && (
              <>
                <div
                  style={{
                    height: 7,
                    background:
                      "rgba(100,116,139,.14)",
                    borderRadius: 999,
                    overflow:
                      "hidden",
                    marginTop: 14,
                  }}
                >
                  <div
                    style={{
                      width: `${productPercent}%`,
                      height: "100%",
                      borderRadius: 999,
                      background:
                        productPercent >=
                        90
                          ? "#dc2626"
                          : productPercent >=
                            80
                          ? "#d97706"
                          : "var(--primary, #2563eb)",
                      transition:
                        "width .25s ease",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    marginTop: 7,
                    fontSize: 11,
                  }}
                >
                  <span
                    style={{
                      color:
                        "var(--muted, #64748b)",
                    }}
                  >
                    {productPercent}%
                  </span>

                  <span
                    style={{
                      color:
                        "var(--muted, #64748b)",
                    }}
                  >
                    {productLimit -
                      productCount >
                    0
                      ? `${productLimit - productCount} ظرفیت باقی‌مانده`
                      : "ظرفیت تکمیل شده"}
                  </span>
                </div>
              </>
            )}
          </div>

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
                justifyContent:
                  "space-between",
                gap: 10,
                alignItems:
                  "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    color:
                      "var(--muted, #64748b)",
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
                  {formatStorage(
                    storageUsedMb
                  )}
                </div>
              </div>

              <div
                style={{
                  fontSize: 22,
                }}
              >
                💾
              </div>
            </div>

            {storageLimitMb !==
            null ? (
              <>
                <div
                  style={{
                    height: 7,
                    background:
                      "rgba(100,116,139,.14)",
                    borderRadius: 999,
                    overflow:
                      "hidden",
                    marginTop: 14,
                  }}
                >
                  <div
                    style={{
                      width: `${storagePercent}%`,
                      height: "100%",
                      borderRadius: 999,
                      background:
                        storagePercent >=
                        90
                          ? "#dc2626"
                          : storagePercent >=
                            80
                          ? "#d97706"
                          : "var(--primary, #2563eb)",
                      transition:
                        "width .25s ease",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    marginTop: 7,
                    fontSize: 11,
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
                    {
                      storageStatus.label
                    }
                  </span>

                  <span
                    style={{
                      color:
                        "var(--muted, #64748b)",
                    }}
                  >
                    {formatStorage(
                      storageLimitMb
                    )}
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
                justifyContent:
                  "space-between",
                gap: 10,
                alignItems:
                  "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    color:
                      "var(--muted, #64748b)",
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
                  {usage
                    ?.subscription?.plan
                    .name ??
                    "بدون اشتراک"}
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
                    usage
                      .subscription
                      .startDate
                  )}
                </div>

                <div>
                  پایان:{" "}
                  {fmtDate(
                    usage
                      .subscription
                      .endDate
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: 12,
                  padding:
                    "9px 11px",
                  borderRadius: 10,
                  background:
                    "rgba(239,68,68,.08)",
                  color: "#dc2626",
                  fontSize: 12,
                }}
              >
                برای آپلود فایل و استفاده کامل از امکانات، اشتراک فعال لازم است.
              </div>
            )}
          </div>
        </div>

        {productLimitReached && (
          <div
            className="alert alert-error"
            style={{
              marginBottom: 14,
            }}
          >
            ظرفیت محصولات این پلن تکمیل شده است.
            برای افزودن محصول جدید، ابتدا محصولی حذف کنید یا پلن خود را ارتقا دهید.
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
              به {productPercent}% ظرفیت محصولات پلن خود رسیده‌اید.
            </div>
          )}

        {storageLimitMb !==
          null &&
          storagePercent >=
            80 && (
            <div
              className={
                storagePercent >=
                90
                  ? "alert alert-error"
                  : "alert alert-warning"
              }
              style={{
                marginBottom: 14,
              }}
            >
              مصرف فضای ذخیره‌سازی شما{" "}
              {storagePercent}% است.
              فایل‌های 3D و تصاویر فضای بیشتری مصرف می‌کنند.
            </div>
          )}

        <div
          className="tabs"
          style={{
            overflowX: "auto",
            whiteSpace:
              "nowrap",
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
                    (p) =>
                      p.visibility ===
                      t
                  ).length;

            return (
              <button
                key={t}
                className={
                  tab === t
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setTab(t)
                }
              >
                {t === "all"
                  ? "همه"
                  : t === "DRAFT"
                  ? "پیش‌نویس"
                  : t ===
                    "PUBLISHED"
                  ? "منتشرشده"
                  : "مخفی"}{" "}
                <span
                  style={{
                    opacity:
                      0.65,
                    marginRight: 4,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {loading ||
        loadingJobs ? (
          <Spinner />
        ) : filtered.length ===
          0 ? (
          <EmptyState
            icon="📦"
            text="محصولی در این بخش نیست."
          />
        ) : isMobile ? (
          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            {filtered.map(
              (p) => {
                const job =
                  getProductJob(
                    p.id
                  );

                return (
                  <div
                    key={p.id}
                    className="card"
                    style={{
                      padding: 15,
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap: 12,
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
                            fontWeight:
                              800,
                            fontSize:
                              15,
                            lineHeight:
                              1.7,
                            wordBreak:
                              "break-word",
                          }}
                        >
                          {p.name}
                        </div>

                        <div
                          style={{
                            marginTop: 5,
                            fontSize:
                              12,
                            color:
                              "var(--muted, #64748b)",
                          }}
                        >
                          ایجاد شده در{" "}
                          {fmtDate(
                            p.createdAt
                          )}
                        </div>
                      </div>

                      <VisibilityBadge
                        v={
                          p.visibility
                        }
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

                    <PublishJobState
                      job={job}
                    />

                    <div
                      style={{
                        marginTop: 14,
                        paddingTop:
                          12,
                        borderTop:
                          "1px solid rgba(148,163,184,.18)",
                      }}
                    >
                      {renderProductActions(
                        p
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        ) : (
          <div className="card table-wrap">
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
                    انتشار
                  </th>
                  <th>
                    تاریخ ایجاد
                  </th>
                  <th>
                    عملیات
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.map(
                  (p) => {
                    const job =
                      getProductJob(
                        p.id
                      );

                    return (
                      <tr
                        key={p.id}
                      >
                        <td>
                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: 8,
                              flexWrap:
                                "wrap",
                            }}
                          >
                            <span>
                              {p.name}
                            </span>

                            {p.hasUnpublishedChanges && (
                              <span className="badge badge-warning">
                                تغییرات منتشرنشده
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <VisibilityBadge
                            v={
                              p.visibility
                            }
                          />
                        </td>

                        <td
                          style={{
                            minWidth:
                              190,
                          }}
                        >
                          <PublishJobState
                            job={job}
                          />
                        </td>

                        <td>
                          {fmtDate(
                            p.createdAt
                          )}
                        </td>

                        <td>
                          {renderProductActions(
                            p
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
