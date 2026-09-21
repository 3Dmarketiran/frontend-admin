import React, { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { PageHeader } from "../../components/Layout";
import { Spinner } from "../../components/ui";
import { useToast } from "../../lib/toast";
import type { PlatformSettings } from "../../types";

export default function AdminBranding() {
  const { push } = useToast();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.get<{ settings: PlatformSettings }>("/api/admin/branding").then((r) => setSettings(r.settings)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await api.put("/api/admin/branding", {
        platformName: settings.platformName,
        colorPrimary: settings.colorPrimary,
        colorSecondary: settings.colorSecondary,
        colorAccent: settings.colorAccent,
        colorBackground: settings.colorBackground,
        colorText: settings.colorText,
        fontFamily: settings.fontFamily,
        contactEmail: settings.contactEmail || undefined,
        contactPhone: settings.contactPhone || undefined,
      });
      push("تنظیمات برندینگ ذخیره شد.", "success");
    } catch (err) {
      push(err instanceof ApiError ? err.message : "خطا در ذخیره تنظیمات.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) return <><PageHeader title="برندینگ / تنظیمات" /><div className="content"><Spinner /></div></>;

  const colorField = (label: string, key: keyof PlatformSettings) => (
    <div className="form-group">
      <label>{label}</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="color" value={settings[key] as string} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} style={{ width: 44, padding: 2 }} />
        <input value={settings[key] as string} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} />
      </div>
    </div>
  );

  return (
    <>
      <PageHeader title="برندینگ / تنظیمات پلتفرم" />
      <div className="content">
        <form onSubmit={save} className="card" style={{ maxWidth: 640 }}>
          <div className="form-group"><label>نام پلتفرم</label><input value={settings.platformName} onChange={(e) => setSettings({ ...settings, platformName: e.target.value })} /></div>
          <div className="form-row">
            {colorField("رنگ اصلی", "colorPrimary")}
            {colorField("رنگ ثانویه", "colorSecondary")}
          </div>
          <div className="form-row">
            {colorField("رنگ تاکیدی", "colorAccent")}
            {colorField("رنگ پس‌زمینه", "colorBackground")}
          </div>
          {colorField("رنگ متن", "colorText")}
          <div className="form-group"><label>فونت</label><input value={settings.fontFamily} onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })} /></div>
          <div className="form-row">
            <div className="form-group"><label>ایمیل تماس عمومی</label><input type="email" value={settings.contactEmail ?? ""} onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })} /></div>
            <div className="form-group"><label>تلفن تماس عمومی</label><input value={settings.contactPhone ?? ""} onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })} /></div>
          </div>
          <button className="btn btn-primary" disabled={saving} type="submit">{saving ? "در حال ذخیره..." : "ذخیره تغییرات"}</button>
          <p className="form-help">این تنظیمات در انتشار بعدی روی <code>settings.json</code> وب‌سایت عمومی اعمال می‌شود.</p>
        </form>
      </div>
    </>
  );
}
