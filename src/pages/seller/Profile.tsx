import React, { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { PageHeader } from "../../components/Layout";
import { Spinner } from "../../components/ui";
import { useToast } from "../../lib/toast";
import type { Seller } from "../../types";

export default function SellerProfile() {
  const { user } = useAuth();
  const { push } = useToast();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ seller: Seller }>(`/api/sellers/${user!.seller!.id}`).then((r) => setSeller(r.seller)).finally(() => setLoading(false));
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!seller) return;
    setSaving(true);
    try {
      await api.put(`/api/sellers/${seller.id}`, {
        storeName: seller.storeName,
        description: seller.description || undefined,
        logoUrl: seller.logoUrl || undefined,
        contactEmail: seller.contactEmail || undefined,
        contactPhone: seller.contactPhone || undefined,
      });
      push("پروفایل فروشگاه ذخیره شد.", "success");
    } catch (err) {
      push(err instanceof ApiError ? err.message : "خطا در ذخیره پروفایل.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !seller) return <><PageHeader title="پروفایل فروشگاه" /><div className="content"><Spinner /></div></>;

  return (
    <>
      <PageHeader title="پروفایل فروشگاه" />
      <div className="content">
        <form className="card" style={{ maxWidth: 620 }} onSubmit={save}>
          <p className="form-help" style={{ marginBottom: 14 }}>نشانی فروشگاه شما: <code>/sellers/{seller.slug}</code> (فقط پس از انتشار اولین محصول و فعال بودن اشتراک، عمومی می‌شود)</p>
          <div className="form-group"><label>نام فروشگاه</label><input value={seller.storeName} onChange={(e) => setSeller({ ...seller, storeName: e.target.value })} /></div>
          <div className="form-group"><label>توضیحات</label><textarea rows={4} value={seller.description ?? ""} onChange={(e) => setSeller({ ...seller, description: e.target.value })} /></div>
          <div className="form-group"><label>آدرس لوگو (URL)</label><input value={seller.logoUrl ?? ""} onChange={(e) => setSeller({ ...seller, logoUrl: e.target.value })} /></div>
          <div className="form-row">
            <div className="form-group"><label>ایمیل تماس</label><input type="email" value={seller.contactEmail ?? ""} onChange={(e) => setSeller({ ...seller, contactEmail: e.target.value })} /></div>
            <div className="form-group"><label>تلفن تماس</label><input value={seller.contactPhone ?? ""} onChange={(e) => setSeller({ ...seller, contactPhone: e.target.value })} /></div>
          </div>
          <button className="btn btn-primary" disabled={saving} type="submit">{saving ? "در حال ذخیره..." : "ذخیره تغییرات"}</button>
        </form>
      </div>
    </>
  );
}
