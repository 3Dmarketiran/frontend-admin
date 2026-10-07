import React, { useEffect, useRef, useState } from "react";
import { api, ApiError, API_URL } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { PageHeader } from "../../components/Layout";
import { Spinner } from "../../components/ui";
import { useToast } from "../../lib/toast";
import type { Category, Seller } from "../../types";

type LogoUploadResponse = { seller: Seller };

function Icon({ name }: { name: "store" | "phone" | "mail" | "pin" | "image" }) {
  const paths = {
    store: <><path d="M4 10.5V20h16v-9.5"/><path d="M3 10.5h18L19 4H5l-2 6.5Z"/><path d="M8 20v-5h8v5"/></>,
    phone: <path d="M7.5 3.5 5 4.8c-.8.4-1.1 1.3-.8 2.2 1.8 5.7 6.3 10.2 12 12 .9.3 1.8 0 2.2-.8l1.3-2.5-3.4-2.1-1.7 1.7c-2.2-.9-4.4-3.1-5.3-5.3L11 8.3 8.9 4.9 7.5 3.5Z"/>,
    mail: <><rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="m5 7 7 5 7-5"/></>,
    pin: <><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.3"/></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 2-2 5 5"/></>,
  };
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function SellerProfile() {
  const { user } = useAuth();
  const { push } = useToast();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const resolvedLogo = seller?.logoUrl || logoPreview;
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [themeColor, setThemeColor] = useState("#2e6fce");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<"checking" | "ok" | "error">("checking");
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  async function loadProfile() {
    const sellerId = user?.seller?.id;
    if (!sellerId) {
      setLoading(false);
      setProfileError("حساب فروشنده به یک فروشگاه متصل نیست.");
      setApiStatus("error");
      return;
    }

    setLoading(true);
    setProfileError(null);
    setApiStatus("checking");

    const [health, sellerResponse, categoryResponse] = await Promise.allSettled([
      api.get<{ status: string }>("/api/health/live"),
      api.get<{ seller: Seller }>(`/api/sellers/${sellerId}`),
      api.get<{ categories: Category[] }>("/api/categories"),
    ]);

    setApiStatus(health.status === "fulfilled" && health.value.status === "ok" ? "ok" : "error");

    if (sellerResponse.status === "rejected") {
      setProfileError(
        sellerResponse.reason instanceof ApiError
          ? sellerResponse.reason.message
          : "خطا در دریافت اطلاعات فروشگاه."
      );
      setSeller(null);
      setLoading(false);
      return;
    }

    const sellerData = sellerResponse.value.seller;
    setSeller(sellerData);
    setLogoPreview(sellerData.logoUrl || null);
    setCategoryId(sellerData.category?.id || "");
    setThemeColor(sellerData.themeColor || "#2e6fce");

    if (categoryResponse.status === "fulfilled") {
      setCategories(categoryResponse.value.categories.filter((item) => item.isActive !== false));
    } else {
      setCategories([]);
      push("اطلاعات فروشگاه دریافت شد، اما فهرست دسته‌بندی‌ها در دسترس نیست.", "error");
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadProfile();
  }, [user]);

  function revokePreview(url: string | null) {
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
  }

  async function uploadLogo(file: File) {
    if (!seller) return;
    if (!file.type.startsWith("image/")) { push("فایل لوگو باید یک تصویر باشد.", "error"); return; }
    if (file.size > 5 * 1024 * 1024) { push("حجم لوگو نباید بیشتر از ۵ مگابایت باشد.", "error"); return; }
    const localPreview = URL.createObjectURL(file);
    revokePreview(logoPreview); setLogoPreview(localPreview); setUploadingLogo(true);
    try {
      const formData = new FormData(); formData.append("logo", file);
      const result = await api.upload<LogoUploadResponse>(`/api/sellers/${seller.id}/logo`, formData);
      setSeller(result.seller); revokePreview(localPreview); setLogoPreview(result.seller.logoUrl || null);
      push("لوگوی فروشگاه با موفقیت آپلود شد.", "success");
    } catch (err) {
      revokePreview(localPreview); setLogoPreview(seller.logoUrl || null);
      push(err instanceof ApiError ? err.message : "خطا در آپلود لوگو.", "error");
    } finally { setUploadingLogo(false); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!seller) return; setSaving(true);
    try {
      const result = await api.put<{ seller: Seller }>(`/api/sellers/${seller.id}`, {
        storeName: seller.storeName,
        description: seller.description || undefined,
        logoUrl: seller.logoUrl || undefined,
        contactEmail: seller.contactEmail || undefined,
        contactPhone: seller.contactPhone || undefined,
        address: seller.address || undefined,
        categoryId: categoryId || null,
        themeColor,
      });
      setSeller(result.seller);
      setCategoryId(result.seller.category?.id || categoryId);
      window.dispatchEvent(new CustomEvent("seller-theme-changed", { detail: { color: result.seller.themeColor || themeColor } }));
      setLogoPreview(result.seller.logoUrl || null);
      push("پروفایل فروشگاه ذخیره شد.", "success");
    } catch (err) {
      push(err instanceof ApiError ? err.message : "خطا در ذخیره پروفایل.", "error");
    } finally { setSaving(false); }
  }

  if (loading) return (
    <>
      <PageHeader title="پروفایل فروشگاه" />
      <div className="content">
        <div className="profile-loading-card card"><Spinner /><strong>در حال دریافت اطلاعات فروشگاه…</strong><span>ارتباط با API حداکثر چند ثانیه بررسی می‌شود.</span></div>
      </div>
    </>
  );

  if (!seller) return (
    <>
      <PageHeader title="پروفایل فروشگاه" />
      <div className="content">
        <section className="card profile-api-error-card">
          <div className="profile-api-error-card__icon">!</div>
          <div className="profile-api-error-card__copy">
            <strong>دریافت اطلاعات فروشگاه ناموفق بود.</strong>
            <p>{profileError || "API پاسخ قابل استفاده‌ای برنگرداند."}</p>
            <div className="profile-api-meta">
              <span>آدرس API</span>
              <code>{API_URL}</code>
              <span className={apiStatus === "ok" ? "is-ok" : apiStatus === "checking" ? "is-checking" : "is-error"}>
                {apiStatus === "ok" ? "اتصال برقرار" : apiStatus === "checking" ? "در حال بررسی" : "اتصال ناموفق"}
              </span>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => void loadProfile()}>تلاش دوباره</button>
          </div>
        </section>
      </div>
    </>
  );

  return (
    <>
      <PageHeader title="پروفایل فروشگاه" />
      <div className="content seller-profile-editor">
        <div className={`profile-api-status profile-api-status--${apiStatus}`}>
          <span className="profile-api-status__dot" aria-hidden="true" />
          <div>
            <strong>اتصال API پروفایل</strong>
            <span>{apiStatus === "ok" ? "برقرار" : apiStatus === "checking" ? "در حال بررسی" : "ناموفق"}</span>
          </div>
          <code>{API_URL}</code>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void loadProfile()}>بررسی دوباره</button>
        </div>
        <div className="seller-profile-hero card" style={{"--seller-theme": themeColor} as React.CSSProperties}>
          <div className="seller-profile-hero__avatar">
            {(resolvedLogo || logoPreview) ? <img src={resolvedLogo || logoPreview || ""} alt={seller.storeName} onError={(e) => { e.currentTarget.style.display="none"; }} /> : <Icon name="store" />}
          </div>
          <div className="seller-profile-hero__copy">
            <span className="seller-eyebrow">صفحه عمومی فروشگاه</span>
            <h2>{seller.storeName}</h2>
            <div className="seller-handle">/{seller.slug}</div>
            <p>{seller.description || "هنوز بیویی برای فروشگاه نوشته نشده است."}</p>
            <div className="seller-quick-info">
              {seller.contactPhone && <span><Icon name="phone" />{seller.contactPhone}</span>}
              {seller.address && <span><Icon name="pin" />{seller.address}</span>}
              {seller.contactEmail && <span><Icon name="mail" />{seller.contactEmail}</span>}
            </div>
          </div>
          <div className="seller-profile-hero__action">
            <button type="button" className="btn btn-dark" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
              <Icon name="image" />{uploadingLogo ? "در حال آپلود..." : "تغییر عکس پروفایل"}
            </button>
          </div>
        </div>

        <form onSubmit={save}>
          <div className="seller-profile-layout">
            <div className="seller-profile-main">
              <section className="card seller-editor-card">
                <div className="seller-card-heading"><div><span>اطلاعات اصلی</span><h3>پروفایل فروشگاه</h3></div><span className="seller-status">فعال</span></div>
                <div className="seller-avatar-upload">
                  <div className="seller-avatar-upload__image">
                    {(resolvedLogo || logoPreview) ? <img src={resolvedLogo || logoPreview || ""} alt="پیش‌نمایش لوگو" /> : <Icon name="store" />}
                  </div>
                  <div><strong>عکس پروفایل / لوگوی فروشگاه</strong><p>JPG، PNG یا WEBP — حداکثر ۵ مگابایت</p><input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const f=e.target.files?.[0]; if(f) void uploadLogo(f); e.target.value=""; }} /><button type="button" className="btn btn-outline" onClick={() => logoInputRef.current?.click()}>انتخاب تصویر</button></div>
                </div>
                <div className="form-group"><label>نام فروشگاه</label><input value={seller.storeName} onChange={(e)=>setSeller({...seller,storeName:e.target.value})} required maxLength={120}/></div>
                <div className="form-group"><label>دسته‌بندی فروشگاه</label><select value={categoryId} onChange={(e)=>setCategoryId(e.target.value)}><option value="">بدون دسته‌بندی</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><div className="form-help">این دسته‌بندی مربوط به خود فروشگاه است و در سایت عمومی کنار فروشگاه نمایش داده می‌شود.</div></div>
                <div className="form-group seller-theme-field"><label>رنگ پس‌زمینه فروشگاه</label><div className="seller-theme-control"><span className="seller-theme-swatch" style={{backgroundColor: themeColor}} aria-hidden="true" /><input type="color" value={themeColor} onChange={(e)=>setThemeColor(e.target.value)} aria-label="رنگ پس‌زمینه فروشگاه" /><input value={themeColor} onChange={(e)=>setThemeColor(e.target.value)} pattern="^#[0-9A-Fa-f]{6}$" maxLength={7} aria-label="کد رنگ" /></div><div className="form-help">این رنگ به‌عنوان پس‌زمینه بخش معرفی فروشگاه در سایت عمومی استفاده می‌شود؛ عکس پس‌زمینه وجود ندارد.</div></div>
                <div className="form-group"><label>بیو / معرفی فروشگاه</label><textarea rows={6} value={seller.description ?? ""} onChange={(e)=>setSeller({...seller,description:e.target.value})} maxLength={2000} placeholder="مثلاً: فروش تخصصی مبلمان مدرن، ارسال به سراسر کشور و مشاوره قبل از خرید..."/><div className="form-help">همین متن در پروفایل عمومی فروشگاه به مشتری نمایش داده می‌شود.</div></div>
              </section>

              <section className="card seller-editor-card">
                <div className="seller-card-heading"><div><span>ارتباط با مشتری</span><h3>اطلاعات تماس و آدرس</h3></div></div>
                <div className="form-row">
                  <div className="form-group"><label>شماره تماس</label><div className="input-with-icon"><Icon name="phone"/><input value={seller.contactPhone ?? ""} onChange={(e)=>setSeller({...seller,contactPhone:e.target.value})} placeholder="۰۹۱۲..."/></div></div>
                  <div className="form-group"><label>ایمیل</label><div className="input-with-icon"><Icon name="mail"/><input type="email" value={seller.contactEmail ?? ""} onChange={(e)=>setSeller({...seller,contactEmail:e.target.value})} placeholder="info@example.com"/></div></div>
                </div>
                <div className="form-group"><label>آدرس فروشگاه</label><div className="input-with-icon input-with-icon--top"><Icon name="pin"/><textarea rows={3} value={seller.address ?? ""} onChange={(e)=>setSeller({...seller,address:e.target.value})} placeholder="استان، شهر، خیابان، پلاک..."/></div></div>
              </section>
            </div>

            <aside className="seller-profile-side">
              <div className="card seller-profile-tips"><strong>نکته برای پروفایل حرفه‌ای</strong><ul><li>یک عکس واضح و مربعی برای لوگو انتخاب کنید.</li><li>بیو را کوتاه، واقعی و قابل فهم بنویسید.</li><li>شماره تماس و آدرس را برای ارتباط سریع کامل کنید.</li><li>پیش‌نمایش کامل بالای صفحه دقیقاً همان چیزی است که مشتری می‌بیند.</li></ul></div>
            </aside>
          </div>
          <div className="seller-save-bar"><div><strong>آماده انتشار اطلاعات؟</strong><span>بعد از ذخیره، اطلاعات در انتشار بعدی سایت عمومی نمایش داده می‌شود.</span></div><button className="btn btn-dark seller-save-button" disabled={saving || uploadingLogo} type="submit">{saving ? "در حال ذخیره..." : "ذخیره تغییرات"}</button></div>
        </form>
      </div>
    </>
  );
}
