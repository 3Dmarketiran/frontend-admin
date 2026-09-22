import React, { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { PageHeader } from "../../components/Layout";
import {
  EmptyState,
  Spinner,
  SubStatusBadge,
  fmtDate,
} from "../../components/ui";
import { useToast } from "../../lib/toast";
import type { Subscription } from "../../types";

interface Plan {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  discountPct?: number;
  productLimit: number | null;
  storageLimitMb: number | null;
  features?: Record<string, unknown>;
  isActive?: boolean;
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

interface ActivePlan {
  id: string;
  name: string;
  durationDays: number;
  productLimit: number | null;
  storageLimitMb: number | null;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("fa-IR").format(price);
}

function formatStorage(mb: number | null) {
  if (mb === null) {
    return "نامحدود";
  }

  if (mb <= 0) {
    return "0 MB";
  }

  if (mb < 1) {
    return `${Math.max(
      1,
      Math.round(mb * 1024)
    )} KB`;
  }

  if (mb < 1024) {
    return `${mb.toFixed(
      mb >= 100 ? 0 : 1
    )} MB`;
  }

  return `${(mb / 1024).toFixed(2)} GB`;
}

function getDaysRemaining(endDate: string) {
  const end = new Date(endDate).getTime();
  const now = Date.now();

  const diff = end - now;

  if (diff <= 0) {
    return 0;
  }

  return Math.ceil(
    diff / (1000 * 60 * 60 * 24)
  );
}

function getDurationLabel(days: number) {
  if (days === 30) {
    return "۱ ماهه";
  }

  if (days === 90) {
    return "۳ ماهه";
  }

  if (days === 180) {
    return "۶ ماهه";
  }

  if (days === 365) {
    return "۱ ساله";
  }

  if (days > 365) {
    const years = Math.round(days / 365);
    return `${years} ساله`;
  }

  return `${days} روزه`;
}

function getPlanBadge(
  plan: Plan,
  activePlanId?: string
) {
  if (
    activePlanId &&
    plan.id === activePlanId
  ) {
    return "پلن فعلی";
  }

  if (plan.durationDays >= 365) {
    return "بلندمدت";
  }

  if (plan.durationDays >= 180) {
    return "اقتصادی";
  }

  return null;
}

function getHistoryStatusLabel(
  status: string
) {
  switch (status) {
    case "ACTIVE":
      return "فعال";

    case "EXPIRED":
      return "منقضی";

    case "CANCELLED":
      return "لغوشده";

    case "PENDING":
      return "در انتظار";

    default:
      return status;
  }
}

export default function SellerSubscription() {
  const { user } = useAuth();
  const { push } = useToast();

  const sellerId = user!.seller!.id;

  const [subs, setSubs] =
    useState<Subscription[]>([]);

  const [plans, setPlans] =
    useState<Plan[]>([]);

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
    let cancelled = false;

    setLoading(true);

    Promise.all([
      api.get<{
        subscriptions: Subscription[];
      }>(
        `/api/subscriptions/seller/${sellerId}`
      ),

      api.get<{
        plans: Plan[];
      }>("/api/subscriptions/plans"),

      api.get<Usage>(
        `/api/subscriptions/seller/${sellerId}/usage`
      ),
    ])
      .then(
        ([
          subscriptionsResponse,
          plansResponse,
          usageResponse,
        ]) => {
          if (cancelled) {
            return;
          }

          setSubs(
            subscriptionsResponse.subscriptions
          );

          setPlans(
            plansResponse.plans
          );

          setUsage(
            usageResponse
          );
        }
      )
      .catch((err) => {
        if (cancelled) {
          return;
        }

        push(
          err instanceof ApiError
            ? err.message
            : "خطا در دریافت اطلاعات اشتراک.",
          "error"
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sellerId, push]);

  /*
   * We deliberately normalize the active plan here.
   *
   * The Subscription type in the existing project
   * allows plan to be undefined, while the usage API
   * always returns the plan for an active subscription.
   *
   * This keeps the rest of this page completely type-safe.
   */
  const activeSubscription =
    usage?.subscription ??
    subs.find(
      (subscription) =>
        subscription.status === "ACTIVE"
    ) ??
    null;

  const activePlan: ActivePlan | null =
    usage?.subscription?.plan
      ? {
          id: usage.subscription.plan.id,
          name: usage.subscription.plan.name,
          durationDays:
            usage.subscription.plan
              .durationDays,
          productLimit:
            usage.subscription.plan
              .productLimit,
          storageLimitMb:
            usage.subscription.plan
              .storageLimitMb,
        }
      : activeSubscription?.plan
      ? {
          id: activeSubscription.plan.id,
          name: activeSubscription.plan.name,
          durationDays:
            activeSubscription.plan
              .durationDays,
          productLimit:
            activeSubscription.plan
              .productLimit ?? null,
          storageLimitMb:
            activeSubscription.plan
              .storageLimitMb ?? null,
        }
      : null;

  const daysRemaining =
    activeSubscription
      ? getDaysRemaining(
          activeSubscription.endDate
        )
      : 0;

  const productCount =
    usage?.productCount ?? 0;

  const productLimit =
    usage?.productLimit ??
    activePlan?.productLimit ??
    null;

  const storageUsed =
    usage?.storageUsedMb ?? 0;

  const storageLimit =
    usage?.storageLimitMb ??
    activePlan?.storageLimitMb ??
    null;

  const productPercent =
    productLimit !== null &&
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
    storageLimit !== null &&
    storageLimit > 0
      ? Math.min(
          100,
          Math.round(
            (storageUsed /
              storageLimit) *
              100
          )
        )
      : 0;

  const hasActiveSubscription =
    activeSubscription !== null &&
    activePlan !== null;

  return (
    <>
      <PageHeader title="اشتراک من" />

      <div className="content">
        {loading ? (
          <Spinner />
        ) : (
          <>
            {/* -------------------------------------------------- */}
            {/* Current Subscription */}
            {/* -------------------------------------------------- */}

            {hasActiveSubscription ? (
              <div
                className="card"
                style={{
                  marginBottom: 18,
                  padding: isMobile
                    ? 18
                    : 24,
                  background:
                    "linear-gradient(135deg, rgba(99,91,255,.10), rgba(139,92,246,.07))",
                  border:
                    "1px solid rgba(99,91,255,.14)",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position:
                      "relative",
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-start",
                      gap: 15,
                      flexDirection:
                        isMobile
                          ? "column"
                          : "row",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color:
                            "#635bff",
                          fontWeight: 700,
                          marginBottom: 7,
                        }}
                      >
                        اشتراک فعلی
                      </div>

                      <h2
                        style={{
                          margin: 0,
                          fontSize:
                            isMobile
                              ? 21
                              : 27,
                        }}
                      >
                        {activePlan.name}
                      </h2>

                      <div
                        style={{
                          marginTop: 8,
                          color:
                            "var(--muted, #64748b)",
                          fontSize: 13,
                        }}
                      >
                        {activePlan.durationDays}{" "}
                        روز اعتبار
                      </div>
                    </div>

                    <SubStatusBadge
                      v="ACTIVE"
                    />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        isMobile
                          ? "1fr 1fr"
                          : "repeat(4, 1fr)",
                      gap: 12,
                      marginTop: 22,
                    }}
                  >
                    <div
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        background:
                          "rgba(255,255,255,.55)",
                      }}
                    >
                      <div className="muted">
                        روز باقی‌مانده
                      </div>

                      <strong
                        style={{
                          display:
                            "block",
                          marginTop: 5,
                          fontSize: 21,
                        }}
                      >
                        {daysRemaining}
                      </strong>
                    </div>

                    <div
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        background:
                          "rgba(255,255,255,.55)",
                      }}
                    >
                      <div className="muted">
                        محصولات
                      </div>

                      <strong
                        style={{
                          display:
                            "block",
                          marginTop: 5,
                          fontSize: 21,
                        }}
                      >
                        {productCount}
                        {productLimit !== null
                          ? ` / ${productLimit}`
                          : ""}
                      </strong>
                    </div>

                    <div
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        background:
                          "rgba(255,255,255,.55)",
                      }}
                    >
                      <div className="muted">
                        Storage
                      </div>

                      <strong
                        style={{
                          display:
                            "block",
                          marginTop: 5,
                          fontSize: 18,
                        }}
                      >
                        {formatStorage(
                          storageUsed
                        )}
                      </strong>

                      <span
                        style={{
                          fontSize: 11,
                          color:
                            "var(--muted, #64748b)",
                        }}
                      >
                        از{" "}
                        {formatStorage(
                          storageLimit
                        )}
                      </span>
                    </div>

                    <div
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        background:
                          "rgba(255,255,255,.55)",
                      }}
                    >
                      <div className="muted">
                        پایان
                      </div>

                      <strong
                        style={{
                          display:
                            "block",
                          marginTop: 5,
                          fontSize: 14,
                        }}
                      >
                        {fmtDate(
                          activeSubscription.endDate
                        )}
                      </strong>
                    </div>
                  </div>

                  {/* Usage bars */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        isMobile
                          ? "1fr"
                          : "1fr 1fr",
                      gap: 14,
                      marginTop: 16,
                    }}
                  >
                    {productLimit !== null && (
                      <div>
                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            fontSize: 11,
                            marginBottom: 6,
                          }}
                        >
                          <span>
                            ظرفیت محصولات
                          </span>

                          <span>
                            {productPercent}٪
                          </span>
                        </div>

                        <div
                          style={{
                            height: 7,
                            borderRadius:
                              999,
                            background:
                              "rgba(100,116,139,.14)",
                            overflow:
                              "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${productPercent}%`,
                              height:
                                "100%",
                              borderRadius:
                                999,
                              background:
                                productPercent >=
                                90
                                  ? "#ef4444"
                                  : productPercent >=
                                    80
                                  ? "#f59e0b"
                                  : "linear-gradient(90deg,#635bff,#8b5cf6)",
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {storageLimit !== null && (
                      <div>
                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            fontSize: 11,
                            marginBottom: 6,
                          }}
                        >
                          <span>
                            فضای ذخیره‌سازی
                          </span>

                          <span>
                            {storagePercent}٪
                          </span>
                        </div>

                        <div
                          style={{
                            height: 7,
                            borderRadius:
                              999,
                            background:
                              "rgba(100,116,139,.14)",
                            overflow:
                              "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${storagePercent}%`,
                              height:
                                "100%",
                              borderRadius:
                                999,
                              background:
                                storagePercent >=
                                90
                                  ? "#ef4444"
                                  : storagePercent >=
                                    80
                                  ? "#f59e0b"
                                  : "linear-gradient(90deg,#06b6d4,#635bff)",
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="alert alert-error"
                style={{
                  marginBottom: 18,
                  padding: 18,
                }}
              >
                <strong>
                  اشتراک فعالی ندارید.
                </strong>

                <div
                  style={{
                    marginTop: 6,
                    lineHeight: 1.8,
                  }}
                >
                  برای فعال‌سازی یا تمدید
                  اشتراک، با پشتیبانی پلتفرم
                  تماس بگیرید. پرداخت آنلاین
                  در حال حاضر فعال نیست.
                </div>
              </div>
            )}

            {/* -------------------------------------------------- */}
            {/* Plans */}
            {/* -------------------------------------------------- */}

            <div
              className="section-head"
              style={{
                marginBottom: 14,
              }}
            >
              <div>
                <h2>
                  پلن‌های اشتراک
                </h2>

                <p className="muted">
                  پلن‌های فعال فعلی
                </p>
              </div>
            </div>

            {plans.length === 0 ? (
              <EmptyState
                icon="💳"
                text="در حال حاضر پلن فعالی وجود ندارد."
              />
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    isMobile
                      ? "1fr"
                      : "repeat(3, minmax(0, 1fr))",
                  gap: 16,
                  marginBottom: 22,
                }}
              >
                {plans.map((plan) => {
                  const badge =
                    getPlanBadge(
                      plan,
                      activePlan?.id
                    );

                  const isCurrent =
                    activePlan?.id ===
                    plan.id;

                  return (
                    <div
                      key={plan.id}
                      className="card"
                      style={{
                        padding: 20,
                        position:
                          "relative",
                        border: isCurrent
                          ? "2px solid #635bff"
                          : undefined,
                        boxShadow:
                          isCurrent
                            ? "0 12px 30px rgba(99,91,255,.12)"
                            : undefined,
                      }}
                    >
                      {badge && (
                        <div
                          style={{
                            position:
                              "absolute",
                            top: 14,
                            left: 14,
                            padding:
                              "5px 9px",
                            borderRadius:
                              999,
                            background:
                              isCurrent
                                ? "rgba(99,91,255,.1)"
                                : "rgba(16,185,129,.1)",
                            color:
                              isCurrent
                                ? "#635bff"
                                : "#059669",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {badge}
                        </div>
                      )}

                      <div
                        style={{
                          paddingRight:
                            badge
                              ? 70
                              : 0,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            color:
                              "var(--muted, #64748b)",
                          }}
                        >
                          {getDurationLabel(
                            plan.durationDays
                          )}
                        </div>

                        <h3
                          style={{
                            margin:
                              "6px 0 0",
                            fontSize: 21,
                          }}
                        >
                          {plan.name}
                        </h3>
                      </div>

                      <div
                        style={{
                          marginTop: 18,
                        }}
                      >
                        <strong
                          style={{
                            fontSize: 25,
                          }}
                        >
                          {formatPrice(
                            plan.price
                          )}
                        </strong>

                        <span
                          style={{
                            marginRight: 5,
                            fontSize: 12,
                            color:
                              "var(--muted, #64748b)",
                          }}
                        >
                          تومان
                        </span>
                      </div>

                      <div
                        style={{
                          height: 1,
                          background:
                            "rgba(148,163,184,.15)",
                          margin:
                            "18px 0",
                        }}
                      />

                      <div
                        style={{
                          display: "grid",
                          gap: 11,
                          fontSize: 13,
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            gap: 10,
                          }}
                        >
                          <span className="muted">
                            محصولات
                          </span>

                          <strong>
                            {plan.productLimit ??
                              "نامحدود"}
                          </strong>
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            gap: 10,
                          }}
                        >
                          <span className="muted">
                            Storage
                          </span>

                          <strong>
                            {formatStorage(
                              plan.storageLimitMb
                            )}
                          </strong>
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            gap: 10,
                          }}
                        >
                          <span className="muted">
                            مدت
                          </span>

                          <strong>
                            {getDurationLabel(
                              plan.durationDays
                            )}
                          </strong>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 18,
                        }}
                      >
                        <button
                          type="button"
                          className={
                            isCurrent
                              ? "btn btn-outline btn-block"
                              : "btn btn-primary btn-block"
                          }
                          disabled={
                            isCurrent
                          }
                          onClick={() => {
                            if (!isCurrent) {
                              push(
                                "برای فعال‌سازی این پلن، با پشتیبانی پلتفرم تماس بگیرید.",
                                "info"
                              );
                            }
                          }}
                        >
                          {isCurrent
                            ? "پلن فعلی شما"
                            : "درخواست فعال‌سازی"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* -------------------------------------------------- */}
            {/* Payment notice */}
            {/* -------------------------------------------------- */}

            <div
              className="card"
              style={{
                marginBottom: 22,
                padding: isMobile
                  ? 16
                  : 20,
                background:
                  "rgba(99,91,255,.045)",
                border:
                  "1px solid rgba(99,91,255,.10)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems:
                    "flex-start",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    minWidth: 38,
                    borderRadius: 11,
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    background:
                      "rgba(99,91,255,.10)",
                    fontSize: 18,
                  }}
                >
                  ℹ️
                </div>

                <div>
                  <strong
                    style={{
                      display:
                        "block",
                      marginBottom: 5,
                    }}
                  >
                    فعال‌سازی اشتراک
                  </strong>

                  <div
                    className="muted"
                    style={{
                      fontSize: 12,
                      lineHeight: 1.9,
                    }}
                  >
                    در حال حاضر پرداخت آنلاین
                    در پلتفرم فعال نیست. برای
                    خرید، تمدید یا تغییر پلن،
                    با پشتیبانی تماس بگیرید تا
                    اشتراک شما به‌صورت دستی
                    فعال شود.
                  </div>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------- */}
            {/* Subscription history */}
            {/* -------------------------------------------------- */}

            <div
              className="section-head"
              style={{
                marginBottom: 14,
              }}
            >
              <div>
                <h2>
                  تاریخچه اشتراک
                </h2>

                <p className="muted">
                  سوابق اشتراک‌های فروشگاه
                </p>
              </div>
            </div>

            {subs.length === 0 ? (
              <EmptyState
                icon="💳"
                text="سابقه‌ی اشتراکی وجود ندارد."
              />
            ) : isMobile ? (
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                {subs.map((subscription) => (
                  <div
                    key={subscription.id}
                    className="card"
                    style={{
                      padding: 16,
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
                      <div>
                        <strong
                          style={{
                            fontSize: 15,
                          }}
                        >
                          {subscription.plan
                            ?.name ??
                            "پلن"}
                        </strong>

                        <div
                          className="muted"
                          style={{
                            marginTop: 5,
                            fontSize: 11,
                          }}
                        >
                          {getHistoryStatusLabel(
                            subscription.status
                          )}
                        </div>
                      </div>

                      <SubStatusBadge
                        v={subscription.status}
                      />
                    </div>

                    <div
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "1fr 1fr",
                        gap: 10,
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop:
                          "1px solid rgba(148,163,184,.14)",
                      }}
                    >
                      <div>
                        <div className="muted">
                          شروع
                        </div>

                        <strong
                          style={{
                            display:
                              "block",
                            marginTop: 4,
                            fontSize: 12,
                          }}
                        >
                          {fmtDate(
                            subscription.startDate
                          )}
                        </strong>
                      </div>

                      <div>
                        <div className="muted">
                          پایان
                        </div>

                        <strong
                          style={{
                            display:
                              "block",
                            marginTop: 4,
                            fontSize: 12,
                          }}
                        >
                          {fmtDate(
                            subscription.endDate
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="card table-wrap"
                style={{
                  marginBottom: 20,
                }}
              >
                <table>
                  <thead>
                    <tr>
                      <th>پلن</th>
                      <th>وضعیت</th>
                      <th>شروع</th>
                      <th>پایان</th>
                    </tr>
                  </thead>

                  <tbody>
                    {subs.map((subscription) => (
                      <tr
                        key={subscription.id}
                      >
                        <td>
                          {subscription.plan
                            ?.name ??
                            "پلن"}
                        </td>

                        <td>
                          <SubStatusBadge
                            v={
                              subscription.status
                            }
                          />
                        </td>

                        <td>
                          {fmtDate(
                            subscription.startDate
                          )}
                        </td>

                        <td>
                          {fmtDate(
                            subscription.endDate
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
