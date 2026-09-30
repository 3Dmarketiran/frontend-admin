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

type PlanForm = {
  name: string;
  durationDays: number;
  price: number;
  discountPct: string;
  productLimit: string;
  storageLimitMb: string;
  categoryId: string;
  sortOrder: string;
};

const emptyForm: PlanForm = {
  name: "",
  durationDays: 30,
  price: 0,
  discountPct: "",
  productLimit: "",
  storageLimitMb: "",
  categoryId: "",
  sortOrder: "0",
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

  async function load() {
    setLoading(true);
    try {
      const [r, categoryResponse] = await Promise.all([
        api.get<{ plans: SubscriptionPlan[]; categories: PlanCategory[] }>("/api/subscriptions/plans"),
        api.get<{ categories: PlanCategory[] }>("/api/subscriptions/categories/manage"),
      ]);
      setPlans(r.plans || []);
      setCategories(categoryResponse.categories || r.categories || []);
    } catch (err) {
      push(err instanceof ApiError ? err.message : "خطا در دریافت پلن‌ها.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

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
                      {items.map((p) => <PlanCard key={p.id} plan={p} onEdit={() => setEditingPlan(p)} />)}
                    </div>
                  )}
                </section>
              );
            })}
            {grouped.has("__uncategorized") && (grouped.get("__uncategorized") || []).length > 0 && (
              <section>
                <h3 style={{ margin: "0 0 10px" }}>بدون دسته‌بندی</h3>
                <div className="grid grid-3">
                  {(grouped.get("__uncategorized") || []).map((p) => <PlanCard key={p.id} plan={p} onEdit={() => setEditingPlan(p)} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {showCreate && <PlanModal mode="create" initialPlan={null} categories={categories} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); void load(); }} />}
      {editingPlan && <PlanModal mode="edit" initialPlan={editingPlan} categories={categories} onClose={() => setEditingPlan(null)} onSaved={() => { setEditingPlan(null); void load(); }} />}
      {showCategoryCreate && <CategoryModal mode="create" initialCategory={null} onClose={() => setShowCategoryCreate(false)} onSaved={() => { setShowCategoryCreate(false); void load(); }} />}
      {editingCategory && <CategoryModal mode="edit" initialCategory={editingCategory} onClose={() => setEditingCategory(null)} onSaved={() => { setEditingCategory(null); void load(); }} />}
    </>
  );
}

function PlanCard({ plan, onEdit }: { plan: SubscriptionPlan; onEdit: () => void }) {
  return <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <div><div style={{ fontWeight: 800, fontSize: "1.08rem" }}>{plan.name}</div><div className="form-help">{formatDuration(plan.durationDays)}</div></div>
      <span className={`badge ${plan.isActive ? "badge-success" : "badge-muted"}`}>{plan.isActive ? "فعال" : "غیرفعال"}</span>
    </div>
    <div><div style={{ fontSize: "1.45rem", fontWeight: 900 }}>{plan.price.toLocaleString("fa-IR")}</div><div className="form-help">قیمت پلن</div></div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <PlanMeta label="محصول" value={plan.productLimit ? plan.productLimit.toLocaleString("fa-IR") : "نامحدود"} />
      <PlanMeta label="فضا" value={plan.storageLimitMb ? formatStorage(plan.storageLimitMb) : "نامحدود"} />
    </div>
    {plan.discountPct ? <span className="badge badge-info" style={{ width: "fit-content" }}>{plan.discountPct.toLocaleString("fa-IR")}% تخفیف</span> : null}
    <button className="btn btn-secondary btn-block" onClick={onEdit}>✎ ویرایش پلن</button>
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
    categoryId: initialPlan.categoryId || "",
    sortOrder: String(initialPlan.sortOrder ?? 0),
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
      categoryId: form.categoryId || null, sortOrder: Number(form.sortOrder || 0),
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
      <div className="form-row"><div className="form-group"><label>سقف محصول</label><input type="number" min={1} value={form.productLimit} onChange={(e) => setForm({ ...form, productLimit: e.target.value })} placeholder="خالی = نامحدود" /></div><div className="form-group"><label>فضای ذخیره‌سازی (MB)</label><input type="number" min={1} value={form.storageLimitMb} onChange={(e) => setForm({ ...form, storageLimitMb: e.target.value })} placeholder="مثلاً 10240" /></div></div>
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
