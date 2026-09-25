import { API_URL } from "./config";

const AUTH_STORAGE_KEY = "platform_session_id";

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

  let res: Response;

  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError(
        0,
        "ارتباط با سرور برقرار نشد. اتصال اینترنت یا آدرس API را بررسی کنید."
      );
    }

    throw error;
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
