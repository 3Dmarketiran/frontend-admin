import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError, API_URL, getStoredSessionId } from "../../lib/api";
import { PageHeader } from "../../components/Layout";
import { Spinner } from "../../components/ui";
import { useToast } from "../../lib/toast";
import type { Category, DimensionUnit, Product } from "../../types";

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

export default function ProductWizard() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();

  const [step, setStep] = useState(0);
  const [productId, setProductId] =
    useState<string | null>(routeId ?? null);
  const [product, setProduct] =
    useState<Product | null>(null);
  const [categories, setCategories] =
    useState<Category[]>([]);
  const [loading, setLoading] =
    useState(Boolean(routeId));

  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] =
    useState("");
  const [fullDescription, setFullDescription] =
    useState("");
  const [categoryId, setCategoryId] =
    useState("");
  const [tags, setTags] = useState("");

  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [depth, setDepth] = useState("");
  const [unit, setUnit] =
    useState<DimensionUnit>("CM");

  const [publishNow, setPublishNow] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    api
      .get<{ categories: Category[] }>(
        "/api/categories"
      )
      .then((r) => setCategories(r.categories))
      .catch(() => {
        push(
          "دریافت دسته‌بندی‌ها ناموفق بود.",
          "error"
        );
      });
  }, []);

  useEffect(() => {
    if (!routeId) return;

    api
      .get<{ product: Product }>(
        `/api/products/${routeId}`
      )
      .then((r) => {
        hydrate(r.product);
        setLoading(false);
      })
      .catch((err) => {
        push(
          err instanceof ApiError
            ? err.message
            : "دریافت محصول ناموفق بود.",
          "error"
        );
        setLoading(false);
      });
  }, [routeId]);

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
    setCategoryId(p.categoryId ?? "");
    setTags(p.tags ?? "");

    if (p.widthMm) {
      setWidth(
        String(
          convertFromMm(
            p.widthMm,
            p.inputUnit ?? "CM"
          )
        )
      );
    }

    if (p.heightMm) {
      setHeight(
        String(
          convertFromMm(
            p.heightMm,
            p.inputUnit ?? "CM"
          )
        )
      );
    }

    if (p.depthMm) {
      setDepth(
        String(
          convertFromMm(
            p.depthMm,
            p.inputUnit ?? "CM"
          )
        )
      );
    }

    if (p.inputUnit) {
      setUnit(p.inputUnit);
    }
  }

  function convertFromMm(
    mm: number,
    u: DimensionUnit
  ) {
    if (u === "MM") return mm;

    if (u === "CM") {
      return (
        Math.round((mm / 10) * 100) / 100
      );
    }

    return (
      Math.round((mm / 1000) * 1000) / 1000
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
    setSaving(true);

    try {
      const payload = {
        name,
        shortDescription:
          shortDescription || undefined,
        fullDescription:
          fullDescription || undefined,
        categoryId:
          categoryId || undefined,
        tags: tags || undefined,
      };

      if (!productId) {
        const r =
          await api.post<{
            product: Product;
          }>(
            "/api/products",
            payload
          );

        setProductId(r.product.id);
        setProduct(r.product);
      } else {
        const r =
          await api.put<{
            product: Product;
          }>(
            `/api/products/${productId}`,
            payload
          );

        setProduct(r.product);
      }

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

    setSaving(true);

    try {
      await api.put(
        `/api/products/${productId}`,
        {
          width: width
            ? Number(width)
            : undefined,
          height: height
            ? Number(height)
            : undefined,
          depth: depth
            ? Number(depth)
            : undefined,
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
          "محصول ذخیره و درخواست انتشار ثبت شد.",
          "success"
        );
      } else {
        push(
          "محصول به‌صورت پیش‌نویس ذخیره شد.",
          "success"
        );
      }

      navigate("/seller/products");
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "خطا در نهایی‌سازی.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="ویزارد ساخت محصول" />
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
                <label>نام محصول *</label>
                <input
                  required
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                />
              </div>

              <div className="form-group">
                <label>توضیح کوتاه</label>
                <input
                  maxLength={300}
                  value={shortDescription}
                  onChange={(e) =>
                    setShortDescription(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="form-group">
                <label>توضیح کامل</label>
                <textarea
                  rows={5}
                  value={fullDescription}
                  onChange={(e) =>
                    setFullDescription(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>دسته‌بندی</label>

                  <select
                    value={categoryId}
                    onChange={(e) =>
                      setCategoryId(
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      بدون دسته‌بندی
                    </option>

                    {categories.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                      >
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    برچسب‌ها (با کاما جدا کنید)
                  </label>

                  <input
                    value={tags}
                    onChange={(e) =>
                      setTags(e.target.value)
                    }
                    placeholder="مبلمان, چوبی, مدرن"
                  />
                </div>
              </div>

              <button
                className="btn btn-primary"
                disabled={!name || saving}
                onClick={saveBasicInfo}
              >
                {saving
                  ? "در حال ذخیره..."
                  : "بعدی"}
              </button>
            </div>
          )}

          {step === 1 && productId && (
            <ImagesStep
              productId={productId}
              product={product}
              onRefetch={refetchProduct}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}

          {step === 2 && productId && (
            <ModelStep
              productId={productId}
              product={product}
              kind="3D"
              onRefetch={refetchProduct}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && productId && (
            <ModelStep
              productId={productId}
              product={product}
              kind="AR"
              onRefetch={refetchProduct}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && (
            <div>
              <p
                className="form-help"
                style={{ marginBottom: 12 }}
              >
                ابعاد واقعی محصول را وارد کنید —
                این مقادیر برای نمایش با مقیاس
                واقعی در واقعیت افزوده استفاده
                می‌شود.
              </p>

              <div className="form-row">
                <div className="form-group">
                  <label>عرض</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={width}
                    onChange={(e) =>
                      setWidth(e.target.value)
                    }
                  />
                </div>

                <div className="form-group">
                  <label>ارتفاع</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={height}
                    onChange={(e) =>
                      setHeight(e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>عمق</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={depth}
                    onChange={(e) =>
                      setDepth(e.target.value)
                    }
                  />
                </div>

                <div className="form-group">
                  <label>واحد</label>

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
                  onClick={() => setStep(3)}
                >
                  قبلی
                </button>

                <button
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={saveDimensions}
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
                style={{ marginBottom: 12 }}
              >
                وضعیت نمایش محصول را انتخاب کنید.
                برای اینکه محصول روی وب‌سایت عمومی
                دیده شود باید آن را منتشر کنید.
              </p>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
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

                هم‌زمان با ذخیره نهایی، محصول منتشر
                شود
              </label>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                }}
              >
                <button
                  className="btn btn-outline"
                  onClick={() => setStep(4)}
                >
                  قبلی
                </button>

                <button
                  className="btn btn-primary"
                  onClick={() => setStep(6)}
                >
                  بعدی
                </button>
              </div>
            </div>
          )}

          {step === 6 && product && (
            <div>
              <p
                className="form-help"
                style={{ marginBottom: 12 }}
              >
                پیش‌نمایش مشابه نمایش محصول در
                وب‌سایت عمومی است.
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
                  onClick={() => setStep(5)}
                >
                  قبلی
                </button>

                <button
                  className="btn btn-primary"
                  onClick={() => setStep(7)}
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
                style={{ marginBottom: 14 }}
              >
                {publishNow
                  ? "با زدن دکمه زیر، محصول ذخیره و درخواست انتشار واقعی ارسال می‌شود."
                  : "محصول به‌صورت پیش‌نویس ذخیره می‌شود."}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                }}
              >
                <button
                  className="btn btn-outline"
                  onClick={() => setStep(6)}
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
                      ? "ذخیره و انتشار"
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

// ---------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------

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

  async function uploadFile(file: File) {
    setCurrentFile(file.name);
    setProgress(0);

    const fd = new FormData();
    fd.append("image", file);

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

    if (!selected.length) return;

    setUploading(true);

    try {
      for (const file of selected) {
        if (
          ![
            "image/jpeg",
            "image/png",
            "image/webp",
          ].includes(file.type)
        ) {
          push(
            `فرمت تصویر ${file.name} مجاز نیست.`,
            "error"
          );
          continue;
        }

        await uploadFile(file);
      }

      await onRefetch();

      push(
        "تصاویر با موفقیت آپلود شدند.",
        "success"
      );
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "خطا در آپلود تصویر.",
        "error"
      );
    } finally {
      setUploading(false);
      setProgress(0);
      setCurrentFile("");
    }
  }

  async function setPrimary(
    imageId: string
  ) {
    try {
      await api.post(
        `/api/products/${productId}/images/${imageId}/primary`
      );

      await onRefetch();
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
    try {
      await api.delete(
        `/api/products/${productId}/images/${imageId}`
      );

      await onRefetch();
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
          : "تصاویر را اینجا بکشید یا کلیک کنید"}

        <small
          style={{
            display: "block",
            marginTop: 6,
            opacity: 0.7,
          }}
        >
          JPG، PNG یا WEBP — حداکثر 10MB
        </small>

        <input
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
          {images.map((img) => (
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
              />

              <div className="tile-actions">
                {!img.isPrimary && (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() =>
                      setPrimary(img.id)
                    }
                  >
                    اصلی
                  </button>
                )}

                <button
                  className="btn btn-sm btn-danger"
                  onClick={() =>
                    remove(img.id)
                  }
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
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

// ---------------------------------------------------------------------
// 3D / AR models
// ---------------------------------------------------------------------

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

    const fd = new FormData();

    if (isZip) {
      fd.append("modelZip", file);
    } else {
      fd.append("model", file);
    }

    setCurrentFile(file.name);
    setProgress(0);

    const endpoint = isZip
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

    if (!file) return;

    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase();

    const allowed =
      kind === "3D"
        ? ["glb", "gltf", "zip"]
        : ["usdz", "zip"];

    if (
      !extension ||
      !allowed.includes(extension)
    ) {
      push(
        `فرمت فایل برای این مرحله مجاز نیست.`,
        "error"
      );
      return;
    }

    setUploading(true);

    try {
      await uploadModelFile(file);
      await onRefetch();

      push(
        extension === "zip"
          ? "فایل ZIP با موفقیت پردازش شد."
          : "فایل سه‌بعدی با موفقیت آپلود شد.",
        "success"
      );
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "خطا در آپلود فایل سه‌بعدی.",
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
    try {
      await api.delete(
        `/api/products/${productId}/models/${modelId}`
      );

      await onRefetch();
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
          : `برای انتخاب فایل ${kind === "3D" ? "GLB / GLTF / ZIP" : "USDZ / ZIP"} کلیک کنید`}

        <small
          style={{
            display: "block",
            marginTop: 6,
            opacity: 0.7,
          }}
        >
          فایل مدل حداکثر 100MB و ZIP حداکثر
          150MB
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
          {models.map((m) => (
            <li
              key={m.id}
              style={{
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
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
                  remove(m.id)
                }
              >
                حذف
              </button>
            </li>
          ))}
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

// ---------------------------------------------------------------------
// Upload progress
// ---------------------------------------------------------------------

function UploadProgress({
  progress,
  filename,
}: {
  progress: number;
  filename: string;
}) {
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
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {filename}
        </span>

        <strong>
          {Math.round(progress)}%
        </strong>
      </div>

      <div
        style={{
          height: 8,
          borderRadius: 999,
          background:
            "var(--color-border, #e2e8f0)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(
              100,
              Math.max(0, progress)
            )}%`,
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

// ---------------------------------------------------------------------
// XMLHttpRequest upload with real progress
// ---------------------------------------------------------------------

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

      xhr.withCredentials = true;

      const sessionId =
        getStoredSessionId();

      if (sessionId) {
        xhr.setRequestHeader(
          "Authorization",
          `Bearer ${sessionId}`
        );
      }

      xhr.upload.onprogress = (
        event
      ) => {
        if (!event.lengthComputable) {
          return;
        }

        onProgress(
          (event.loaded /
            event.total) *
            100
        );
      };

      xhr.onload = () => {
        const contentType =
          xhr.getResponseHeader(
            "content-type"
          ) || "";

        let data: unknown = null;

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
          resolve(data as T);
          return;
        }

        const message =
          typeof data === "object" &&
          data !== null
            ? (
                data as {
                  error?: string;
                  message?: string;
                }
              ).error ||
              (
                data as {
                  error?: string;
                  message?: string;
                }
              ).message
            : undefined;

        reject(
          new ApiError(
            xhr.status,
            message ||
              `خطای غیرمنتظره (${xhr.status})`
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

      xhr.send(formData);
    }
  );
}

// ---------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------

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
    ) ?? product.images[0];

  return (
    <div
      style={{
        border:
          "1px solid var(--color-border)",
        borderRadius: 14,
        overflow: "hidden",
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
            background: "#F8FAFC",
          }}
        />
      ) : primaryImage ? (
        <img
          src={primaryImage.url}
          alt={name}
          style={{
            width: "100%",
            aspectRatio: "1/1",
            objectFit: "cover",
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

      <div style={{ padding: 14 }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: "1.1rem",
          }}
        >
          {name || product.name}
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
