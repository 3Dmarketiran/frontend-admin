import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  api,
  ApiError,
  API_URL,
  getStoredSessionId,
} from "../../lib/api";
import { PageHeader } from "../../components/Layout";
import { Spinner } from "../../components/ui";
import { useToast } from "../../lib/toast";
import type {
  Category,
  DimensionUnit,
  Product,
} from "../../types";

const STEPS = [
  "اطلاعات پایه",
  "تصاویر",
  "مدل سه‌بعدی",
  "واقعیت افزوده",
  "ابعاد",
  "وضعیت نمایش",
  "پیش‌نمایش",
  "ذخیره / انتشار",
];

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_MODEL_BYTES = 100 * 1024 * 1024;
const MAX_ZIP_BYTES = 150 * 1024 * 1024;

export default function ProductWizard() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();

  const [step, setStep] = useState(0);
  const [productId, setProductId] =
    useState<string | null>(routeId ?? null);

  const [product, setProduct] =
    useState<Product | null>(null);

  useEffect(() => {
    if (!routeId) return;

    let cancelled = false;

    setLoading(true);

    api
      .get<{ product: Product }>(
        `/api/products/${routeId}`
      )
      .then((r) => {
        if (cancelled) return;

        hydrate(r.product);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;

        push(
          err instanceof ApiError
            ? err.message
            : "دریافت محصول ناموفق بود.",
          "error"
        );

        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [routeId, push]);

  function hydrate(p: Product) {
    setProduct(p);
    setProductId(p.id);

    setName(p.name);

    setShortDescription(
      p.shortDescription ?? ""
    );

    setFullDescription(
      p.fullDescription ?? ""
    );

    setTags(p.tags ?? "");

    setUnit(
      p.inputUnit ?? "CM"
    );

    setWidth(
      p.widthMm == null
        ? ""
        : String(
            convertFromMm(
              p.widthMm,
              p.inputUnit ?? "CM"
            )
          )
    );

    setHeight(
      p.heightMm == null
        ? ""
        : String(
            convertFromMm(
              p.heightMm,
              p.inputUnit ?? "CM"
            )
          )
    );

    setDepth(
      p.depthMm == null
        ? ""
        : String(
            convertFromMm(
              p.depthMm,
              p.inputUnit ?? "CM"
            )
          )
    );

    setPublishNow(
      p.visibility !== "PUBLISHED" ||
        p.hasUnpublishedChanges
    );
  }

  function convertFromMm(
    mm: number,
    u: DimensionUnit
  ): number {
    if (u === "MM") {
      return mm;
    }

    if (u === "CM") {
      return (
        Math.round(
          (mm / 10) * 100
        ) / 100
      );
    }

    return (
      Math.round(
        (mm / 1000) * 1000
      ) / 1000
    );
  }

  async function refetchProduct() {
    if (!productId) return;

    const r =
      await api.get<{ product: Product }>(
        `/api/products/${productId}`
      );

    setProduct(r.product);
  }

  async function saveBasicInfo() {
    if (!name.trim()) {
      push(
        "نام محصول الزامی است.",
        "error"
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: name.trim(),

        shortDescription:
          shortDescription.trim() ||
          undefined,

        fullDescription:
          fullDescription.trim() ||
          undefined,

        tags:
          tags.trim() || undefined,
      };

      const r = productId
        ? await api.put<{
            product: Product;
          }>(
            `/api/products/${productId}`,
            payload
          )
        : await api.post<{
            product: Product;
          }>(
            "/api/products",
            payload
          );

      setProductId(r.product.id);
      setProduct(r.product);

      setStep(1);
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "خطا در ذخیره اطلاعات پایه.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveDimensions() {
    if (!productId) return;

    const values = [
      width,
      height,
      depth,
    ].map((value) =>
      value === ""
        ? undefined
        : Number(value)
    );

    if (
      values.some(
        (value) =>
          value !== undefined &&
          (!Number.isFinite(value) ||
            value < 0)
      )
    ) {
      push(
        "ابعاد باید عدد معتبر و صفر یا بزرگ‌تر باشند.",
        "error"
      );
      return;
    }

    setSaving(true);

    try {
      const [w, h, d] = values;

      await api.put(
        `/api/products/${productId}`,
        {
          width: w,
          height: h,
          depth: d,
          unit,
        }
      );

      await refetchProduct();

      setStep(5);
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "خطا در ذخیره ابعاد.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  async function finalize() {
    if (!productId) return;

    setSaving(true);

    try {
      if (publishNow) {
        await api.post(
          `/api/products/${productId}/publish`
        );

        push(
          "درخواست انتشار ثبت شد و محصول وارد صف انتشار شد.",
          "success"
        );
      } else {
        push(
          "محصول ذخیره شد. برای نمایش عمومی باید آن را منتشر کنید.",
          "success"
        );
      }

      navigate(
        "/seller/products"
      );
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "خطا در نهایی‌سازی محصول.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  const isPublished =
    product?.visibility ===
    "PUBLISHED";

  const needsRepublish =
    Boolean(
      isPublished &&
        product?.hasUnpublishedChanges
    );

  if (loading) {
    return (
      <>
        <PageHeader
          title="ویزارد ساخت محصول"
        />

        <div className="content">
          <Spinner />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={
          routeId
            ? `ویرایش محصول — ${
                name || "..."
              }`
            : "افزودن محصول جدید"
        }
      />

      <div className="content">
        <div className="wizard-steps">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`wizard-step ${
                i === step
                  ? "active"
                  : i < step
                    ? "done"
                    : ""
              }`}
            >
              {i + 1}. {s}
            </div>
          ))}
        </div>

        <div
          className="card"
          style={{ maxWidth: 720 }}
        >
          {step === 0 && (
            <div>
              <div className="form-group">
                <label>
                  نام محصول *
                </label>

                <input
                  required
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="form-group">
                <label>
                  توضیح کوتاه
                </label>

                <input
                  maxLength={300}
                  value={
                    shortDescription
                  }
                  onChange={(e) =>
                    setShortDescription(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="form-group">
                <label>
                  توضیح کامل
                </label>

                <textarea
                  rows={5}
                  value={
                    fullDescription
                  }
                  onChange={(e) =>
                    setFullDescription(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    برچسب‌ها (با کاما جدا کنید)
                  </label>

                  <input
                    value={tags}
                    onChange={(e) =>
                      setTags(
                        e.target.value
                      )
                    }
                    placeholder="مبلمان, چوبی, مدرن"
                  />
                </div>
              </div>

              <button
                className="btn btn-primary"
                disabled={
                  !name.trim() ||
                  saving
                }
                onClick={
                  saveBasicInfo
                }
              >
                {saving
                  ? "در حال ذخیره..."
                  : "بعدی"}
              </button>
            </div>
          )}

          {step === 1 &&
            productId && (
              <ImagesStep
                productId={productId}
                product={product}
                onRefetch={
                  refetchProduct
                }
                onNext={() =>
                  setStep(2)
                }
                onBack={() =>
                  setStep(0)
                }
              />
            )}

          {step === 2 &&
            productId && (
              <ModelStep
                productId={productId}
                product={product}
                kind="3D"
                onRefetch={
                  refetchProduct
                }
                onNext={() =>
                  setStep(3)
                }
                onBack={() =>
                  setStep(1)
                }
              />
            )}

          {step === 3 &&
            productId && (
              <ModelStep
                productId={productId}
                product={product}
                kind="AR"
                onRefetch={
                  refetchProduct
                }
                onNext={() =>
                  setStep(4)
                }
                onBack={() =>
                  setStep(2)
                }
              />
            )}

          {step === 4 && (
            <div>
              <p
                className="form-help"
                style={{
                  marginBottom: 12,
                }}
              >
                ابعاد واقعی محصول را وارد کنید.
                این مقادیر برای مقیاس نمایش سه‌بعدی
                و واقعیت افزوده استفاده می‌شوند.
              </p>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    عرض
                  </label>

                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={width}
                    onChange={(e) =>
                      setWidth(
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label>
                    ارتفاع
                  </label>

                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={height}
                    onChange={(e) =>
                      setHeight(
                        e.target.value
                      )
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    عمق
                  </label>

                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={depth}
                    onChange={(e) =>
                      setDepth(
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label>
                    واحد
                  </label>

                  <select
                    value={unit}
                    onChange={(e) =>
                      setUnit(
                        e.target
                          .value as DimensionUnit
                      )
                    }
                  >
                    <option value="MM">
                      میلی‌متر
                    </option>

                    <option value="CM">
                      سانتی‌متر
                    </option>

                    <option value="M">
                      متر
                    </option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                }}
              >
                <button
                  className="btn btn-outline"
                  disabled={saving}
                  onClick={() =>
                    setStep(3)
                  }
                >
                  قبلی
                </button>

                <button
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={
                    saveDimensions
                  }
                >
                  {saving
                    ? "در حال ذخیره..."
                    : "بعدی"}
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <p
                className="form-help"
                style={{
                  marginBottom: 12,
                }}
              >
                محصول فقط از مسیر انتشار وارد
                سایت عمومی می‌شود. ویرایش یک محصول
                منتشرشده، در صورت تغییر محتوا،
                نیازمند انتشار مجدد است.
              </p>

              {isPublished &&
                !needsRepublish && (
                  <StatusBox
                    title="محصول منتشر است"
                    text="نسخه فعلی محصول در سایت عمومی منتشر شده و تغییر منتشرنشده‌ای ندارد."
                    tone="success"
                  />
                )}

              {needsRepublish && (
                <StatusBox
                  title="تغییرات منتشرنشده دارید"
                  text="اطلاعات محصول تغییر کرده است. برای اعمال تغییرات روی سایت عمومی، گزینه انتشار مجدد را فعال کنید."
                  tone="warning"
                />
              )}

              {!isPublished && (
                <StatusBox
                  title="محصول هنوز منتشر نشده"
                  text="در حال حاضر محصول به‌صورت پیش‌نویس است و در سایت عمومی نمایش داده نمی‌شود."
                  tone="info"
                />
              )}

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  margin: "14px 0",
                }}
              >
                <input
                  type="checkbox"
                  checked={publishNow}
                  onChange={(e) =>
                    setPublishNow(
                      e.target.checked
                    )
                  }
                />

                {needsRepublish
                  ? "انتشار مجدد تغییرات"
                  : "انتشار محصول پس از ذخیره نهایی"}
              </label>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                }}
              >
                <button
                  className="btn btn-outline"
                  disabled={saving}
                  onClick={() =>
                    setStep(4)
                  }
                >
                  قبلی
                </button>

                <button
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={() =>
                    setStep(6)
                  }
                >
                  بعدی
                </button>
              </div>
            </div>
          )}

          {step === 6 &&
            product && (
              <div>
                <p
                  className="form-help"
                  style={{
                    marginBottom: 12,
                  }}
                >
                  پیش‌نمایش اطلاعاتی و سه‌بعدی محصول
                  قبل از ذخیره نهایی.
                </p>

                <PreviewCard
                  product={product}
                  name={name}
                  shortDescription={
                    shortDescription
                  }
                />

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 14,
                  }}
                >
                  <button
                    className="btn btn-outline"
                    disabled={saving}
                    onClick={() =>
                      setStep(5)
                    }
                  >
                    قبلی
                  </button>

                  <button
                    className="btn btn-primary"
                    disabled={saving}
                    onClick={() =>
                      setStep(7)
                    }
                  >
                    بعدی
                  </button>
                </div>
              </div>
            )}

          {step === 7 && (
            <div>
              <p
                className="form-help"
                style={{
                  marginBottom: 14,
                }}
              >
                {publishNow
                  ? "با ثبت نهایی، درخواست انتشار به صف انتشار ارسال می‌شود. پس از پردازش، نسخه عمومی به‌روزرسانی خواهد شد."
                  : "محصول ذخیره می‌شود و در وضعیت پیش‌نویس/تغییرات منتشرنشده باقی می‌ماند."}
              </p>

              {publishNow && (
                <StatusBox
                  title="انتشار از طریق صف انجام می‌شود"
                  text="بلافاصله بعد از کلیک، سرور درخواست انتشار را ثبت می‌کند؛ پردازش و به‌روزرسانی سایت عمومی در مرحله بعد انجام می‌شود."
                  tone="info"
                />
              )}

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                <button
                  className="btn btn-outline"
                  disabled={saving}
                  onClick={() =>
                    setStep(6)
                  }
                >
                  قبلی
                </button>

                <button
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={finalize}
                >
                  {saving
                    ? "در حال ثبت..."
                    : publishNow
                      ? "ذخیره و ارسال برای انتشار"
                      : "ذخیره به‌صورت پیش‌نویس"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StatusBox({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone:
    | "success"
    | "warning"
    | "info";
}) {
  const colors = {
    success: {
      bg: "#ecfdf5",
      border: "#a7f3d0",
      text: "#065f46",
    },
    warning: {
      bg: "#fffbeb",
      border: "#fde68a",
      text: "#92400e",
    },
    info: {
      bg: "#eff6ff",
      border: "#bfdbfe",
      text: "#1e40af",
    },
  }[tone];

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
      }}
    >
      <strong
        style={{
          display: "block",
          marginBottom: 4,
        }}
      >
        {title}
      </strong>

      <span
        style={{
          fontSize: 13,
          lineHeight: 1.7,
        }}
      >
        {text}
      </span>
    </div>
  );
}

function ImagesStep({
  productId,
  product,
  onRefetch,
  onNext,
  onBack,
}: {
  productId: string;
  product: Product | null;
  onRefetch: () => Promise<void>;
  onNext: () => void;
  onBack: () => void;
}) {
  const { push } = useToast();

  const [uploading, setUploading] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [currentFile, setCurrentFile] =
    useState("");

  const [dragging, setDragging] =
    useState(false);

  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  async function uploadFile(
    file: File
  ) {
    if (
      !IMAGE_TYPES.includes(
        file.type
      )
    ) {
      throw new Error(
        `فرمت تصویر ${file.name} مجاز نیست.`
      );
    }

    if (
      file.size >
      MAX_IMAGE_BYTES
    ) {
      throw new Error(
        `حجم تصویر ${file.name} بیشتر از 10MB است.`
      );
    }

    setCurrentFile(file.name);
    setProgress(0);

    const fd = new FormData();

    fd.append(
      "image",
      file
    );

    await uploadWithProgress(
      `/api/products/${productId}/images`,
      fd,
      setProgress
    );
  }

  async function onFiles(
    files: FileList | File[]
  ) {
    const selected =
      Array.from(files);

    if (
      !selected.length ||
      uploading
    ) {
      return;
    }

    setUploading(true);

    let uploaded = 0;

    try {
      for (
        const file of selected
      ) {
        try {
          await uploadFile(file);
          uploaded += 1;
        } catch (err) {
          push(
            err instanceof ApiError ||
              err instanceof Error
              ? err.message
              : "آپلود تصویر ناموفق بود.",
            "error"
          );
        }
      }

      await onRefetch();

      if (uploaded) {
        push(
          `${uploaded} تصویر با موفقیت آپلود شد.`,
          "success"
        );
      }
    } finally {
      setUploading(false);
      setProgress(0);
      setCurrentFile("");
    }
  }

  async function setPrimary(
    imageId: string
  ) {
    if (uploading) return;

    try {
      await api.post(
        `/api/products/${productId}/images/${imageId}/primary`
      );

      await onRefetch();

      push(
        "تصویر اصلی تغییر کرد.",
        "success"
      );
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "تغییر تصویر اصلی ناموفق بود.",
        "error"
      );
    }
  }

  async function remove(
    imageId: string
  ) {
    if (uploading) return;

    try {
      await api.delete(
        `/api/products/${productId}/images/${imageId}`
      );

      await onRefetch();

      push(
        "تصویر حذف شد.",
        "success"
      );
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "حذف تصویر ناموفق بود.",
        "error"
      );
    }
  }

  const images =
    product?.images ?? [];

  return (
    <div>
      <p
        className="form-help"
        style={{
          marginBottom: 10,
        }}
      >
        تصاویر JPG، PNG یا WebP. حداکثر حجم هر
        تصویر 10MB. تصاویر در سرور بهینه‌سازی
        می‌شوند.
      </p>

      <label
        className={`dropzone ${
          dragging ? "dragging" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();

          if (!uploading) {
            setDragging(true);
          }
        }}
        onDragLeave={() =>
          setDragging(false)
        }
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);

          if (!uploading) {
            void onFiles(
              e.dataTransfer.files
            );
          }
        }}
      >
        {uploading
          ? `در حال آپلود ${currentFile}`
          : "برای انتخاب یک یا چند تصویر کلیک کنید یا تصاویر را اینجا رها کنید"}

        <small
          style={{
            display: "block",
            marginTop: 6,
            opacity: 0.7,
          }}
        >
          JPG / PNG / WebP — حداکثر 10MB برای هر فایل
        </small>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files) {
              void onFiles(
                e.target.files
              );
            }

            e.currentTarget.value = "";
          }}
        />
      </label>

      {uploading && (
        <UploadProgress
          progress={progress}
          filename={currentFile}
        />
      )}

      {images.length > 0 && (
        <div className="image-grid">
          {images.map(
            (img) => (
              <div
                key={img.id}
                className={`image-tile ${
                  img.isPrimary
                    ? "primary"
                    : ""
                }`}
              >
                <img
                  src={img.url}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.opacity =
                      "0.35";
                  }}
                />

                <div className="tile-actions">
                  {!img.isPrimary && (
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={uploading}
                      onClick={() =>
                        void setPrimary(
                          img.id
                        )
                      }
                    >
                      اصلی
                    </button>
                  )}

                  <button
                    className="btn btn-sm btn-danger"
                    disabled={uploading}
                    onClick={() =>
                      void remove(
                        img.id
                      )
                    }
                  >
                    حذف
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 16,
        }}
      >
        <button
          className="btn btn-outline"
          disabled={uploading}
          onClick={onBack}
        >
          قبلی
        </button>

        <button
          className="btn btn-primary"
          disabled={uploading}
          onClick={onNext}
        >
          بعدی
        </button>
      </div>
    </div>
  );
}

function ModelStep({
  productId,
  product,
  kind,
  onRefetch,
  onNext,
  onBack,
}: {
  productId: string;
  product: Product | null;
  kind: "3D" | "AR";
  onRefetch: () => Promise<void>;
  onNext: () => void;
  onBack: () => void;
}) {
  const { push } = useToast();

  const [uploading, setUploading] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [currentFile, setCurrentFile] =
    useState("");

  const [dragging, setDragging] =
    useState(false);

  const accept =
    kind === "3D"
      ? ".glb,.gltf,.zip"
      : ".usdz,.zip";

  const models =
    (product?.models ?? []).filter(
      (m) =>
        kind === "3D"
          ? m.kind !== "USDZ"
          : m.kind === "USDZ"
    );

  async function uploadModelFile(
    file: File
  ) {
    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase();

    const isZip =
      extension === "zip";

    if (
      isZip &&
      file.size >
        MAX_ZIP_BYTES
    ) {
      throw new Error(
        "حجم ZIP بیشتر از 150MB است."
      );
    }

    if (
      !isZip &&
      file.size >
        MAX_MODEL_BYTES
    ) {
      throw new Error(
        "حجم فایل مدل بیشتر از 100MB است."
      );
    }

    const fd =
      new FormData();

    fd.append(
      isZip
        ? "modelZip"
        : "model",
      file
    );

    setCurrentFile(file.name);
    setProgress(0);

    const endpoint =
      isZip
        ? `/api/products/${productId}/models/zip`
        : `/api/products/${productId}/models`;

    await uploadWithProgress(
      endpoint,
      fd,
      setProgress
    );
  }

  async function onFile(
    files: FileList | File[]
  ) {
    const file =
      Array.from(files)[0];

    if (
      !file ||
      uploading
    ) {
      return;
    }

    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase();

    const allowed =
      kind === "3D"
        ? [
            "glb",
            "gltf",
            "zip",
          ]
        : [
            "usdz",
            "zip",
          ];

    if (
      !extension ||
      !allowed.includes(
        extension
      )
    ) {
      push(
        "فرمت فایل برای این مرحله مجاز نیست.",
        "error"
      );
      return;
    }

    setUploading(true);

    try {
      await uploadModelFile(
        file
      );

      await onRefetch();

      push(
        extension === "zip"
          ? "فایل ZIP با موفقیت پردازش شد."
          : "فایل مدل با موفقیت آپلود شد.",
        "success"
      );
    } catch (err) {
      push(
        err instanceof ApiError ||
          err instanceof Error
          ? err.message
          : "خطا در آپلود فایل مدل.",
        "error"
      );
    } finally {
      setUploading(false);
      setProgress(0);
      setCurrentFile("");
    }
  }

  async function remove(
    modelId: string
  ) {
    if (uploading) return;

    try {
      await api.delete(
        `/api/products/${productId}/models/${modelId}`
      );

      await onRefetch();

      push(
        "مدل حذف شد.",
        "success"
      );
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "حذف مدل ناموفق بود.",
        "error"
      );
    }
  }

  return (
    <div>
      <p
        className="form-help"
        style={{
          marginBottom: 10,
        }}
      >
        {kind === "3D"
          ? "فایل GLB، GLTF یا ZIP شامل مدل‌های سه‌بعدی را آپلود کنید."
          : "فایل USDZ یا ZIP شامل فایل‌های USDZ را برای واقعیت افزوده iOS آپلود کنید."}
      </p>

      <label
        className={`dropzone ${
          dragging ? "dragging" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();

          if (!uploading) {
            setDragging(true);
          }
        }}
        onDragLeave={() =>
          setDragging(false)
        }
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);

          if (!uploading) {
            void onFile(
              e.dataTransfer.files
            );
          }
        }}
      >
        {uploading
          ? `در حال آپلود ${currentFile}`
          : `برای انتخاب فایل ${
              kind === "3D"
                ? "GLB / GLTF / ZIP"
                : "USDZ / ZIP"
            } کلیک کنید یا فایل را اینجا رها کنید`}

        <small
          style={{
            display: "block",
            marginTop: 6,
            opacity: 0.7,
          }}
        >
          مدل حداکثر 100MB — ZIP حداکثر 150MB
        </small>

        <input
          type="file"
          accept={accept}
          hidden
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files) {
              void onFile(
                e.target.files
              );
            }

            e.currentTarget.value = "";
          }}
        />
      </label>

      {uploading && (
        <UploadProgress
          progress={progress}
          filename={currentFile}
        />
      )}

      {models.length > 0 && (
        <ul
          style={{
            marginTop: 14,
            paddingRight: 18,
          }}
        >
          {models.map(
            (m) => (
              <li
                key={m.id}
                style={{
                  marginBottom: 8,
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 8,
                  flexWrap:
                    "wrap",
                }}
              >
                <span className="badge badge-info">
                  {m.kind}
                </span>

                <a
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color:
                      "var(--color-primary)",
                  }}
                >
                  مشاهده فایل
                </a>

                <button
                  className="btn btn-sm btn-danger"
                  disabled={uploading}
                  onClick={() =>
                    void remove(
                      m.id
                    )
                  }
                >
                  حذف
                </button>
              </li>
            )
          )}
        </ul>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 16,
        }}
      >
        <button
          className="btn btn-outline"
          disabled={uploading}
          onClick={onBack}
        >
          قبلی
        </button>

        <button
          className="btn btn-primary"
          disabled={uploading}
          onClick={onNext}
        >
          بعدی
        </button>
      </div>
    </div>
  );
}

