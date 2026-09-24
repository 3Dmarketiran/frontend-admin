import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { PageHeader } from "../../components/Layout";
import { PublishJobStatus } from "../../components/PublishJobStatus";
import {
  EmptyState,
  Spinner,
  VisibilityBadge,
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
      durationDays: number;
      price: number;
      discountPct: number;
      features: unknown;
      productLimit: number | null;
      storageLimitMb: number | null;
    };
  } | null;
};

type Filter = "ALL" | "DRAFT" | "PUBLISHED" | "HIDDEN";

function formatNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function getDaysRemaining(endDate?: string | null) {
  if (!endDate) return null;

  const timestamp = new Date(endDate).getTime();

  if (Number.isNaN(timestamp)) return null;

  return Math.ceil(
    (timestamp - Date.now()) / (1000 * 60 * 60 * 24),
  );
}

function getUsagePercent(
  value: number,
  limit: number | null,
) {
  if (limit === null || limit <= 0) return 0;

  return Math.min(100, Math.max(0, (value / limit) * 100));
}

function getProgressClass(percent: number) {
  if (percent >= 90) return "bg-red-500";
  if (percent >= 75) return "bg-amber-500";
  return "bg-emerald-500";
}

function getJobForProduct(
  jobs: PublishJob[],
  productId: string,
) {
  return jobs.find(
    (job) =>
      job.productId === productId &&
      (job.status === "QUEUED" ||
        job.status === "PROCESSING"),
  );
}

function getJobStatus(
  jobs: PublishJob[],
  productId: string,
) {
  return jobs.find(
    (job) =>
      job.productId === productId &&
      (job.status === "SUCCESS" ||
        job.status === "FAILED"),
  );
}

function getSubscriptionMessage(
  usage: UsageData | null,
) {
  if (!usage?.subscription) {
    return {
      type: "error" as const,
      text: "اشتراک فعالی برای این فروشگاه وجود ندارد.",
    };
  }

  const days = getDaysRemaining(usage.subscription.endDate);

  if (days !== null && days < 0) {
    return {
      type: "error" as const,
      text: "اشتراک فروشگاه منقضی شده است.",
    };
  }

  if (days !== null && days <= 3) {
    return {
      type: "warning" as const,
      text: `اشتراک فروشگاه ${formatNumber(Math.max(days, 0))} روز دیگر منقضی می‌شود.`,
    };
  }

  if (days !== null && days <= 7) {
    return {
      type: "warning" as const,
      text: `کمتر از یک هفته تا پایان اشتراک باقی مانده است.`,
    };
  }

  return null;
}

