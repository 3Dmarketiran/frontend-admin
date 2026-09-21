import React, { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { PageHeader } from "../../components/Layout";
import { EmptyState, Modal, Spinner } from "../../components/ui";
import { useToast } from "../../lib/toast";
import type { SubscriptionPlan } from "../../types";

export default function AdminPlans() {
  const { push } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    setLoading(true);
    api.get<{ plans: SubscriptionPlan[] }>("/api/subscriptions/plans").then((r) => setPlans(r.plans)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  return (
    <>
      <PageHeader title="پلن‌های اشتراک" />
      <div className="content">
        <div className="section-head">
          <h2>پلن‌های موجود ({plans.length})</h2>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ پلن جدید</button>
        </div>
        {loading ? <Spinner /> : plans.length === 0 ? (
          <EmptyState icon="🗂️" text="هنوز پلنی تعریف نشده است." />
        ) : (
          <div className="grid grid-3">
            {plans.map((p) => (
              <div key={p.id} className="card">
                <div style={{ fontWeight: 800, fontSize: "1.05rem", marginBottom: 6 }}>{p.name}</div>
                <div style={{ color: "var(--color-text-muted)", fontSize: ".85rem", marginBottom: 10 }}>مدت: {p.durationDays} روز</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 800 }}>{p.price.toLocaleString("fa-IR")}</div>
                {p.discountPct ? <div className="badge badge-info" style={{ marginTop: 8 }}>{p.discountPct}% تخفیف</div> : null}
                {p.productLimit && <div className="form-help">سقف محصول: {p.productLimit}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
      {showCreate && <CreatePlanModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </>
  );
}

function CreatePlanModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { push } = useToast();
  const [form, setForm] = useState({ name: "", durationDays: 30, price: 0, discountPct: "", productLimit: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/subscriptions/plans", {
        name: form.name,
        durationDays: Number(form.durationDays),
        price: Number(form.price),
        discountPct: form.discountPct ? Number(form.discountPct) : undefined,
        productLimit: form.productLimit ? Number(form.productLimit) : undefined,
      });
      push("پلن ایجاد شد.", "success");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "خطا در ایجاد پلن.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="پلن اشتراک جدید" onClose={onClose}>
      <form onSubmit={onSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-group"><label>نام پلن</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="form-row">
          <div className="form-group"><label>مدت (روز)</label><input type="number" required min={1} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })} /></div>
          <div className="form-group"><label>قیمت</label><input type="number" required min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>تخفیف % (اختیاری)</label><input type="number" min={0} max={100} value={form.discountPct} onChange={(e) => setForm({ ...form, discountPct: e.target.value })} /></div>
          <div className="form-group"><label>سقف محصول (اختیاری)</label><input type="number" min={1} value={form.productLimit} onChange={(e) => setForm({ ...form, productLimit: e.target.value })} /></div>
        </div>
        <button className="btn btn-primary btn-block" disabled={submitting} type="submit">{submitting ? "در حال ایجاد..." : "ایجاد پلن"}</button>
      </form>
    </Modal>
  );
}
