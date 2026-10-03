import { API_URL } from "./config";

const AUTH_STORAGE_KEY = "platform_session_id";
const API_REQUEST_TIMEOUT_MS = 15_000;
const API_UPLOAD_TIMEOUT_MS = 120_000;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getStoredSessionId(): string | null {
  try {
    return sessionStorage.getItem(AUTH_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredSessionId(sessionId: string): void {
  try {
    sessionStorage.setItem(AUTH_STORAGE_KEY, sessionId);
  } catch {
    // Ignore storage errors.
  }
}

export function clearStoredSessionId(): void {
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

function isFormDataBody(body: BodyInit | null | undefined): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

async function parseResponse(res: Response): Promise<unknown> {
  if (res.status === 204) {
    return undefined;
  }

  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return res.json().catch(() => ({}));
  }

  const text = await res.text().catch(() => "");

  if (!text) {
    return null;
  }

  return text;
}

function getErrorMessage(data: unknown, status: number): string {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    const value = data as Record<string, unknown>;

    if (typeof value.error === "string" && value.error.trim()) {
      return value.error;
    }

    if (typeof value.message === "string" && value.message.trim()) {
      return value.message;
    }

    if (
      value.error &&
      typeof value.error === "object" &&
      typeof (value.error as Record<string, unknown>).message === "string"
    ) {
      return String(
        (value.error as Record<string, unknown>).message
      );
    }
  }

  return `خطای غیرمنتظره (${status})`;
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);

  const body = init.body;

  /*
   * IMPORTANT:
   * Never manually set Content-Type for FormData.
   *
   * The browser must generate:
   * multipart/form-data; boundary=...
   *
   * Otherwise multer on the backend may not receive the uploaded file.
   */
  if (!isFormDataBody(body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const sessionId = getStoredSessionId();

  if (sessionId && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${sessionId}`);
  }

  let res: Response | null = null;
  let lastError: unknown = null;
  const maxAttempts = path === "/api/auth/login" ? 4 : 2;

  const timeoutMs = isFormDataBody(body) ? API_UPLOAD_TIMEOUT_MS : API_REQUEST_TIMEOUT_MS;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      res = await fetch(`${API_URL}${path}`, {
        ...init,
        credentials: "include",
        headers,
        signal: controller.signal,
      });
      if (![502, 503, 504].includes(res.status) || attempt === maxAttempts - 1) break;
    } catch (error) {
      lastError = error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ApiError(408, isFormDataBody(body)
          ? "ارتباط با API برای آپلود بیشتر از حد مجاز طول کشید. اتصال و آدرس API را بررسی کنید و دوباره تلاش کنید."
          : "پاسخی از API دریافت نشد. آدرس API یا وضعیت سرور را بررسی کنید و دوباره تلاش کنید.");
      }
      if (attempt === maxAttempts - 1) break;
    } finally {
      window.clearTimeout(timeoutId);
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }

  if (!res) {
    const detail = lastError instanceof Error ? lastError.message : "";
    throw new ApiError(0, detail
      ? `اتصال به API برقرار نشد. آدرس API را بررسی کنید (${API_URL}).`
      : `API پاسخ نداد. آدرس API را بررسی کنید (${API_URL}).`);
  }

  const data = await parseResponse(res);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      getErrorMessage(data, res.status)
    );
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) =>
    request<T>(path, {
      method: "GET",
    }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body:
        body instanceof FormData
          ? body
          : JSON.stringify(body ?? {}),
    }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body ?? {}),
    }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body ?? {}),
    }),

  delete: <T>(path: string) =>
    request<T>(path, {
      method: "DELETE",
    }),

  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, {
      method: "POST",
      body: formData,
    }),
};

export { API_URL };