function UploadProgress({
  progress,
  filename,
}: {
  progress: number;
  filename: string;
}) {
  const value =
    Math.min(
      100,
      Math.max(
        0,
        progress
      )
    );

  return (
    <div
      style={{
        marginTop: 14,
        padding: 12,
        borderRadius: 12,
        background:
          "var(--color-surface, #f8fafc)",
        border:
          "1px solid var(--color-border, #e2e8f0)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: 12,
          marginBottom: 8,
          fontSize: 13,
        }}
      >
        <span
          style={{
            overflow:
              "hidden",
            textOverflow:
              "ellipsis",
            whiteSpace:
              "nowrap",
          }}
        >
          {filename}
        </span>

        <strong>
          {Math.round(
            value
          )}
          %
        </strong>
      </div>

      <div
        style={{
          height: 8,
          borderRadius: 999,
          background:
            "var(--color-border, #e2e8f0)",
          overflow:
            "hidden",
        }}
      >
        <div
          style={{
            width: `${value}%`,
            height: "100%",
            borderRadius: 999,
            background:
              "var(--color-primary, #2563eb)",
            transition:
              "width 120ms linear",
          }}
        />
      </div>
    </div>
  );
}

function uploadWithProgress<T = unknown>(
  path: string,
  formData: FormData,
  onProgress: (
    progress: number
  ) => void
): Promise<T> {
  return new Promise(
    (resolve, reject) => {
      const xhr =
        new XMLHttpRequest();

      xhr.open(
        "POST",
        `${API_URL}${path}`
      );

      xhr.withCredentials =
        true;

      const sessionId =
        getStoredSessionId();

      if (sessionId) {
        xhr.setRequestHeader(
          "Authorization",
          `Bearer ${sessionId}`
        );
      }

      xhr.upload.onprogress =
        (event) => {
          if (
            event.lengthComputable
          ) {
            onProgress(
              (event.loaded /
                event.total) *
                100
            );
          }
        };

      xhr.onload = () => {
        const contentType =
          xhr.getResponseHeader(
            "content-type"
          ) || "";

        let data: unknown =
          null;

        if (
          contentType.includes(
            "application/json"
          )
        ) {
          try {
            data =
              JSON.parse(
                xhr.responseText
              );
          } catch {
            data = null;
          }
        }

        if (
          xhr.status >= 200 &&
          xhr.status < 300
        ) {
          onProgress(100);
          resolve(
            data as T
          );
          return;
        }

        let message:
          | string
          | undefined;

        if (
          data &&
          typeof data ===
            "object"
        ) {
          const value =
            data as Record<
              string,
              unknown
            >;

          if (
            typeof value.error ===
            "string"
          ) {
            message =
              value.error;
          } else if (
            typeof value.message ===
            "string"
          ) {
            message =
              value.message;
          }
        }

        reject(
          new ApiError(
            xhr.status,
            message ||
              `خطای آپلود (${xhr.status})`
          )
        );
      };

      xhr.onerror = () => {
        reject(
          new ApiError(
            0,
            "ارتباط با سرور هنگام آپلود فایل قطع شد."
          )
        );
      };

      xhr.onabort = () => {
        reject(
          new ApiError(
            0,
            "آپلود فایل لغو شد."
          )
        );
      };

      xhr.send(
        formData
      );
    }
  );
}

