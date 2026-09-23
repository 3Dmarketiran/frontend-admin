import React, { useEffect, useRef, useState } from "react";
import { api, ApiError, API_URL } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { PageHeader } from "../../components/Layout";
import { Spinner } from "../../components/ui";
import { useToast } from "../../lib/toast";
import type { Seller } from "../../types";

type LogoUploadResponse = {
  seller: Seller;
};

export default function SellerProfile() {
  const { user } = useAuth();
  const { push } = useToast();

  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; isActive: boolean }>>([]);

  const logoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!user?.seller?.id) {
      setLoading(false);
      return;
    }

    Promise.all([
      api.get<{ seller: Seller }>(`/api/sellers/${user.seller.id}`),
      api.get<{ categories: Array<{ id: string; name: string; isActive: boolean }> }>("/api/categories"),
    ])
      .then(([sellerResult, categoriesResult]) => {
        setSeller(sellerResult.seller);
        setLogoPreview(sellerResult.seller.logoUrl || null);
        setCategories(categoriesResult.categories ?? []);
      })
      .catch((err) => {
        push(
          err instanceof ApiError
            ? err.message
            : "خطا در دریافت اطلاعات فروشگاه.",
          "error"
        );
      })
      .finally(() => setLoading(false));
  }, [user, push]);

  function revokePreview(url: string | null) {
    if (url?.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  }

  async function uploadLogo(file: File) {
    if (!seller) return;

    if (!file.type.startsWith("image/")) {
      push("فایل لوگو باید یک تصویر باشد.", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      push("حجم لوگو نباید بیشتر از ۵ مگابایت باشد.", "error");
      return;
    }

    const localPreview = URL.createObjectURL(file);

    revokePreview(logoPreview);
    setLogoPreview(localPreview);
    setUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append("logo", file);

      const result = await api.upload<LogoUploadResponse>(
        `/api/sellers/${seller.id}/logo`,
        formData
      );

      setSeller(result.seller);

      revokePreview(localPreview);
      setLogoPreview(result.seller.logoUrl || null);

      push("لوگوی فروشگاه با موفقیت آپلود شد.", "success");
    } catch (err) {
      revokePreview(localPreview);

      setLogoPreview(seller.logoUrl || null);

      push(
        err instanceof ApiError
          ? err.message
          : "خطا در آپلود لوگو.",
        "error"
      );
    } finally {
      setUploadingLogo(false);
    }
  }

  function handleLogoChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (file) {
      void uploadLogo(file);
    }

    event.target.value = "";
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();

    if (!seller) return;

    setSaving(true);

    try {
      const result = await api.put<{ seller: Seller }>(
        `/api/sellers/${seller.id}`,
        {
          storeName: seller.storeName,
          description: seller.description || undefined,
          logoUrl: seller.logoUrl || undefined,
          contactEmail: seller.contactEmail || undefined,
          contactPhone: seller.contactPhone || undefined,
          address: seller.address || undefined,
          categoryId: seller.sellerCategoryId ?? seller.sellerCategory?.id ?? null,
        }
      );

      setSeller(result.seller);
      setLogoPreview(result.seller.logoUrl || null);

      push("پروفایل فروشگاه ذخیره شد.", "success");
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "خطا در ذخیره پروفایل.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading || !seller) {
    return (
      <>
        <PageHeader title="پروفایل فروشگاه" />
        <div className="content">
          <Spinner />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="پروفایل فروشگاه" />

      <div className="content">
        <form
          className="card"
          style={{
            maxWidth: 720,
            margin: "0 auto",
          }}
          onSubmit={save}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              marginBottom: 24,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                }}
              >
                اطلاعات فروشگاه
              </h2>

              <p
                className="form-help"
                style={{
                  marginTop: 6,
                  marginBottom: 0,
                }}
              >
                اطلاعاتی که مشتریان در صفحه فروشگاه مشاهده می‌کنند.
              </p>
            </div>
          </div>

          <div
            style={{
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 20,
                  overflow: "hidden",
                  border: "1px solid var(--border, #e5e7eb)",
                  background: "var(--surface-muted, #f5f5f5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="لوگوی فروشگاه"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: 32,
                      opacity: 0.35,
                    }}
                  >
                    🏪
                  </span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 220 }}>
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  لوگوی فروشگاه
                </div>

                <div
                  className="form-help"
                  style={{
                    marginBottom: 12,
                  }}
                >
                  فرمت‌های JPG، PNG و WEBP تا حداکثر ۵ مگابایت.
                </div>

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogoChange}
                  style={{ display: "none" }}
                />

                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={uploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {uploadingLogo
                    ? "در حال آپلود..."
                    : "انتخاب و آپلود لوگو"}
                </button>
              </div>
            </div>

            {uploadingLogo && (
              <div
                style={{
                  marginTop: 16,
                  height: 6,
                  borderRadius: 999,
                  overflow: "hidden",
                  background: "var(--border, #e5e7eb)",
                }}
              >
                <div
                  style={{
                    width: "65%",
                    height: "100%",
                    borderRadius: 999,
                    background: "currentColor",
                    animation: "logoUploadProgress 1.2s ease-in-out infinite",
                  }}
                />
              </div>
            )}

            <style>
              {`
                @keyframes logoUploadProgress {
                  0% { transform: translateX(-100%); }
                  50% { transform: translateX(30%); }
                  100% { transform: translateX(160%); }
                }
              `}
            </style>
          </div>

          <p
            className="form-help"
            style={{
              marginBottom: 18,
            }}
          >
            نشانی فروشگاه شما:{" "}
            <code>/sellers/{seller.slug}</code>
            {" "}
            (فقط پس از انتشار اولین محصول و فعال بودن اشتراک، عمومی می‌شود)
          </p>

          <div className="form-group">
            <label>نام فروشگاه</label>
            <input
              value={seller.storeName}
              onChange={(e) =>
                setSeller({
                  ...seller,
                  storeName: e.target.value,
                })
              }
              required
              maxLength={120}
            />
          </div>

          <div className="form-group">
            <label>توضیحات فروشگاه</label>

            <textarea
              rows={5}
              value={seller.description ?? ""}
              onChange={(e) =>
                setSeller({
                  ...seller,
                  description: e.target.value,
                })
              }
              maxLength={2000}
              placeholder="توضیح کوتاهی درباره فروشگاه و محصولات شما..."
            />
          </div>

          <div className="form-group">
            <label>آدرس لوگو (URL)</label>

            <input
              value={seller.logoUrl ?? ""}
              onChange={(e) => {
                const value = e.target.value;

                setSeller({
                  ...seller,
                  logoUrl: value,
                });

                if (!uploadingLogo) {
                  revokePreview(logoPreview);
                  setLogoPreview(value || null);
                }
              }}
              placeholder="https://example.com/logo.webp"
            />

            <div className="form-help">
              می‌توانید لوگو را با دکمه بالا آپلود کنید یا در صورت نیاز
              آدرس مستقیم تصویر را وارد کنید.
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>ایمیل تماس</label>

              <input
                type="email"
                value={seller.contactEmail ?? ""}
                onChange={(e) =>
                  setSeller({
                    ...seller,
                    contactEmail: e.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>تلفن تماس</label>

              <input
                value={seller.contactPhone ?? ""}
                onChange={(e) =>
                  setSeller({
                    ...seller,
                    contactPhone: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="form-group">
            <label>دسته‌بندی فروشگاه</label>
            <select
              value={seller.sellerCategoryId ?? seller.sellerCategory?.id ?? ""}
              onChange={(e) =>
                setSeller({
                  ...seller,
                  sellerCategoryId: e.target.value || null,
                  sellerCategory: categories.find((item) => item.id === e.target.value) ?? null,
                })
              }
            >
              <option value="">بدون دسته‌بندی</option>
              {categories
                .filter((category) => category.isActive !== false)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
            <div className="form-help">
              دسته‌بندی فروشگاه توسط مدیریت پلتفرم تعریف می‌شود.
            </div>
          </div>

          <div className="form-group">
            <label>آدرس فروشگاه</label>

            <input
              value={seller.address ?? ""}
              placeholder="مثلاً: تهران، خیابان ..."
              onChange={(e) =>
                setSeller({
                  ...seller,
                  address: e.target.value,
                })
              }
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
              marginTop: 8,
            }}
          >
            <button
              className="btn btn-primary"
              disabled={saving || uploadingLogo}
              type="submit"
            >
              {saving
                ? "در حال ذخیره..."
                : "ذخیره تغییرات"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
