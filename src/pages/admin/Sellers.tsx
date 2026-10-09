import React, { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { PageHeader } from "../../components/Layout";
import { EmptyState, Modal, Spinner, fmtDate } from "../../components/ui";
import { useToast } from "../../lib/toast";
import type { Seller, SubscriptionPlan } from "../../types";

type PlanCategory = { id: string; name: string; };

export default function AdminSellers() {
  const { push } = useToast();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [planCategories, setPlanCategories] = useState<PlanCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activateFor, setActivateFor] = useState<Seller | null>(null);
  const [trafficOverview, setTrafficOverview] = useState<any[]>([]);
  const [pendingTraffic, setPendingTraffic] = useState<any[]>([]);

  function load() {
    setLoading(true);
    Promise.all([
      api.get<{ sellers: Seller[] }>("/api/sellers"),
      api.get<{ plans: SubscriptionPlan[]; categories?: PlanCategory[] }>("/api/subscriptions/plans"),
      api.get<{ sellers: any[]; pendingPurchases: any[] }>("/api/traffic/admin/overview"),
    ])
      .then(([s, p, t]) => { setSellers(s.sellers); setPlans(p.plans); setPlanCategories(p.categories || []); setTrafficOverview(t.sellers || []); setPendingTraffic(t.pendingPurchases || []); })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function deleteSeller(seller: Seller) {
    const first = window.confirm(`حذف دائمی فروشگاه «${seller.storeName}»؟ محصولات، اشتراک‌ها و فایل‌های ذخیره‌شده آن نیز حذف می‌شوند.`);
    if (!first) return;
    const typed = window.prompt(`برای تأیید نهایی، نام فروشگاه را دقیقاً وارد کنید:\n${seller.storeName}`);
    if (typed !== seller.storeName) {
      if (typed !== null) push("نام واردشده مطابق نیست؛ حذف لغو شد.", "error");
      return;
    }
    try {
      await api.delete(`/api/sellers/${seller.id}`);
      push("فروشگاه و فایل‌های وابسته حذف شدند.", "success");
      load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "حذف فروشگاه انجام نشد.", "error");
    }
  }

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
                  <th>نام فروشگاه</th><th>ایمیل</th><th>محصولات</th><th>وضعیت اشتراک</th><th>وضعیت حساب</th><th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((s) => {
                  const activeSub = s.subscriptions?.[0];
                  return (
                    <tr key={s.id}>
                      <td>{s.storeName}<div style={{ fontSize: ".76rem", color: "var(--color-text-muted)" }}>/sellers/{s.slug}</div></td>
                      <td>{s.user?.email}</td>
                      <td>{s._count?.products ?? 0}</td>
                      <td>{activeSub ? <span className="badge badge-success">فعال تا {fmtDate(activeSub.endDate)}</span> : <span className="badge badge-error">بدون اشتراک فعال</span>}</td>
                      <td>{s.isActive ? <span className="badge badge-success">فعال</span> : <span className="badge badge-muted">غیرفعال</span>}</td>
                      <td style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => setActivateFor(s)}>فعال‌سازی اشتراک</button>
                        <button className="btn btn-outline btn-sm" onClick={() => toggleActive(s)}>{s.isActive ? "غیرفعال کن" : "فعال کن"}</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteSeller(s)}>حذف دائمی</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="content" style={{ paddingTop: 0 }}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-head" style={{ marginBottom: 12 }}><div><h2>مصرف ترافیک فروشگاه‌ها</h2><div className="form-help">سقف ماهانه هر فروشگاه بر اساس پلن + بسته‌های تأییدشده نمایش داده می‌شود.</div></div></div>
          <div className="table-wrap"><table><thead><tr><th>فروشگاه</th><th>پلن</th><th>سقف پایه</th><th>خرید اضافه</th><th>مصرف</th><th>باقی‌مانده</th><th>وضعیت</th></tr></thead><tbody>{trafficOverview.map(row => <tr key={row.sellerId}><td>{row.storeName}</td><td>{row.plan?.name || "—"}</td><td>{row.includedGb == null ? "نامحدود" : `${row.includedGb} GB`}</td><td>{row.purchasedGb} GB</td><td>{row.usedGb.toFixed(2)} GB</td><td>{row.remainingGb == null ? "نامحدود" : `${Math.max(0,row.remainingGb).toFixed(2)} GB`}</td><td><span className={`badge ${row.warningLevel === "EXCEEDED" ? "badge-error" : row.warningLevel === "DANGER" ? "badge-warning" : row.warningLevel === "WARNING" ? "badge-info" : "badge-success"}`}>{row.warningLevel === "EXCEEDED" ? "سقف" : row.warningLevel === "DANGER" ? "۸۰٪+" : row.warningLevel === "WARNING" ? "۷۰٪+" : "عادی"}</span></td></tr>)}</tbody></table></div>
        </div>
        {pendingTraffic.length > 0 && <div className="card"><div className="section-head"><div><h2>درخواست‌های ترافیک در انتظار تأیید</h2><div className="form-help">پس از دریافت و تأیید پرداخت، اعتبار به دوره جاری اضافه می‌شود.</div></div></div><div className="table-wrap"><table><thead><tr><th>فروشگاه</th><th>بسته</th><th>مبلغ</th><th>ثبت</th><th>عملیات</th></tr></thead><tbody>{pendingTraffic.map(item => <tr key={item.id}><td>{item.seller?.storeName || "—"}</td><td>{item.bundle?.name || `${item.gigabytes} GB`}</td><td>{item.priceToman.toLocaleString("fa-IR")} تومان</td><td>{fmtDate(item.requestedAt)}</td><td style={{display:"flex",gap:6}}><button className="btn btn-primary btn-sm" onClick={async()=>{ try { await api.post(`/api/traffic/admin/purchases/${item.id}/approve`,{}); push("بسته ترافیک تأیید شد.","success"); load(); } catch(err){ push(err instanceof ApiError ? err.message : "تأیید انجام نشد.","error"); } }}>تأیید پرداخت</button><button className="btn btn-outline btn-sm" onClick={async()=>{ try { await api.post(`/api/traffic/admin/purchases/${item.id}/reject`,{}); push("درخواست رد شد.","success"); load(); } catch(err){ push(err instanceof ApiError ? err.message : "رد درخواست انجام نشد.","error"); } }}>رد</button></td></tr>)}</tbody></table></div></div>}
      </div>

      {showCreate && <CreateSellerModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
      {activateFor && <ActivateSubscriptionModal seller={activateFor} plans={plans} categories={planCategories} onClose={() => setActivateFor(null)} onDone={() => { setActivateFor(null); load(); }} />}
    </>
  );
}

function CreateSellerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { push } = useToast();
  const [form, setForm] = useState({ email: "", password: "", storeName: "", contactEmail: "", contactPhone: "" });
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

function ActivateSubscriptionModal({ seller, plans, categories, onClose, onDone }: { seller: Seller; plans: SubscriptionPlan[]; categories: PlanCategory[]; onClose: () => void; onDone: () => void }) {
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
            {categories.length > 0 ? categories.map((category) => {
              const categoryPlans = plans.filter((p) => p.categoryId === category.id);
              if (!categoryPlans.length) return null;
              return <optgroup key={category.id} label={category.name}>{categoryPlans.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.durationDays} روز — {p.price.toLocaleString("fa-IR")}</option>)}</optgroup>;
            }) : plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.durationDays} روز — {p.price.toLocaleString("fa-IR")}</option>)}
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