export default function Products() {
  const { user } = useAuth();
  const { push } = useToast();

  const sellerId = user?.seller?.id;

  const [products, setProducts] = useState<Product[]>([]);
  const [jobs, setJobs] = useState<PublishJob[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);

  const [loading, setLoading] = useState(true);
  const [usageLoading, setUsageLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);

  const [filter, setFilter] = useState<Filter>("ALL");
  const [actionId, setActionId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    if (!sellerId) return;

    try {
      const response = await api.get<{
        items?: Product[];
        products?: Product[];
      }>(
        `/api/products?sellerId=${encodeURIComponent(
          sellerId,
        )}&pageSize=100`,
      );

      const items = response.items ?? response.products ?? [];

      setProducts(Array.isArray(items) ? items : []);
    } catch (error) {
      push(
        error instanceof ApiError
          ? error.message
          : "دریافت محصولات انجام نشد.",
      "error",
      );
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  const loadUsage = useCallback(async () => {
    if (!sellerId) return;

    try {
      const response = await api.get<UsageData>(
        `/api/subscriptions/seller/${sellerId}/usage`,
      );

      setUsage(response);
    } catch (error) {
      push(
        error instanceof ApiError
          ? error.message
          : "دریافت وضعیت اشتراک انجام نشد.",
      "error",
      );
    } finally {
      setUsageLoading(false);
    }
  }, [sellerId]);

  const loadJobs = useCallback(async () => {
    try {
      const response = await api.get<
        PublishJob[] | { items?: PublishJob[] }
      >("/api/publishing/jobs");

      const items = Array.isArray(response)
        ? response
        : response.items ?? [];

      setJobs(items);
    } catch {
      // Publish jobs are supplementary data.
      // Do not block the product dashboard if this request fails.
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sellerId) {
      setLoading(false);
      setUsageLoading(false);
      setJobsLoading(false);
      return;
    }

    void loadProducts();
    void loadUsage();
    void loadJobs();
  }, [sellerId, loadProducts, loadUsage, loadJobs]);

  useEffect(() => {
    if (!sellerId) return;

    const interval = window.setInterval(() => {
      void loadJobs();
      void loadUsage();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [sellerId, loadJobs, loadUsage]);

  const filteredProducts = useMemo(() => {
    if (filter === "ALL") return products;

    return products.filter(
      (product) => product.visibility === filter,
    );
  }, [products, filter]);

  const productPercent = usage
    ? getUsagePercent(
        usage.productCount,
        usage.productLimit,
      )
    : 0;

  const storagePercent = usage
    ? getUsagePercent(
        usage.storageUsedMb,
        usage.storageLimitMb,
      )
    : 0;

  const productLimitReached =
    usage?.productLimit !== null &&
    usage?.productLimit !== undefined &&
    usage.productCount >= usage.productLimit;

  const storageLimitReached =
    usage?.storageLimitMb !== null &&
    usage?.storageLimitMb !== undefined &&
    usage.storageUsedMb >= usage.storageLimitMb;

  const subscriptionMessage = getSubscriptionMessage(usage);

  const hasActiveSubscription =
    Boolean(usage?.subscription) &&
    getDaysRemaining(usage?.subscription?.endDate) !== null &&
    (getDaysRemaining(usage?.subscription?.endDate) ?? -1) >= 0;

  const canCreateProduct =
    hasActiveSubscription && !productLimitReached;

  const canPublish =
    hasActiveSubscription && !storageLimitReached;

  const counts = useMemo(
    () => ({
      ALL: products.length,
      DRAFT: products.filter(
        (product) => product.visibility === "DRAFT",
      ).length,
      PUBLISHED: products.filter(
        (product) => product.visibility === "PUBLISHED",
      ).length,
      HIDDEN: products.filter(
        (product) => product.visibility === "HIDDEN",
      ).length,
    }),
    [products],
  );

  async function handlePublish(product: Product) {
    if (!canPublish) {
      push(
        "برای انتشار محصول باید اشتراک فعال داشته باشید و ظرفیت ذخیره‌سازی شما تکمیل نشده باشد.",
      "error",
      );
      return;
    }

    try {
      setActionId(product.id);

      await api.post(`/api/products/${product.id}/publish`);

      push(
        "درخواست انتشار محصول ثبت شد. وضعیت انتشار را می‌توانید در همین صفحه مشاهده کنید.",
      "success",
      );

      await Promise.all([
        loadProducts(),
        loadUsage(),
        loadJobs(),
      ]);
    } catch (error) {
      push(
        error instanceof ApiError
          ? error.message
          : "انتشار محصول انجام نشد.",
      "error",
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleUnpublish(product: Product) {
    try {
      setActionId(product.id);

      await api.post(`/api/products/${product.id}/unpublish`);

      push("محصول از حالت انتشار خارج شد.", "success");

      await Promise.all([
        loadProducts(),
        loadJobs(),
      ]);
    } catch (error) {
      push(
        error instanceof ApiError
          ? error.message
          : "لغو انتشار محصول انجام نشد.",
      "error",
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `آیا از حذف «${product.name}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`,
    );

    if (!confirmed) return;

    try {
      setActionId(product.id);

      await api.delete(`/api/products/${product.id}`);

      push("محصول با موفقیت حذف شد.", "success");

      await Promise.all([
        loadProducts(),
        loadUsage(),
        loadJobs(),
      ]);
    } catch (error) {
      push(
        error instanceof ApiError
          ? error.message
          : "حذف محصول انجام نشد.",
      "error",
      );
    } finally {
      setActionId(null);
    }
  }

  if (!sellerId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="محصولات"
          description="مدیریت محصولات فروشگاه"
        />

        <EmptyState
          title="فروشنده‌ای برای این حساب پیدا نشد"
          description="برای مدیریت محصولات، حساب فروشنده باید به این کاربر متصل باشد."
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="محصولات"
          description="مدیریت محصولات فروشگاه"
        />

        <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="products-page space-y-6 pb-10">
      <PageHeader
        title="محصولات"
        description="محصولات فروشگاه را ایجاد، ویرایش، منتشر و مدیریت کنید."
      />

      {/* Subscription warning */}
      {subscriptionMessage && (
        <div
          className={`rounded-2xl border p-4 ${
            subscriptionMessage.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-bold">
                وضعیت اشتراک
              </div>

              <div className="mt-1 text-sm leading-6">
                {subscriptionMessage.text}
              </div>
            </div>

            <a
              href="/subscription"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-inset ring-current/10 transition hover:bg-slate-50"
            >
              مشاهده اشتراک
            </a>
          </div>
        </div>
      )}

      {/* Capacity cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-500">
                تعداد محصولات
              </div>

              <div className="mt-1 text-2xl font-black text-slate-900">
                {usageLoading || !usage
                  ? "—"
                  : formatNumber(usage.productCount)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
              {usage?.productLimit === null
                ? "نامحدود"
                : usage?.productLimit !== undefined
                  ? `حداکثر ${formatNumber(
                      usage.productLimit,
                    )}`
                  : "—"}
            </div>
          </div>

          {usage && (
            <>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${getProgressClass(
                    productPercent,
                  )}`}
                  style={{
                    width: `${productPercent}%`,
                  }}
                />
              </div>

              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>ظرفیت مصرف‌شده</span>
                <span>
                  {usage.productLimit === null
                    ? "نامحدود"
                    : `${Math.round(productPercent)}٪`}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-500">
                فضای ذخیره‌سازی
              </div>

              <div className="mt-1 text-2xl font-black text-slate-900">
                {usageLoading || !usage
                  ? "—"
                  : `${formatNumber(
                      Number(usage.storageUsedMb.toFixed(1)),
                    )} MB`}
              </div>
            </div>

            <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
              {usage?.storageLimitMb === null
                ? "نامحدود"
                : usage?.storageLimitMb !== undefined
                  ? `${formatNumber(
                      usage.storageLimitMb,
                    )} MB`
                  : "—"}
            </div>
          </div>

          {usage && (
            <>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${getProgressClass(
                    storagePercent,
                  )}`}
                  style={{
                    width: `${storagePercent}%`,
                  }}
                />
              </div>

              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>فضای مصرف‌شده</span>
                <span>
                  {usage.storageLimitMb === null
                    ? "نامحدود"
                    : `${Math.round(storagePercent)}٪`}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">
            اشتراک
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                hasActiveSubscription
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {hasActiveSubscription ? "فعال" : "غیرفعال"}
            </span>

            {usage?.subscription?.plan?.name && (
              <span className="text-sm font-semibold text-slate-800">
                {usage.subscription.plan.name}
              </span>
            )}
          </div>

          {usage?.subscription?.endDate && (
            <div className="mt-4 text-sm text-slate-500">
              پایان اشتراک:
              <span className="mr-1 font-semibold text-slate-700">
                {fmtDate(usage.subscription.endDate)}
              </span>
            </div>
          )}

          {usage?.subscription?.endDate && (
            <div className="mt-2 text-xs text-slate-400">
              {(() => {
                const days = getDaysRemaining(
                  usage.subscription.endDate,
                );

                if (days === null) return "—";

                if (days < 0) {
                  return "اشتراک منقضی شده است";
                }

                return `${formatNumber(days)} روز باقی‌مانده`;
              })()}
            </div>
          )}
        </div>
      </section>

      {/* Capacity warnings */}
      {(productLimitReached || storageLimitReached) && (
        <section className="grid gap-3 md:grid-cols-2">
          {productLimitReached && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <div className="font-bold">
                ظرفیت تعداد محصولات تکمیل شده است.
              </div>

              <div className="mt-1 leading-6">
                برای افزودن محصول جدید، ابتدا باید پلن فروشگاه
                ارتقا پیدا کند یا ظرفیت بیشتری فعال شود.
              </div>
            </div>
          )}

          {storageLimitReached && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <div className="font-bold">
                ظرفیت ذخیره‌سازی تکمیل شده است.
              </div>

              <div className="mt-1 leading-6">
                برای انتشار یا آپلود فایل‌های بیشتر، فضای ذخیره‌سازی
                بیشتری نیاز است.
              </div>
            </div>
          )}
        </section>
      )}

      {/* Header actions */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            لیست محصولات
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {formatNumber(products.length)} محصول در فروشگاه
            ثبت شده است.
          </p>
        </div>

        <Link
          to="/seller/products/new"
          aria-disabled={!canCreateProduct}
          onClick={(event) => {
            if (!canCreateProduct) {
              event.preventDefault();

              push(
                !hasActiveSubscription
                  ? "برای افزودن محصول باید اشتراک فعال داشته باشید."
                  : "ظرفیت تعداد محصولات این پلن تکمیل شده است.",
              "error",
              );
            }
          }}
          className={`inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold shadow-sm transition ${
            canCreateProduct
              ? "bg-slate-900 text-white hover:bg-slate-800"
              : "cursor-not-allowed bg-slate-200 text-slate-400"
          }`}
        >
          + افزودن محصول
        </Link>
      </section>

      {/* Filters */}
      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-2">
          {(
            [
              ["ALL", "همه"],
              ["DRAFT", "پیش‌نویس"],
              ["PUBLISHED", "منتشرشده"],
              ["HIDDEN", "مخفی"],
            ] as [Filter, string][]
          ).map(([value, label]) => {
            const active = filter === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                {label}

                <span
                  className={`mr-2 rounded-full px-1.5 py-0.5 text-[11px] ${
                    active
                      ? "bg-white/15 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {formatNumber(counts[value])}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Product list */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          title={
            products.length === 0
              ? "هنوز محصولی ندارید"
              : "محصولی در این فیلتر وجود ندارد"
          }
          description={
            products.length === 0
              ? "از دکمه افزودن محصول برای ساخت اولین محصول فروشگاه استفاده کنید."
              : "فیلتر دیگری را انتخاب کنید تا محصولات بیشتری نمایش داده شوند."
          }
        />
      ) : (
        <section className="grid gap-4">
          {filteredProducts.map((product) => {
            const runningJob = getJobForProduct(
              jobs,
              product.id,
            );

            const finishedJob = getJobStatus(
              jobs,
              product.id,
            );

            const busy = actionId === product.id;

            return (
              <article
                key={product.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                          {product.name}
                        </h3>

                        <VisibilityBadge
                          v={product.visibility}
                        />
                      </div>

                      {product.slug && (
                        <div className="mt-1 truncate text-xs text-slate-400">
                          /{product.slug}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                        {product.updatedAt && (
                          <span>
                            آخرین تغییر:{" "}
                            <span className="font-medium text-slate-700">
                              {fmtDate(product.updatedAt)}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/seller/products/${product.id}/edit`}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        ویرایش
                      </Link>

                      {product.visibility === "PUBLISHED" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void handleUnpublish(product)
                          }
                          className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy ? "در حال انجام..." : "لغو انتشار"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={
                            busy ||
                            !canPublish ||
                            Boolean(runningJob)
                          }
                          onClick={() =>
                            void handlePublish(product)
                          }
                          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {runningJob
                            ? "در حال انتشار..."
                            : busy
                              ? "در حال انجام..."
                              : "انتشار"}
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void handleDelete(product)
                        }
                        className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3.5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        حذف
                      </button>
                    </div>
                  </div>

                  {(runningJob || finishedJob) && (
                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <PublishJobStatus
                        job={runningJob ?? finishedJob!}
                      />
                    </div>
                  )}

                  {product.visibility === "PUBLISHED" &&
                    product.hasUnpublishedChanges && (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                        تغییرات جدیدی روی محصول ذخیره شده و هنوز
                        نسخه جدید آن منتشر نشده است.
                      </div>
                    )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {jobsLoading && jobs.length === 0 && (
        <div className="text-center text-xs text-slate-400">
          در حال بررسی وضعیت انتشار...
        </div>
      )}
    </div>
  );
}
