import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { PageHeader } from "../../components/Layout";
import { EmptyState, Spinner } from "../../components/ui";
import { useToast } from "../../lib/toast";
import type {
  Subscription,
  SubscriptionPlan,
  SubStatus,
} from "../../types";

type UsageData = {
  productCount: number;
  productLimit: number | null;
  storageUsedBytes: number;
  storageUsedMb: number;
  storageLimitMb: number | null;
  subscription: {
    id: string;
    status: SubStatus;
    startDate: string;
    endDate: string;
    plan: SubscriptionPlan;
  } | null;
};

type SubscriptionResponse = Subscription & {
  plan?: SubscriptionPlan | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function getDaysRemaining(endDate?: string | null) {
  if (!endDate) return null;

  const end = new Date(endDate).getTime();

  if (Number.isNaN(end)) return null;

  const diff = end - Date.now();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getStatusLabel(status?: SubStatus | null) {
  switch (status) {
    case "ACTIVE":
      return "فعال";

    case "EXPIRED":
      return "منقضی شده";

    case "CANCELLED":
      return "لغو شده";

    case "PENDING":
      return "در انتظار فعال‌سازی";

    default:
      return "بدون اشتراک";
  }
}

function getStatusClass(status?: SubStatus | null) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "EXPIRED":
      return "bg-red-50 text-red-700 border-red-200";

    case "CANCELLED":
      return "bg-slate-100 text-slate-600 border-slate-200";

    case "PENDING":
      return "bg-amber-50 text-amber-700 border-amber-200";

    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getProgress(value: number, limit: number | null) {
  if (limit === null || limit <= 0) return 0;

  return Math.min(100, Math.max(0, (value / limit) * 100));
}

function getUsageClass(percent: number) {
  if (percent >= 90) {
    return "bg-red-500";
  }

  if (percent >= 75) {
    return "bg-amber-500";
  }

  return "bg-emerald-500";
}

function getPlanLimitLabel(value: number | null, unit = "") {
  if (value === null) return "نامحدود";

  return `${formatNumber(value)}${unit ? ` ${unit}` : ""}`;
}

export default function Subscription() {
  const { user } = useAuth();
  const { push } = useToast();

  const sellerId = user?.seller?.id;

  const [loading, setLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [usage, setUsage] = useState<UsageData | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [history, setHistory] = useState<SubscriptionResponse[]>([]);

  const [error, setError] = useState<string | null>(null);

  const loadUsage = useCallback(async () => {
    if (!sellerId) return;

    try {
      const response = await api.get<UsageData>(
        `/api/subscriptions/seller/${sellerId}/usage`,
      );

      setUsage(response);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "دریافت وضعیت اشتراک انجام نشد.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  const loadPlans = useCallback(async () => {
    try {
      const response = await api.get<SubscriptionPlan[]>(
        "/api/subscriptions/plans",
      );

      setPlans(Array.isArray(response) ? response : []);
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "دریافت پلن‌ها انجام نشد.",
        "error",
      );
    } finally {
      setPlansLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    if (!sellerId) return;

    try {
      const response = await api.get<SubscriptionResponse[]>(
        `/api/subscriptions/seller/${sellerId}`,
      );

      setHistory(Array.isArray(response) ? response : []);
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "دریافت تاریخچه اشتراک انجام نشد.",
        "error",
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    if (!sellerId) {
      setLoading(false);
      setPlansLoading(false);
      setHistoryLoading(false);
      return;
    }

    void loadUsage();
    void loadPlans();
    void loadHistory();
  }, [sellerId, loadUsage, loadPlans, loadHistory]);

  const activeSubscription = usage?.subscription ?? null;

  const daysRemaining = useMemo(
    () => getDaysRemaining(activeSubscription?.endDate),
    [activeSubscription?.endDate],
  );

  const productPercent = useMemo(
    () =>
      usage
        ? getProgress(usage.productCount, usage.productLimit)
        : 0,
    [usage],
  );

  const storagePercent = useMemo(
    () =>
      usage
        ? getProgress(usage.storageUsedMb, usage.storageLimitMb)
        : 0,
    [usage],
  );

  const isExpiringSoon =
    activeSubscription?.status === "ACTIVE" &&
    daysRemaining !== null &&
    daysRemaining <= 7 &&
    daysRemaining >= 0;

  const isExpiringVerySoon =
    activeSubscription?.status === "ACTIVE" &&
    daysRemaining !== null &&
    daysRemaining <= 3 &&
    daysRemaining >= 0;

  const isExpired =
    activeSubscription?.status === "EXPIRED" ||
    (activeSubscription?.endDate
      ? new Date(activeSubscription.endDate).getTime() < Date.now()
      : false);

  const productLimitReached =
    usage?.productLimit !== null &&
    usage?.productLimit !== undefined &&
    usage.productCount >= usage.productLimit;

  const storageLimitReached =
    usage?.storageLimitMb !== null &&
    usage?.storageLimitMb !== undefined &&
    usage.storageUsedMb >= usage.storageLimitMb;

  if (!sellerId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="اشتراک"
          description="مدیریت پلن و وضعیت اشتراک فروشگاه"
        />

        <EmptyState
          title="فروشنده‌ای برای این حساب پیدا نشد"
          description="برای مدیریت اشتراک، حساب فروشنده باید به این کاربر متصل باشد."
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="اشتراک"
          description="مدیریت پلن و وضعیت اشتراک فروشگاه"
        />

        <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="اشتراک"
        description="وضعیت پلن، ظرفیت فروشگاه و تاریخچه اشتراک را مدیریت و بررسی کنید."
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Current subscription */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 text-sm font-medium text-slate-500">
              اشتراک فعلی
            </div>

            {activeSubscription ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-900">
                    {activeSubscription.plan?.name || "پلن فعلی"}
                  </h2>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                      activeSubscription.status,
                    )}`}
                  >
                    {getStatusLabel(activeSubscription.status)}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-slate-500 sm:grid-cols-2">
                  <div>
                    شروع:{" "}
                    <span className="font-medium text-slate-700">
                      {formatDate(activeSubscription.startDate)}
                    </span>
                  </div>

                  <div>
                    پایان:{" "}
                    <span className="font-medium text-slate-700">
                      {formatDate(activeSubscription.endDate)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-slate-900">
                  اشتراک فعالی وجود ندارد
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  برای فعال شدن امکان انتشار محصولات، یک پلن باید توسط
                  مدیر سیستم برای فروشگاه فعال شود.
                </p>
              </>
            )}
          </div>

          {activeSubscription && daysRemaining !== null && (
            <div
              className={`rounded-2xl border px-5 py-4 text-center ${
                isExpiringVerySoon
                  ? "border-red-200 bg-red-50"
                  : isExpiringSoon
                    ? "border-amber-200 bg-amber-50"
                    : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <div className="text-xs text-slate-500">
                {daysRemaining >= 0 ? "زمان باقی‌مانده" : "زمان گذشته"}
              </div>

              <div
                className={`mt-1 text-2xl font-black ${
                  isExpiringVerySoon
                    ? "text-red-700"
                    : isExpiringSoon
                      ? "text-amber-700"
                      : "text-emerald-700"
                }`}
              >
                {Math.abs(daysRemaining)}
              </div>

              <div className="text-xs text-slate-500">
                روز
              </div>
            </div>
          )}
        </div>

        {isExpiringVerySoon && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
            اشتراک فروشگاه به‌زودی منقضی می‌شود. برای جلوگیری از
            توقف دسترسی به قابلیت‌های اشتراک، تمدید اشتراک را با
            مدیر سیستم هماهنگ کنید.
          </div>
        )}

        {isExpiringSoon && !isExpiringVerySoon && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-700">
            کمتر از یک هفته تا پایان اشتراک باقی مانده است. برای
            تمدید اشتراک می‌توانید با مدیر سیستم هماهنگ کنید.
          </div>
        )}

        {isExpired && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
            اشتراک این فروشگاه منقضی شده است. فعال‌سازی یا تمدید
            اشتراک از طریق مدیر سیستم انجام می‌شود.
          </div>
        )}

        {!activeSubscription && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            فعال‌سازی اشتراک در حال حاضر به‌صورت دستی توسط مدیر
            سیستم انجام می‌شود و پرداخت آنلاین در این بخش فعال نیست.
          </div>
        )}
      </section>

      {/* Usage */}
      {usage && (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-500">
                  محصولات
                </div>

                <div className="mt-1 text-2xl font-black text-slate-900">
                  {formatNumber(usage.productCount)}
                  <span className="mx-1 text-base font-normal text-slate-400">
                    /
                  </span>
                  <span className="text-base font-semibold text-slate-500">
                    {getPlanLimitLabel(usage.productLimit)}
                  </span>
                </div>
              </div>

              {productLimitReached && (
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                  ظرفیت تکمیل است
                </span>
              )}
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${getUsageClass(
                  productPercent,
                )}`}
                style={{ width: `${productPercent}%` }}
              />
            </div>

            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>استفاده‌شده</span>
              <span>
                {usage.productLimit === null
                  ? "نامحدود"
                  : `${Math.round(productPercent)}٪`}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-500">
                  فضای ذخیره‌سازی
                </div>

                <div className="mt-1 text-2xl font-black text-slate-900">
                  {formatNumber(
                    Number(usage.storageUsedMb.toFixed(1)),
                  )}
                  <span className="mx-1 text-base font-normal text-slate-400">
                    MB
                  </span>

                  <span className="mx-1 text-base font-normal text-slate-400">
                    /
                  </span>

                  <span className="text-base font-semibold text-slate-500">
                    {usage.storageLimitMb === null
                      ? "نامحدود"
                      : `${formatNumber(usage.storageLimitMb)} MB`}
                  </span>
                </div>
              </div>

              {storageLimitReached && (
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                  ظرفیت تکمیل است
                </span>
              )}
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${getUsageClass(
                  storagePercent,
                )}`}
                style={{ width: `${storagePercent}%` }}
              />
            </div>

            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>استفاده‌شده</span>
              <span>
                {usage.storageLimitMb === null
                  ? "نامحدود"
                  : `${Math.round(storagePercent)}٪`}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Available plans */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            پلن‌های موجود
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            انتخاب و فعال‌سازی پلن در حال حاضر توسط مدیر سیستم انجام
            می‌شود.
          </p>
        </div>

        {plansLoading ? (
          <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <Spinner />
          </div>
        ) : plans.length === 0 ? (
          <EmptyState
            title="پلنی موجود نیست"
            description="در حال حاضر هیچ پلن فعالی برای فروشگاه‌ها تعریف نشده است."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => {
              const isCurrent =
                activeSubscription?.plan?.id === plan.id &&
                activeSubscription.status === "ACTIVE";

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border bg-white p-5 shadow-sm transition ${
                    isCurrent
                      ? "border-emerald-300 ring-2 ring-emerald-100"
                      : "border-slate-200"
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute right-4 top-4 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                      پلن فعلی
                    </span>
                  )}

                  <h3 className="text-lg font-bold text-slate-900">
                    {plan.name}
                  </h3>

                  <div className="mt-4">
                    <span className="text-2xl font-black text-slate-900">
                      {formatPrice(plan.price)}
                    </span>

                    <span className="mr-1 text-xs text-slate-400">
                      تومان
                    </span>
                  </div>

                  {(plan.discountPct ?? 0) > 0 && (
                    <div className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {formatNumber(plan.discountPct ?? 0)}٪ تخفیف
                    </div>
                  )}

                  <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">
                        مدت
                      </span>

                      <span className="font-semibold text-slate-800">
                        {formatNumber(plan.durationDays)} روز
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">
                        تعداد محصول
                      </span>

                      <span className="font-semibold text-slate-800">
                        {getPlanLimitLabel(plan.productLimit)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">
                        فضای ذخیره‌سازی
                      </span>

                      <span className="font-semibold text-slate-800">
                        {getPlanLimitLabel(
                          plan.storageLimitMb,
                          "MB",
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl bg-slate-50 px-3 py-2.5 text-center text-xs leading-5 text-slate-500">
                    فعال‌سازی توسط مدیر سیستم
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            تاریخچه اشتراک
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            سوابق اشتراک‌های قبلی این فروشگاه.
          </p>
        </div>

        {historyLoading ? (
          <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <Spinner />
          </div>
        ) : history.length === 0 ? (
          <EmptyState
            title="تاریخچه‌ای وجود ندارد"
            description="هنوز اشتراکی برای این فروشگاه ثبت نشده است."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-right text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">
                      پلن
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      وضعیت
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      شروع
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      پایان
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      مبلغ
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {history.map((item) => {
                    const plan = item.plan;

                    return (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-semibold text-slate-800">
                          {plan?.name || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                              item.status,
                            )}`}
                          >
                            {getStatusLabel(item.status)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {formatDate(item.startDate)}
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {formatDate(item.endDate)}
                        </td>

                        <td className="px-5 py-4 font-medium text-slate-700">
                          {plan
                            ? `${formatPrice(plan.price)} تومان`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Manual activation notice */}
      <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            i
          </div>

          <div>
            <h3 className="font-bold text-sky-900">
              فعال‌سازی اشتراک
            </h3>

            <p className="mt-1 text-sm leading-6 text-sky-800">
              در نسخه فعلی، پرداخت آنلاین و خرید مستقیم پلن از پنل
              فروشنده فعال نیست. پس از هماهنگی با مدیر سیستم،
              اشتراک از پنل مدیریت فعال خواهد شد و وضعیت آن در این
              صفحه به‌صورت خودکار نمایش داده می‌شود.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
