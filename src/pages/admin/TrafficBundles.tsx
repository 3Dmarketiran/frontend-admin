import React, { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { PageHeader } from "../../components/Layout";
import { useToast } from "../../lib/toast";

type TrafficBundle = {
  id: string;
  name: string;
  gigabytes: number;
  priceToman: number;
  sortOrder: number;
  isActive: boolean;
};

type PendingPurchase = {
  id: string;
  seller?: { storeName?: string | null } | null;
  bundle?: { name?: string | null } | null;
  gigabytes: number;
  priceToman: number;
  requestedAt: string;
};

type FormState = {
  name: string;
  gigabytes: string;
  priceToman: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: "",
  gigabytes: "1",
  priceToman: "0",
  sortOrder: "0",
  isActive: true,
};

function formatPrice(value: number) {
  return `${value.toLocaleString("fa-IR")} تومان`;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function AdminTrafficBundles() {
  const { push } = useToast();
  const [bundles, setBundles] = useState<TrafficBundle[]>([]);
  const [pending, setPending] = useState<PendingPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<TrafficBundle | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  async function load() {
    setLoading(true);
    try {
      const [bundleResponse, overview] = await Promise.all([
        api.get<{ bundles: TrafficBundle[] }>("/api/traffic/bundles?includeInactive=true"),
        api.get<{ pendingPurchases: PendingPurchase[] }>("/api/traffic/admin/overview"),
      ]);
      setBundles(bundleResponse.bundles || []);
      setPending(overview.pendingPurchases || []);
    } catch (error) {
      push(error instanceof ApiError ? error.message : "دریافت اطلاعات ترافیک ناموفق بود.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function openCreate() {
    setEditing(null);
    setShowEditor(true);
    setForm(emptyForm);
  }

  function openEdit(bundle: TrafficBundle) {
    setEditing(bundle);
    setShowEditor(true);
    setForm({
      name: bundle.name,
      gigabytes: String(bundle.gigabytes),
      priceToman: String(bundle.priceToman),
      sortOrder: String(bundle.sortOrder),
      isActive: bundle.isActive,
    });
  }

  async function save() {
    const gigabytes = Number(form.gigabytes);
    const priceToman = Number(form.priceToman);
    const sortOrder = Number(form.sortOrder);
    if (!form.name.trim() || !Number.isInteger(gigabytes) || gigabytes <= 0 || !Number.isFinite(priceToman) || priceToman < 0 || !Number.isInteger(sortOrder) || sortOrder < 0) {
      push("نام، حجم، قیمت و ترتیب بسته را صحیح وارد کنید.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), gigabytes, priceToman, sortOrder, isActive: form.isActive };
      if (editing) {
        await api.put(`/api/traffic/admin/bundles/${editing.id}`, payload);
        push("بسته ترافیک ویرایش شد.", "success");
      } else {
        await api.post("/api/traffic/admin/bundles", payload);
        push("بسته ترافیک ایجاد شد.", "success");
      }
      await load();
      setEditing(null);
      setShowEditor(false);
      setForm(emptyForm);
    } catch (error) {
      push(error instanceof ApiError ? error.message : "ذخیره بسته ترافیک ناموفق بود.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function decide(id: string, action: "approve" | "reject") {
    try {
      await api.post(`/api/traffic/admin/purchases/${id}/${action}`, {});
      push(action === "approve" ? "درخواست ترافیک تأیید شد." : "درخواست ترافیک رد شد.", "success");
      await load();
    } catch (error) {
      push(error instanceof ApiError ? error.message : "عملیات روی درخواست ترافیک ناموفق بود.", "error");
    }
  }

  return (
    <>
      <PageHeader title="پلن‌های ترافیک" />
      <div className="content">
        <div className="section-head">
          <div>
            <h2 style={{ marginBottom: 4 }}>مدیریت بسته‌های ترافیک</h2>
            <div className="form-help">بسته‌های فعال در صفحه عمومی و پنل فروشندگان نمایش داده می‌شوند.</div>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>+ بسته جدید</button>
        </div>

        {loading ? <div className="card">در حال دریافت اطلاعات…</div> : (
          <div className="grid grid-3">
            {bundles.map((bundle) => (
              <article key={bundle.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong>{bundle.name}</strong>
                  <span className={`badge ${bundle.isActive ? "badge-success" : "badge-muted"}`}>{bundle.isActive ? "فعال" : "غیرفعال"}</span>
                </div>
                <div style={{ marginTop: 14, fontSize: 28, fontWeight: 900 }}>{bundle.gigabytes} GB</div>
                <div style={{ marginTop: 4, color: "var(--color-text-muted)" }}>{formatPrice(bundle.priceToman)}</div>
                <div className="form-help" style={{ marginTop: 6 }}>ترتیب نمایش: {bundle.sortOrder}</div>
                <button className="btn btn-secondary btn-block btn-sm" style={{ marginTop: 14 }} onClick={() => openEdit(bundle)}>✎ ویرایش</button>
              </article>
            ))}
            {bundles.length === 0 && <div className="card form-help">هنوز بسته ترافیکی ساخته نشده است.</div>}
          </div>
        )}

        <section className="card" style={{ marginTop: 24 }}>
          <div className="section-head">
            <div>
              <h2>درخواست‌های خرید در انتظار بررسی</h2>
              <div className="form-help">بعد از تأیید پرداخت، حجم خریداری‌شده به سهم ترافیک دوره جاری اضافه می‌شود.</div>
            </div>
            <span className="badge badge-muted">{pending.length.toLocaleString("fa-IR")} مورد</span>
          </div>
          {pending.length === 0 ? <div className="form-help">درخواستی در انتظار بررسی نیست.</div> : (
            <div className="table-wrap"><table><thead><tr><th>فروشگاه</th><th>بسته</th><th>حجم</th><th>مبلغ</th><th>زمان</th><th>عملیات</th></tr></thead><tbody>
              {pending.map((item) => <tr key={item.id}>
                <td>{item.seller?.storeName || "—"}</td>
                <td>{item.bundle?.name || "—"}</td>
                <td>{item.gigabytes} GB</td>
                <td>{formatPrice(item.priceToman)}</td>
                <td>{formatDate(item.requestedAt)}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => void decide(item.id, "approve")}>تأیید</button>
                  <button className="btn btn-outline btn-sm" onClick={() => void decide(item.id, "reject")}>رد</button>
                </td>
              </tr>)}
            </tbody></table></div>
          )}
        </section>

        {showEditor && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) { setEditing(null); setShowEditor(false); setForm(emptyForm); } }}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="بسته ترافیک">
            <div className="modal-header"><h2>{editing ? "ویرایش بسته ترافیک" : "ایجاد بسته ترافیک"}</h2><button className="btn btn-ghost" onClick={() => { setEditing(null); setShowEditor(false); setForm(emptyForm); }}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label>نام بسته</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="form-group"><label>حجم (GB)</label><input type="number" min={1} step={1} value={form.gigabytes} onChange={(e) => setForm({ ...form, gigabytes: e.target.value })} /></div>
              <div className="form-group"><label>قیمت (تومان)</label><input type="number" min={0} step={1} value={form.priceToman} onChange={(e) => setForm({ ...form, priceToman: e.target.value })} /></div>
              <div className="form-group"><label>ترتیب نمایش</label><input type="number" min={0} step={1} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></div>
              <div className="form-group"><label>وضعیت</label><select value={form.isActive ? "active" : "inactive"} onChange={(e) => setForm({ ...form, isActive: e.target.value === "active" })}><option value="active">فعال و قابل نمایش</option><option value="inactive">غیرفعال</option></select></div>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => { setEditing(null); setShowEditor(false); setForm(emptyForm); }}>انصراف</button><button className="btn btn-primary" disabled={saving} onClick={() => void save()}>{saving ? "در حال ذخیره…" : "ذخیره"}</button></div>
          </div>
        </div>}
      </div>
    </>
  );
}
