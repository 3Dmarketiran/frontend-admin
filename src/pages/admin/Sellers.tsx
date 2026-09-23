import React, { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { PageHeader } from "../../components/Layout";
import { EmptyState, Modal, Spinner, fmtDate } from "../../components/ui";
import { useToast } from "../../lib/toast";
import type { Category, Seller, SubscriptionPlan } from "../../types";

export default function AdminSellers() {
  const { push } = useToast();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activateFor, setActivateFor] = useState<Seller | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      api.get<{ sellers: Seller[] }>("/api/sellers"),
      api.get<{ plans: SubscriptionPlan[] }>("/api/subscriptions/plans"),
      api.get<{ categories: Category[] }>("/api/categories?includeInactive=true"),
    ])
      .then(([s, p, c]) => { setSellers(s.sellers); setPlans(p.plans); setCategories(c.categories); })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function toggleActive(seller: Seller) {
    try {
      await api.put(`/api/sellers/${seller.id}`, { isActive: !seller.isActive });
      push(seller.isActive ? "فروشنده غیرفعال شد." : "فروشنده فعال شد.", "success");
      load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "خطا در تغییر وضعیت.", "error");
    }
  }

  return (
    <>
      <PageHeader title="فروشندگان" />
      <div className="content">
        <div className="section-head">
          <h2>همه فروشندگان ({sellers.length})</h2>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ فروشنده جدید</button>
        </div>

        {loading ? <Spinner /> : sellers.length === 0 ? (
          <EmptyState icon="🏬" text="هنوز فروشنده‌ای ثبت نشده است." />
        ) : (
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>نام فروشگاه</th><th>دسته‌بندی</th><th>ایمیل</th><th>محصولات</th><th>وضعیت اشتراک</th><th>وضعیت حساب</th><th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((s) => {
                  const activeSub = s.subscriptions?.[0];
                  return (
                    <tr key={s.id}>
                      <td>{s.storeName}<div style={{ fontSize: ".76rem", color: "var(--color-text-muted)" }}>/sellers/{s.slug}</div></td>
                      <td>{s.sellerCategory?.name ?? "—"}</td><td>{s.user?.email}</td>
                      <td>{s._count?.products ?? 0}</td>
                      <td>{activeSub ? <span className="badge badge-success">فعال تا {fmtDate(activeSub.endDate)}</span> : <span className="badge badge-error">بدون اشتراک فعال</span>}</td>
                      <td>{s.isActive ? <span className="badge badge-success">فعال</span> : <span className="badge badge-muted">غیرفعال</span>}</td>
                      <td style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => setActivateFor(s)}>فعال‌سازی اشتراک</button>
                        <button className="btn btn-outline btn-sm" onClick={() => toggleActive(s)}>{s.isActive ? "غیرفعال کن" : "فعال کن"}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CreateSellerModal categories={categories} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
      {activateFor && <ActivateSubscriptionModal seller={activateFor} plans={plans} onClose={() => setActivateFor(null)} onDone={() => { setActivateFor(null); load(); }} />}
    </>
  );
}

function CreateSellerModal({ categories, onClose, onCreated }: { categories: Category[]; onClose: () => void; onCreated: () => void }) {
  const { push } = useToast();
  const [form, setForm] = useState({ email: "", password: "", storeName: "", contactEmail: "", contactPhone: "", categoryId: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/sellers", form);
      push("فروشنده با موفقیت ایجاد شد.", "success");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "خطا در ایجاد فروشنده.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="فروشنده جدید" onClose={onClose}>
      <form onSubmit={onSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-group">
          <label>نام فروشگاه</label>
          <input required value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />
        </div>
        <div className="form-group">
          <label>ایمیل ورود</label>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="form-group">
          <label>رمز عبور اولیه</label>
          <input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div className="form-group">
          <label>دسته‌بندی فروشگاه</label>
          <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">بدون دسته‌بندی</option>
            {categories.filter((c) => c.isActive !== false).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>ایمیل تماس (اختیاری)</label>
            <input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          </div>
          <div className="form-group">
            <label>تلفن تماس (اختیاری)</label>
            <input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
          </div>
        </div>
        <button className="btn btn-primary btn-block" disabled={submitting} type="submit">{submitting ? "در حال ایجاد..." : "ایجاد فروشنده"}</button>
      </form>
    </Modal>
  );
}

function ActivateSubscriptionModal({ seller, plans, onClose, onDone }: { seller: Seller; plans: SubscriptionPlan[]; onClose: () => void; onDone: () => void }) {
  const { push } = useToast();
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!planId) { setError("ابتدا یک پلن ایجاد کنید."); return; }
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/subscriptions/activate", { sellerId: seller.id, planId, notes: notes || undefined });
      push(`اشتراک برای «${seller.storeName}» فعال شد.`, "success");
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "خطا در فعال‌سازی اشتراک.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`فعال‌سازی اشتراک — ${seller.storeName}`} onClose={onClose}>
      <form onSubmit={onSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        <p className="form-help" style={{ marginBottom: 12 }}>این پلتفرم پرداخت آنلاین ندارد؛ پس از دریافت مبلغ از طریق کانال جداگانه، اشتراک را اینجا فعال کنید.</p>
        <div className="form-group">
          <label>پلن اشتراک</label>
          <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
            {plans.length === 0 && <option value="">هیچ پلنی موجود نیست</option>}
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.durationDays} روز — {p.price.toLocaleString("fa-IR")}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>یادداشت (اختیاری)</label>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-block" disabled={submitting || !planId} type="submit">{submitting ? "در حال ثبت..." : "فعال‌سازی"}</button>
      </form>
    </Modal>
  );
}