function PreviewCard({
  product,
  name,
  shortDescription,
}: {
  product: Product;
  name: string;
  shortDescription: string;
}) {
  const glb =
    product.models.find(
      (m) =>
        m.kind === "GLB" ||
        m.kind === "GLTF"
    );

  const primaryImage =
    product.images.find(
      (i) => i.isPrimary
    ) ??
    product.images[0];

  return (
    <div
      style={{
        border:
          "1px solid var(--color-border)",
        borderRadius: 14,
        overflow:
          "hidden",
      }}
    >
      {glb ? (
        <model-viewer
          src={glb.url}
          alt={name}
          camera-controls
          auto-rotate
          style={{
            width: "100%",
            aspectRatio: "1/1",
            background:
              "#F8FAFC",
          }}
        />
      ) : primaryImage ? (
        <img
          src={primaryImage.url}
          alt={name}
          loading="lazy"
          style={{
            width: "100%",
            aspectRatio: "1/1",
            objectFit:
              "cover",
          }}
        />
      ) : (
        <div
          className="skeleton"
          style={{
            width: "100%",
            aspectRatio: "1/1",
          }}
        />
      )}

      <div
        style={{
          padding: 14,
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: "1.1rem",
          }}
        >
          {name ||
            product.name}
        </div>

        {shortDescription && (
          <div
            style={{
              color:
                "var(--color-text-muted)",
              fontSize: ".88rem",
              marginTop: 4,
            }}
          >
            {shortDescription}
          </div>
        )}
      </div>
    </div>
  );
}
