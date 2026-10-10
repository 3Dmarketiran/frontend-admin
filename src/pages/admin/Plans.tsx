import React, { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { PageHeader } from "../../components/Layout";
import { EmptyState, Modal, Spinner } from "../../components/ui";
import { useToast } from "../../lib/toast";
import type { SubscriptionPlan } from "../../types";

type PlanCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

type TrafficBundle = { id: string; name: string; gigabytes: number; priceToman: number; sortOrder: number; isActive: boolean; };

type PlanForm = {
  name: string;
  durationDays: number;
  price: number;
  discountPct: string;
  productLimit: string;
  storageLimitMb: string;
  trafficLimitGb: string;
  categoryId: string;
  sortOrder: string;
  isPublic: boolean;
};

const emptyForm: PlanForm = {
  name: "",
  durationDays: 30,
  price: 0,
  discountPct: "",
  productLimit: "",
  storageLimitMb: "",
  trafficLimitGb: "",
  categoryId: "",
  sortOrder: "0",
  isPublic: true,
};

export default function AdminPlans() {
  const { push } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [categories, setCategories] = useState<PlanCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showCategoryCreate, setShowCategoryCreate] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PlanCategory | null>(null);
  const [trafficBundles, setTrafficBundles] = useState<TrafficBundle[]>([]);
  const [editingBundle, setEditingBundle] = useState<TrafficBundle | null>(null);
  const [showBundleCreate, setShowBundleCreate] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [r, categoryResponse, trafficResponse] = await Promise.all([
        api.get<{ plans: SubscriptionPlan[]; categories: PlanCategory[] }>("/api/subscriptions/plans"),
        api.get<{ categories: PlanCategory[] }>("/api/subscriptions/categories/manage"),
        api.get<{ bundles: TrafficBundle[] }>("/api/traffic/bundles?includeInactive=true"),
      ]);
      setPlans(r.plans || []);
      setCategories(categoryResponse.categories || r.categories || []);
      setTrafficBundles(trafficResponse.bundles || []);
    } catch (err) {
      push(err instanceof ApiError ? err.message : "خطا در دریافت پلن‌ها.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function deletePlan(plan: SubscriptionPlan) {
    const confirmed = window.confirm(
      `پلن «${plan.name}» حذف شود؟\n\nسوابق اشتراک غیرفعال/قدیمی متصل به این پلن نیز از دیتابیس حذف می‌شوند. اگر اشتراک فعال داشته باشد، سرور اجازه حذف نمی‌دهد.`
    );
    if (!confirmed) return;
    setDeletingPlanId(plan.id);
    try {
      await api.delete(`/api/subscriptions/plans/${plan.id}`);
      push("پلن و سوابق غیرفعال وابسته حذف شدند.", "success");
      await load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "حذف پلن انجام نشد.", "error");
    } finally {
      setDeletingPlanId(null);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, SubscriptionPlan[]>();
    categories.forEach((category) => map.set(category.id, []));
    plans.forEach((plan) => {
      const id = plan.categoryId || "__uncategorized";
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push(plan);
    });
    return map;
  }, [categories, plans]);

  return (
    <>
      <PageHeader title="پلن‌های اشتراک" />
      <div className="content">
        <div className="section-head">
          <div>
            <h2 style={{ marginBottom: 4 }}>ساختار اشتراک فروشندگان</h2>
            <div className="form-help">
              دسته‌بندی بسازید و داخل هر دسته هر تعداد پلن لازم است قرار دهید.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-secondary" onClick={() => setShowCategoryCreate(true)}>
              + دسته‌بندی جدید
            </button>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + پلن جدید
            </button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 850, marginBottom: 12 }}>دسته‌بندی‌های اشتراک</div>
          <div style={{ display: "grid", gap: 10 }}>
            {categories.length === 0 ? (
              <div className="form-help">هنوز دسته‌بندی‌ای ساخته نشده است.</div>
            ) : categories.map((category) => (
              <div key={category.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: 14, background: "var(--color-bg-soft, #f7f8fb)", flexWrap: "wrap" }}>
                <div>
                  <strong>{category.name}</strong>
                  {category.description && <div className="form-help" style={{ marginTop: 3 }}>{category.description}</div>}
                  <div className="form-help" style={{ marginTop: 3 }}>{(grouped.get(category.id) || []).length} پلن · ترتیب {category.sortOrder}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={`badge ${category.isActive ? "badge-success" : "badge-muted"}`}>{category.isActive ? "فعال" : "غیرفعال"}</span>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditingCategory(category)}>✎ ویرایش</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {loading ? <Spinner /> : plans.length === 0 ? (
          <EmptyState icon="🗂️" text="هنوز پلنی تعریف نشده است." />
        ) : (
          <div style={{ display: "grid", gap: 24 }}>
            {categories.map((category) => {
              const items = grouped.get(category.id) || [];
              return (
                <section key={category.id}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                    <div>
                      <h3 style={{ margin: 0 }}>{category.name}</h3>
                      {category.description && <div className="form-help">{category.description}</div>}
                    </div>
                    <span className="form-help">{items.length} پلن</span>
                  </div>
                  {items.length === 0 ? <div className="card form-help">برای این دسته هنوز پلنی اضافه نشده است.</div> : (
                    <div className="grid grid-3">
                      {items.map((p) => <PlanCard key={p.id} plan={p} onEdit={() => setEditingPlan(p)} onDelete={() => void deletePlan(p)} deleting={deletingPlanId === p.id} />)}
                    </div>
                  )}
                </section>
              );
            })}
            {grouped.has("__uncategorized") && (grouped.get("__uncategorized") || []).length > 0 && (
              <section>
                <h3 style={{ margin: "0 0 10px" }}>بدون دسته‌بندی</h3>
                <div className="grid grid-3">
                  {(grouped.get("__uncategorized") || []).map((p) => <PlanCard key={p.id} plan={p} onEdit={() => setEditingPlan(p)} onDelete={() => void deletePlan(p)} deleting={deletingPlanId === p.id} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="section-head"><div><h2>بسته‌های ترافیک اضافه</h2><div className="form-help">بسته‌های فعال در سایت عمومی و پنل فروشنده نمایش داده می‌شوند.</div></div><button className="btn btn-primary btn-sm" onClick={() => setShowBundleCreate(true)}>＋ افزودن بسته ترافیک</button></div>
        <div className="grid grid-4">
          {trafficBundles.map(bundle => <div key={bundle.id} className="card" style={{ boxShadow: "none", border: "1px solid var(--color-border, #e5e7eb)" }}><div style={{ display:"flex", justifyContent:"space-between", gap:8 }}><strong>{bundle.name}</strong><span className={`badge ${bundle.isActive ? "badge-success" : "badge-muted"}`}>{bundle.isActive ? "فعال" : "غیرفعال"}</span></div><div style={{ marginTop:10, fontWeight:900 }}>{bundle.gigabytes} GB</div><div style={{ marginTop:4, color:"var(--color-text-muted)" }}>{bundle.priceToman.toLocaleString("fa-IR")} تومان</div><button className="btn btn-secondary btn-block btn-sm" style={{ marginTop:12 }} onClick={() => setEditingBundle(bundle)}>✎ ویرایش</button></div>)}
        </div>
      </div>

      {showCreate && <PlanModal mode="create" initialPlan={null} categories={categories} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); void load(); }} />}
      {editingPlan && <PlanModal mode="edit" initialPlan={editingPlan} categories={categories} onClose={() => setEditingPlan(null)} onSaved={() => { setEditingPlan(null); void load(); }} />}
      {showCategoryCreate && <CategoryModal mode="create" initialCategory={null} onClose={() => setShowCategoryCreate(false)} onSaved={() => { setShowCategoryCreate(false); void load(); }} />}
      {editingCategory && <CategoryModal mode="edit" initialCategory={editingCategory} onClose={() => setEditingCategory(null)} onSaved={() => { setEditingCategory(null); void load(); }} />}
      {(showBundleCreate || editingBundle) && <TrafficBundleModal bundle={editingBundle} onClose={() => { setEditingBundle(null); setShowBundleCreate(false); }} onSaved={() => { setEditingBundle(null); setShowBundleCreate(false); void load(); }} />} 
    </>
  );
}

function PlanCard({ plan, onEdit, onDelete, deleting }: { plan: SubscriptionPlan; onEdit: () => void; onDelete: () => void; deleting: boolean }) {
  return <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <div><div style={{ fontWeight: 800, fontSize: "1.08rem" }}>{plan.name}</div><div className="form-help">{formatDuration(plan.durationDays)}</div></div>
      <span className={`badge ${plan.isActive ? "badge-success" : "badge-muted"}`}>{plan.isActive ? "فعال" : "غیرفعال"}</span>
    </div>
    <div><div style={{ fontSize: "1.45rem", fontWeight: 900 }}>{plan.price.toLocaleString("fa-IR")}</div><div className="form-help">قیمت پلن</div></div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <PlanMeta label="محصول" value={plan.productLimit ? plan.productLimit.toLocaleString("fa-IR") : "نامحدود"} />
      <PlanMeta label="فضا" value={plan.storageLimitMb ? formatStorage(plan.storageLimitMb) : "نامحدود"} />
      <PlanMeta label="ترافیک ماهانه" value={plan.trafficLimitGb ? `${plan.trafficLimitGb} GB` : "نامحدود"} />
    </div>
    {plan.discountPct ? <span className="badge badge-info" style={{ width: "fit-content" }}>{plan.discountPct.toLocaleString("fa-IR")}% تخفیف</span> : null}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: "auto" }}>
      <button className="btn btn-secondary btn-block" onClick={onEdit}>✎ ویرایش پلن</button>
      <button className="btn btn-danger btn-block" onClick={onDelete} disabled={deleting}>{deleting ? "در حال حذف…" : "حذف پلن"}</button>
    </div>
  </div>;
}

