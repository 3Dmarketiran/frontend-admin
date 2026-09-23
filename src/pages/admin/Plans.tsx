import React, { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { PageHeader } from "../../components/Layout";
import { EmptyState, Modal, Spinner } from "../../components/ui";
import { useToast } from "../../lib/toast";
import type { SubscriptionPlan } from "../../types";

type PlanForm = {
  name: string;
  durationDays: number;
  price: number;
  discountPct: string;
  productLimit: string;
  storageLimitMb: string;
};

const emptyForm: PlanForm = {
  name: "",
  durationDays: 30,
  price: 0,
  discountPct: "",
  productLimit: "",
  storageLimitMb: "",
};

export default function AdminPlans() {
  const { push } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const r = await api.get<{ plans: SubscriptionPlan[] }>(
        "/api/subscriptions/plans"
      );

      setPlans(r.plans);
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "خطا در دریافت پلن‌ها.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <PageHeader title="پلن‌های اشتراک" />

      <div className="content">
        <div className="section-head">
          <div>
            <h2 style={{ marginBottom: 4 }}>مدیریت پلن‌ها</h2>

            <div className="form-help">
              {plans.length} پلن فعال
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
          >
            + پلن جدید
          </button>
        </div>

        {loading ? (
          <Spinner />
        ) : plans.length === 0 ? (
          <EmptyState
            icon="🗂️"
            text="هنوز پلنی تعریف نشده است."
          />
        ) : (
          <div className="grid grid-3">
            {plans.map((p) => (
              <div
                key={p.id}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: "1.08rem",
                      }}
                    >
                      {p.name}
                    </div>

                    <div className="form-help">
                      {formatDuration(p.durationDays)}
                    </div>
                  </div>

                  <span className="badge badge-success">
                    فعال
                  </span>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "1.45rem",
                      fontWeight: 900,
                    }}
                  >
                    {p.price.toLocaleString("fa-IR")}
                  </div>

                  <div className="form-help">
                    قیمت پلن
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <PlanMeta
                    label="محصول"
                    value={
                      p.productLimit
                        ? p.productLimit.toLocaleString("fa-IR")
                        : "نامحدود"
                    }
                  />

                  <PlanMeta
                    label="فضا"
                    value={
                      p.storageLimitMb
                        ? formatStorage(p.storageLimitMb)
                        : "نامحدود"
                    }
                  />
                </div>

                {p.discountPct ? (
                  <span
                    className="badge badge-info"
                    style={{ width: "fit-content" }}
                  >
                    {p.discountPct.toLocaleString("fa-IR")}%
                    تخفیف
                  </span>
                ) : null}

                <button
                  className="btn btn-secondary btn-block"
                  onClick={() => setEditingPlan(p)}
                >
                  ✎ ویرایش پلن
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <PlanModal
          mode="create"
          initialPlan={null}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            void load();
          }}
        />
      )}

      {editingPlan && (
        <PlanModal
          mode="edit"
          initialPlan={editingPlan}
          onClose={() => setEditingPlan(null)}
          onSaved={() => {
            setEditingPlan(null);
            void load();
          }}
        />
      )}
    </>
  );
}

function PlanMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        background: "var(--color-bg-soft, #f6f7fb)",
      }}
    >
      <div
        style={{
          fontSize: ".72rem",
          color: "var(--color-text-muted)",
          marginBottom: 3,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontWeight: 750,
          fontSize: ".88rem",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function formatDuration(days: number) {
  return days % 30 === 0
    ? `${days / 30} ماه · ${days} روز`
    : `${days} روز`;
}

function formatStorage(mb: number) {
  if (mb >= 1024) {
    const gb = mb / 1024;

    return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  }

  return `${mb.toLocaleString("fa-IR")} MB`;
}

function PlanModal({
  mode,
  initialPlan,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  initialPlan: SubscriptionPlan | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { push } = useToast();

  const [form, setForm] = useState<PlanForm>(() =>
    initialPlan
      ? {
          name: initialPlan.name,
          durationDays: initialPlan.durationDays,
          price: initialPlan.price,

          discountPct:
            initialPlan.discountPct == null
              ? ""
              : String(initialPlan.discountPct),

          productLimit:
            initialPlan.productLimit == null
              ? ""
              : String(initialPlan.productLimit),

          storageLimitMb:
            initialPlan.storageLimitMb == null
              ? ""
              : String(initialPlan.storageLimitMb),
        }
      : emptyForm
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSubmitting(true);
    setError(null);

    const body = {
      name: form.name.trim(),
      durationDays: Number(form.durationDays),
      price: Number(form.price),

      discountPct:
        form.discountPct === ""
          ? undefined
          : Number(form.discountPct),

      productLimit:
        form.productLimit === ""
          ? undefined
          : Number(form.productLimit),

      storageLimitMb:
        form.storageLimitMb === ""
          ? undefined
          : Number(form.storageLimitMb),
    };

    try {
      if (mode === "create") {
        await api.post(
          "/api/subscriptions/plans",
          body
        );

        push(
          "پلن ایجاد شد.",
          "success"
        );
      } else if (initialPlan) {
        await api.put(
          `/api/subscriptions/plans/${initialPlan.id}`,
          body
        );

        push(
          "پلن ویرایش شد.",
          "success"
        );
      }

      onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "ذخیره پلن انجام نشد."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={
        mode === "create"
          ? "پلن اشتراک جدید"
          : `ویرایش «${initialPlan?.name ?? ""}»`
      }
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <div className="form-group">
          <label>نام پلن</label>

          <input
            required
            minLength={2}
            maxLength={120}
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>مدت (روز)</label>

            <input
              type="number"
              required
              min={1}
              value={form.durationDays}
              onChange={(e) =>
                setForm({
                  ...form,
                  durationDays: Number(
                    e.target.value
                  ),
                })
              }
            />
          </div>

          <div className="form-group">
            <label>قیمت</label>

            <input
              type="number"
              required
              min={0}
              value={form.price}
              onChange={(e) =>
                setForm({
                  ...form,
                  price: Number(
                    e.target.value
                  ),
                })
              }
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>تخفیف (%)</label>

            <input
              type="number"
              min={0}
              max={100}
              value={form.discountPct}
              onChange={(e) =>
                setForm({
                  ...form,
                  discountPct: e.target.value,
                })
              }
              placeholder="اختیاری"
            />
          </div>

          <div className="form-group">
            <label>سقف محصول</label>

            <input
              type="number"
              min={1}
              value={form.productLimit}
              onChange={(e) =>
                setForm({
                  ...form,
                  productLimit: e.target.value,
                })
              }
              placeholder="خالی = نامحدود"
            />
          </div>
        </div>

        <div className="form-group">
          <label>
            فضای ذخیره‌سازی (MB)
          </label>

          <input
            type="number"
            min={1}
            value={form.storageLimitMb}
            onChange={(e) =>
              setForm({
                ...form,
                storageLimitMb:
                  e.target.value,
              })
            }
            placeholder="مثلاً 10240 برای 10GB"
          />

          <div className="form-help">
            خالی بماند یعنی سقف مشخصی تعریف نشده.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 18,
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn btn-secondary"
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            انصراف
          </button>

          <button
            className="btn btn-primary"
            disabled={submitting}
            type="submit"
          >
            {submitting
              ? "در حال ذخیره..."
              : mode === "create"
                ? "ایجاد پلن"
                : "ذخیره تغییرات"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
