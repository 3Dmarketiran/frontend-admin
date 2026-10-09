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

type TrafficBundle = { id: string; name: string; gigabytes: number; priceToman: number; isActive: boolean; };
type TrafficPurchase = { id: string; gigabytes: number; priceToman: number; status: string; paymentReference?: string | null; requestedAt: string; bundle?: TrafficBundle; };
type TrafficData = {
  traffic: { periodStart: string; periodEnd: string; includedGb: number; purchasedGb: number; usedGb: number; remainingGb: number | null; usedPercent: number | null; warningLevel: string; plan: { name: string; trafficLimitGb: number | null } | null; pendingPurchases: number; };
  purchases: TrafficPurchase[]; bundles: TrafficBundle[];
};

type SubscriptionResponse = Subscription & {
  plan?: SubscriptionPlan | null;
};

type PlanCategory = {
  id: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
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
  const [trafficLoading, setTrafficLoading] = useState(true);
  const [traffic, setTraffic] = useState<TrafficData | null>(null);
  const [buyingBundleId, setBuyingBundleId] = useState<string | null>(null);

  const [usage, setUsage] = useState<UsageData | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [planCategories, setPlanCategories] = useState<PlanCategory[]>([]);
  const [selectedPlanCategory, setSelectedPlanCategory] = useState("");
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
      const response = await api.get<{ plans?: SubscriptionPlan[]; categories?: PlanCategory[] } | SubscriptionPlan[]>(
        "/api/subscriptions/plans",
      );

      const items = Array.isArray(response) ? response : (response.plans ?? []);
      const categories = Array.isArray(response) ? [] : (response.categories ?? []);
      setPlans(items);
      setPlanCategories(categories);
      if (categories.length) setSelectedPlanCategory((current) => current && categories.some((c) => c.id === current) ? current : categories[0].id);
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

  const loadTraffic = useCallback(async () => {
    if (!sellerId) return;
    try {
      const response = await api.get<TrafficData>(`/api/traffic/me`);
      setTraffic(response);
    } catch (err) {
      push(err instanceof ApiError ? err.message : "دریافت وضعیت ترافیک انجام نشد.", "error");
    } finally {
      setTrafficLoading(false);
    }
  }, [sellerId, push]);

  const loadHistory = useCallback(async () => {
    if (!sellerId) return;

    try {
      const response = await api.get<{ subscriptions?: SubscriptionResponse[] } | SubscriptionResponse[]>(
        `/api/subscriptions/seller/${sellerId}`,
      );

      const items = Array.isArray(response) ? response : (response.subscriptions ?? []);
      setHistory(items);
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
      setTrafficLoading(false);
      return;
    }

    void loadUsage();
    void loadPlans();
    void loadHistory();
    void loadTraffic();
  }, [sellerId, loadUsage, loadPlans, loadHistory, loadTraffic]);

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

  const trafficPercent = traffic?.traffic.usedPercent ?? 0;
  const trafficStatus = trafficPercent >= 100 ? "EXCEEDED" : trafficPercent >= 90 ? "CTA" : trafficPercent >= 80 ? "DANGER" : trafficPercent >= 70 ? "WARNING" : "NORMAL";

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

      {/* Real storefront traffic quota */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-medium text-slate-500">ترافیک فروشگاه</div>
            <div className="mt-1 text-2xl font-black text-slate-900">
              {traffic?.traffic.remainingGb == null ? "—" : `${traffic.traffic.remainingGb.toFixed(2)} GB`} <span className="text-base font-semibold text-slate-400">باقی‌مانده</span>
            </div>
            <div className="mt-1 text-sm text-slate-500">مصرف {traffic?.traffic.usedGb.toFixed(2) ?? "0.00"} GB از {(traffic?.traffic.includedGb ?? 0) + (traffic?.traffic.purchasedGb ?? 0)} GB</div>
          </div>
          <div className="text-left">
            <div className="text-3xl font-black text-slate-900">{traffic?.traffic.usedPercent == null ? "—" : `${trafficPercent.toFixed(1)}٪`}</div>
            <div className="text-xs text-slate-500">مصرف‌شده</div>
          </div>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full transition-all ${trafficStatus === "EXCEEDED" || trafficStatus === "CTA" ? "bg-red-500" : trafficStatus === "DANGER" ? "bg-orange-500" : trafficStatus === "WARNING" ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, trafficPercent)}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-400"><span>۰٪</span><span>۷۰٪ هشدار</span><span>۸۰٪ جدی</span><span>۹۰٪ خرید</span><span>۱۰۰٪ توقف</span></div>
        {trafficStatus === "WARNING" && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">هشدار اولیه: ۷۰٪ از ترافیک این ماه مصرف شده است.</div>}
        {trafficStatus === "DANGER" && <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm font-medium text-orange-800">هشدار جدی: بیش از ۸۰٪ ترافیک مصرف شده است. بهتر است قبل از پایان سهمیه، بسته اضافه تهیه کنید.</div>}
        {trafficStatus === "CTA" && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><div className="font-bold">ترافیک فروشگاه در آستانه اتمام است.</div><p className="mt-1">بیش از ۹۰٪ سهمیه مصرف شده؛ برای جلوگیری از توقف نمایش فایل‌ها، ترافیک اضافه تهیه کنید.</p><button type="button" className="mt-3 rounded-lg bg-red-600 px-4 py-2 font-bold text-white" onClick={() => document.getElementById("traffic-bundles")?.scrollIntoView({ behavior: "smooth", block: "start" })}>راهنمای خرید ترافیک اضافه</button></div>}
        {trafficStatus === "EXCEEDED" && <div className="mt-4 rounded-xl border border-red-300 bg-red-100 p-4 text-sm font-bold text-red-800">سهمیه ترافیک این ماه تمام شده است. نمایش و دانلود فایل‌های عمومی فروشگاه تا خرید و تأیید ترافیک اضافه متوقف شده است.</div>}
      </section>

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
          <>
            {planCategories.length > 0 && (
              <div className="mb-4 flex gap-2 overflow-x-auto rounded-2xl bg-slate-50 p-1.5">
                {planCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedPlanCategory(category.id)}
                    className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition ${selectedPlanCategory === category.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-white"}`}
                  >
                    {category.name}
                    <span className="mr-1 text-xs opacity-70">({plans.filter((plan) => plan.categoryId === category.id).length})</span>
                  </button>
                ))}
              </div>
            )}

            {planCategories.map((category) => {
              if (category.id !== selectedPlanCategory) return null;
              const categoryPlans = plans.filter((plan) => plan.categoryId === category.id);
              return (
                <div key={category.id}>
                  {category.description && <p className="mb-4 text-sm text-slate-500">{category.description}</p>}
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {categoryPlans.map((plan) => {
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
                </div>
              );
            })}

            {planCategories.length === 0 && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {plans.map((plan) => {
                  return <div key={plan.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-900">{plan.name}</h3><div className="mt-3 text-2xl font-black">{formatPrice(plan.price)} <span className="text-xs font-normal text-slate-400">تومان</span></div></div>;
                })}
              </div>
            )}
          </>
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

      {/* Additional traffic bundles */}
      <section id="traffic-bundles" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-bold text-slate-900">بسته‌های ترافیک اضافه</h2><p className="mt-1 text-sm text-slate-500">بسته فعال موردنظر را انتخاب و درخواست خرید را برای بررسی مدیر ثبت کنید.</p></div><span className="text-xs text-slate-500">{trafficLoading ? "در حال دریافت…" : `${traffic?.bundles.length ?? 0} بسته فعال`}</span></div>
        {!trafficLoading && (traffic?.bundles.length ?? 0) === 0 ? <p className="text-sm text-slate-500">فعلاً بسته ترافیکی برای خرید ارائه نشده است.</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(traffic?.bundles ?? []).map(bundle => <article key={bundle.id} className="rounded-xl border border-slate-200 p-4"><div className="font-bold text-slate-900">{bundle.name}</div><div className="mt-2 text-2xl font-black text-slate-900">{bundle.gigabytes} GB</div><div className="mt-1 text-sm text-slate-500">{formatPrice(bundle.priceToman)} تومان</div><button type="button" className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={!activeSubscription || Boolean(traffic?.traffic.pendingPurchases)} onClick={async () => { try { await api.post("/api/traffic/purchases", { bundleId: bundle.id }); await loadTraffic(); } catch (e) { push(e instanceof ApiError ? e.message : "ثبت درخواست خرید ناموفق بود.", "error"); } }}>درخواست خرید بسته</button></article>)}</div>}
        {traffic?.purchases?.length ? <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="mb-2 text-sm font-bold">درخواست‌های اخیر</h3><div className="space-y-2">{traffic.purchases.slice(0,5).map(p => <div key={p.id} className="flex justify-between gap-3 text-sm"><span>{p.bundle?.name || `${p.gigabytes} GB`}</span><span className="text-slate-500">{p.status === "PENDING" ? "در انتظار بررسی" : p.status === "APPROVED" ? "تأیید شده" : "رد شده"}</span></div>)}</div></div> : null}
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