function PlanMeta({ label, value }: { label: string; value: string }) {
  return <div style={{ padding: "10px 12px", borderRadius: 12, background: "var(--color-bg-soft, #f6f7fb)" }}><div style={{ fontSize: ".72rem", color: "var(--color-text-muted)", marginBottom: 3 }}>{label}</div><div style={{ fontWeight: 750, fontSize: ".88rem" }}>{value}</div></div>;
}

function formatDuration(days: number) { return days % 30 === 0 ? `${days / 30} ماه · ${days} روز` : `${days} روز`; }
function formatStorage(mb: number) { if (mb >= 1024) { const gb = mb / 1024; return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`; } return `${mb.toLocaleString("fa-IR")} MB`; }

function PlanModal({ mode, initialPlan, categories, onClose, onSaved }: { mode: "create" | "edit"; initialPlan: SubscriptionPlan | null; categories: PlanCategory[]; onClose: () => void; onSaved: () => void }) {
  const { push } = useToast();
  const [form, setForm] = useState<PlanForm>(() => initialPlan ? {
    name: initialPlan.name,
    durationDays: initialPlan.durationDays,
    price: initialPlan.price,
    discountPct: initialPlan.discountPct == null ? "" : String(initialPlan.discountPct),
    productLimit: initialPlan.productLimit == null ? "" : String(initialPlan.productLimit),
    storageLimitMb: initialPlan.storageLimitMb == null ? "" : String(initialPlan.storageLimitMb),
    trafficLimitGb: initialPlan.trafficLimitGb == null ? "" : String(initialPlan.trafficLimitGb),
    categoryId: initialPlan.categoryId || "",
    sortOrder: String(initialPlan.sortOrder ?? 0),
    isPublic: initialPlan.isPublic !== false,
  } : { ...emptyForm, categoryId: categories[0]?.id || "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); setError(null);
    const body = {
      name: form.name.trim(), durationDays: Number(form.durationDays), price: Number(form.price),
      discountPct: form.discountPct === "" ? undefined : Number(form.discountPct),
      productLimit: form.productLimit === "" ? undefined : Number(form.productLimit),
      storageLimitMb: form.storageLimitMb === "" ? undefined : Number(form.storageLimitMb),
      trafficLimitGb: form.trafficLimitGb === "" ? undefined : Number(form.trafficLimitGb),
      categoryId: form.categoryId || null, sortOrder: Number(form.sortOrder || 0), isPublic: form.isPublic,
    };
    try {
      if (mode === "create") { await api.post("/api/subscriptions/plans", body); push("پلن ایجاد شد.", "success"); }
      else if (initialPlan) { await api.put(`/api/subscriptions/plans/${initialPlan.id}`, body); push("پلن ویرایش شد.", "success"); }
      onSaved();
    } catch (err) { setError(err instanceof ApiError ? err.message : "ذخیره پلن انجام نشد."); }
    finally { setSubmitting(false); }
  }

  return <Modal title={mode === "create" ? "پلن اشتراک جدید" : `ویرایش «${initialPlan?.name ?? ""}»`} onClose={onClose}>
    <form onSubmit={onSubmit}>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-group"><label>نام پلن</label><input required minLength={2} maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div className="form-group"><label>دسته‌بندی</label><select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">بدون دسته‌بندی</option>{categories.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{categories.length === 0 && <div className="form-help">ابتدا یک دسته‌بندی اشتراک بسازید.</div>}</div>
      <div className="form-row"><div className="form-group"><label>مدت (روز)</label><input type="number" required min={1} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })} /></div><div className="form-group"><label>قیمت</label><input type="number" required min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div></div>
      <div className="form-row"><div className="form-group"><label>تخفیف (%)</label><input type="number" min={0} max={100} value={form.discountPct} onChange={(e) => setForm({ ...form, discountPct: e.target.value })} placeholder="اختیاری" /></div><div className="form-group"><label>ترتیب پلن</label><input type="number" min={0} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></div></div>
      <div className="form-row"><div className="form-group"><label>سقف محصول</label><input type="number" min={1} value={form.productLimit} onChange={(e) => setForm({ ...form, productLimit: e.target.value })} placeholder="خالی = نامحدود" /></div><div className="form-group"><label>فضای ذخیره‌سازی (MB)</label><input type="number" min={1} value={form.storageLimitMb} onChange={(e) => setForm({ ...form, storageLimitMb: e.target.value })} placeholder="مثلاً 5120" /></div></div>
      <div className="form-group"><label>سقف ترافیک ماهانه (GB) <span style={{color:"#dc2626"}}>*</span></label><input type="number" required min={1} value={form.trafficLimitGb} onChange={(e) => setForm({ ...form, trafficLimitGb: e.target.value })} placeholder="مثلاً 5" /><div className="form-help">این فیلد اجباری است. سقف دانلود عمومی فایل‌های این فروشگاه در هر ماه. بعد از سقف، فقط با بسته ترافیک خریداری‌شده ادامه پیدا می‌کند.</div></div>
      <div className="form-group" style={{ marginTop: 12 }}><label>نمایش در صفحه قیمت‌گذاری عمومی</label><select value={form.isPublic ? "yes" : "no"} onChange={(e) => setForm({ ...form, isPublic: e.target.value === "yes" })}><option value="yes">نمایش داده شود</option><option value="no">فقط برای مدیریت/اشتراک‌های قدیمی</option></select></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}><button className="btn btn-secondary" type="button" onClick={onClose} disabled={submitting}>انصراف</button><button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? "در حال ذخیره…" : "ذخیره پلن"}</button></div>
    </form>
  </Modal>;
}

function CategoryModal({ mode, initialCategory, onClose, onSaved }: { mode: "create" | "edit"; initialCategory: PlanCategory | null; onClose: () => void; onSaved: () => void }) {
  const { push } = useToast();
  const [name, setName] = useState(initialCategory?.name || "");
  const [slug, setSlug] = useState(initialCategory?.slug || "");
  const [description, setDescription] = useState(initialCategory?.description || "");
  const [sortOrder, setSortOrder] = useState(String(initialCategory?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(initialCategory?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); setError(null);
    try {
      const body = { name: name.trim(), slug: slug.trim() || undefined, description: description.trim() || null, sortOrder: Number(sortOrder || 0), isActive };
      if (mode === "create") { await api.post("/api/subscriptions/categories", body); push("دسته‌بندی اشتراک ایجاد شد.", "success"); }
      else if (initialCategory) { await api.put(`/api/subscriptions/categories/${initialCategory.id}`, body); push("دسته‌بندی ویرایش شد.", "success"); }
      onSaved();
    } catch (err) { setError(err instanceof ApiError ? err.message : "ذخیره دسته‌بندی انجام نشد."); }
    finally { setSubmitting(false); }
  }

  return <Modal title={mode === "create" ? "دسته‌بندی اشتراک جدید" : `ویرایش «${initialCategory?.name || ""}»`} onClose={onClose}>
    <form onSubmit={submit}>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-group"><label>نام دسته‌بندی</label><input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً پلن‌های شروع" /></div>
      <div className="form-group"><label>Slug (اختیاری)</label><input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="starter" /><div className="form-help">اگر خالی باشد، سیستم آن را تولید می‌کند.</div></div>
      <div className="form-group"><label>توضیح کوتاه</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} placeholder="مثلاً مناسب فروشگاه‌های تازه‌کار" /></div>
      <div className="form-row"><div className="form-group"><label>ترتیب نمایش</label><input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></div><div className="form-group"><label>وضعیت</label><select value={isActive ? "active" : "inactive"} onChange={(e) => setIsActive(e.target.value === "active")}><option value="active">فعال</option><option value="inactive">غیرفعال</option></select></div></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}><button className="btn btn-secondary" type="button" onClick={onClose}>انصراف</button><button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? "در حال ذخیره…" : "ذخیره دسته‌بندی"}</button></div>
    </form>
  </Modal>;
}


function TrafficBundleModal({ bundle, onClose, onSaved }: { bundle: TrafficBundle | null; onClose: () => void; onSaved: () => void }) {
  const { push } = useToast();
  const [form, setForm] = useState({ name: bundle?.name ?? "", gigabytes: String(bundle?.gigabytes ?? 5), priceToman: String(bundle?.priceToman ?? 0), sortOrder: String(bundle?.sortOrder ?? 0), isActive: bundle?.isActive ?? true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    const payload = { name: form.name.trim(), gigabytes: Number(form.gigabytes), priceToman: Number(form.priceToman), sortOrder: Number(form.sortOrder), isActive: form.isActive };
    try { if (bundle) await api.put(`/api/traffic/admin/bundles/${bundle.id}`, payload); else await api.post("/api/traffic/admin/bundles", payload); push(bundle ? "بسته ترافیک ویرایش شد." : "بسته ترافیک ایجاد شد.", "success"); onSaved(); }
    catch (err) { setError(err instanceof ApiError ? err.message : "ذخیره بسته انجام نشد."); }
    finally { setSaving(false); }
  }
  return <Modal title={bundle ? `ویرایش «${bundle.name}»` : "افزودن بسته ترافیک"} onClose={onClose}><form onSubmit={submit}>{error && <div className="alert alert-error">{error}</div>}<div className="form-group"><label>نام بسته</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="مثلاً بسته ۱۰ گیگابایتی" /></div><div className="form-row"><div className="form-group"><label>حجم (GB)</label><input type="number" min={1} max={1000} required value={form.gigabytes} onChange={e=>setForm({...form,gigabytes:e.target.value})}/></div><div className="form-group"><label>قیمت (تومان)</label><input type="number" min={1} required value={form.priceToman} onChange={e=>setForm({...form,priceToman:e.target.value})}/></div></div><div className="form-row"><div className="form-group"><label>ترتیب نمایش</label><input type="number" min={0} value={form.sortOrder} onChange={e=>setForm({...form,sortOrder:e.target.value})}/></div><div className="form-group"><label>وضعیت</label><select value={form.isActive?"active":"inactive"} onChange={e=>setForm({...form,isActive:e.target.value==="active"})}><option value="active">فعال</option><option value="inactive">غیرفعال</option></select></div></div><div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:18}}><button className="btn btn-secondary" type="button" onClick={onClose}>انصراف</button><button className="btn btn-primary" type="submit" disabled={saving}>{saving?"در حال ذخیره…":"ذخیره"}</button></div></form></Modal>;
}
