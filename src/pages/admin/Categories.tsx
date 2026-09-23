import React, { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { PageHeader } from "../../components/Layout";
import { EmptyState, Spinner } from "../../components/ui";
import { useToast } from "../../lib/toast";

type Category = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  parentId?: string | null;
  parent?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    products: number;
    sellers?: number;
  };
  createdAt: string;
  updatedAt: string;
};

type CategoryResponse = {
  categories: Category[];
};

export default function AdminCategories() {
  const { push } = useToast();

  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const result = await api.get<CategoryResponse>(
        "/api/categories?includeInactive=true",
      );

      setItems(result.categories ?? []);
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "خطا در دریافت دسته‌بندی‌ها.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        item.slug.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        !status ||
        (status === "active" && item.isActive) ||
        (status === "inactive" && !item.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [items, search, status]);

  const parentOptions = useMemo(() => {
    return items
      .filter((item) => item.isActive)
      .sort((a, b) => a.name.localeCompare(b.name, "fa"));
  }, [items]);

  function resetCreateForm() {
    setName("");
    setParentId("");
    setIsActive(true);
  }

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      push("نام دسته‌بندی فروشگاه باید حداقل ۲ کاراکتر باشد.", "error");
      return;
    }

    setSaving(true);

    try {
      await api.post("/api/categories", {
        name: trimmedName,
        parentId: parentId || null,
        isActive,
      });

      push("دسته‌بندی با موفقیت ایجاد شد.", "success");

      resetCreateForm();
      await load();
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "خطا در ایجاد دسته‌بندی.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditParentId(category.parentId ?? "");
    setEditIsActive(category.isActive);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditParentId("");
    setEditIsActive(true);
  }

  async function saveEdit(category: Category) {
    const trimmedName = editName.trim();

    if (trimmedName.length < 2) {
      push("نام دسته‌بندی فروشگاه باید حداقل ۲ کاراکتر باشد.", "error");
      return;
    }

    setSaving(true);

    try {
      await api.put(`/api/categories/${category.id}`, {
        name: trimmedName,
        parentId: editParentId || null,
        isActive: editIsActive,
      });

      push("دسته‌بندی ویرایش شد.", "success");

      cancelEdit();
      await load();
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "خطا در ویرایش دسته‌بندی.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(category: Category) {
    const action = category.isActive ? "غیرفعال" : "فعال";

    if (
      !confirm(
        `دسته‌بندی «${category.name}» ${action} شود؟`,
      )
    ) {
      return;
    }

    try {
      await api.patch(`/api/categories/${category.id}/status`, {
        isActive: !category.isActive,
      });

      push(
        category.isActive
          ? "دسته‌بندی غیرفعال شد."
          : "دسته‌بندی فعال شد.",
        "success",
      );

      await load();
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "خطا در تغییر وضعیت دسته‌بندی.",
        "error",
      );
    }
  }

  async function deleteCategory(category: Category) {
    const productCount = category._count?.products ?? 0;

    if (productCount > 0) {
      push(
        `این دسته‌بندی هنوز مورد استفاده است و قابل حذف نیست.`,
        "error",
      );
      return;
    }

    if (
      !confirm(
        `دسته‌بندی «${category.name}» برای همیشه حذف شود؟`,
      )
    ) {
      return;
    }

    try {
      await api.delete(`/api/categories/${category.id}`);

      push("دسته‌بندی حذف شد.", "success");

      await load();
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "خطا در حذف دسته‌بندی.",
        "error",
      );
    }
  }

  return (
    <>
      <PageHeader title="دسته‌بندی فروشگاه‌ها" />

      <div className="content">
        <div className="section-head">
          <div>
            <h2>مدیریت دسته‌بندی فروشگاه‌ها</h2>
            <div
              style={{
                marginTop: 4,
                color: "var(--color-muted)",
                fontSize: 14,
              }}
            >
              {items.length} دسته‌بندی
            </div>
          </div>

          <button
            className="btn btn-outline"
            onClick={load}
            disabled={loading}
          >
            بروزرسانی
          </button>
        </div>

        {/* Create category */}
        <div
          className="card"
          style={{
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h3 style={{ marginTop: 0 }}>افزودن دسته‌بندی جدید</h3>

          <form
            onSubmit={createCategory}
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(180px, 1.5fr) minmax(180px, 1fr) auto auto auto",
              gap: 10,
              alignItems: "end",
            }}
          >
            <label style={{ display: "grid", gap: 6 }}>
              <span>نام دسته‌بندی فروشگاه</span>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً مبلمان"
                disabled={saving}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>دسته‌بندی والد فروشگاه</span>

              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                disabled={saving}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                }}
              >
                <option value="">بدون والد</option>

                {parentOptions.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                minHeight: 40,
                whiteSpace: "nowrap",
              }}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={saving}
              />

              فعال
            </label>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? "در حال ذخیره..." : "افزودن"}
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={resetCreateForm}
              disabled={saving}
            >
              پاک کردن
            </button>
          </form>
        </div>

        {/* Filters */}
        <div
          className="section-head"
          style={{
            marginBottom: 12,
          }}
        >
          <h2>
            لیست دسته‌بندی‌ها ({filteredItems.length})
          </h2>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <input
              placeholder="جستجوی دسته‌بندی..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
              }}
            />

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
              }}
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
            </select>

            {(search || status) && (
              <button
                className="btn btn-outline"
                onClick={() => {
                  setSearch("");
                  setStatus("");
                }}
              >
                پاک کردن فیلتر
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <Spinner />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon="📂"
            text="دسته‌بندی‌ای یافت نشد."
          />
        ) : (
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>دسته‌بندی</th>
                  <th>Slug</th>
                  <th>والد</th>
                  <th>فروشگاه‌ها</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.map((category) => {
                  const isEditing =
                    editingId === category.id;

                  return (
                    <tr key={category.id}>
                      <td>
                        {isEditing ? (
                          <input
                            value={editName}
                            onChange={(e) =>
                              setEditName(e.target.value)
                            }
                            disabled={saving}
                            style={{
                              width: "100%",
                              minWidth: 140,
                              padding: "8px 10px",
                              borderRadius: 8,
                              border:
                                "1px solid var(--color-border)",
                            }}
                          />
                        ) : (
                          <strong>{category.name}</strong>
                        )}
                      </td>

                      <td>
                        <span
                          style={{
                            color:
                              "var(--color-muted)",
                            fontSize: 13,
                          }}
                        >
                          {category.slug}
                        </span>
                      </td>

                      <td>
                        {isEditing ? (
                          <select
                            value={editParentId}
                            onChange={(e) =>
                              setEditParentId(
                                e.target.value,
                              )
                            }
                            disabled={saving}
                            style={{
                              padding: "8px 10px",
                              borderRadius: 8,
                              border:
                                "1px solid var(--color-border)",
                              maxWidth: 180,
                            }}
                          >
                            <option value="">
                              بدون والد
                            </option>

                            {parentOptions
                              .filter(
                                (parent) =>
                                  parent.id !==
                                  category.id,
                              )
                              .map((parent) => (
                                <option
                                  key={parent.id}
                                  value={parent.id}
                                >
                                  {parent.name}
                                </option>
                              ))}
                          </select>
                        ) : (
                          category.parent?.name ?? "—"
                        )}
                      </td>

                      <td>
                        {category._count?.sellers ?? 0}
                      </td>

                      <td>
                        {isEditing ? (
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={editIsActive}
                              onChange={(e) =>
                                setEditIsActive(
                                  e.target.checked,
                                )
                              }
                              disabled={saving}
                            />

                            {editIsActive
                              ? "فعال"
                              : "غیرفعال"}
                          </label>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: 13,
                              fontWeight: 600,
                              color: category.isActive
                                ? "#15803d"
                                : "#b91c1c",
                            }}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background:
                                  category.isActive
                                    ? "#22c55e"
                                    : "#ef4444",
                              }}
                            />

                            {category.isActive
                              ? "فعال"
                              : "غیرفعال"}
                          </span>
                        )}
                      </td>

                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          {isEditing ? (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() =>
                                  saveEdit(category)
                                }
                                disabled={saving}
                              >
                                ذخیره
                              </button>

                              <button
                                className="btn btn-outline btn-sm"
                                onClick={cancelEdit}
                                disabled={saving}
                              >
                                انصراف
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() =>
                                  startEdit(category)
                                }
                              >
                                ویرایش
                              </button>

                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() =>
                                  toggleStatus(category)
                                }
                              >
                                {category.isActive
                                  ? "غیرفعال"
                                  : "فعال"}
                              </button>

                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() =>
                                  deleteCategory(category)
                                }
                              >
                                حذف
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 10,
            background: "var(--color-surface, #f8fafc)",
            color: "var(--color-muted)",
            fontSize: 13,
            lineHeight: 1.8,
          }}
        >
          <strong>نکته:</strong> دسته‌بندی‌ای که فروشگاه دارد
          حذف نمی‌شود. غیرفعال کردن دسته‌بندی باعث حذف فروشگاه‌ها نمی‌شود.
        </div>
      </div>
    </>
  );
}
