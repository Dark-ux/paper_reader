const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export function apiPath(path: string) {
  return `${API_BASE_URL}${path}`;
}

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, message: string, detail: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function readBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status === 204) {
    return undefined;
  }
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

function getErrorMessage(body: unknown, fallback: string) {
  if (typeof body === "string" && body.trim()) {
    return body;
  }
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (detail && typeof detail === "object" && "message" in detail) {
      const message = (detail as { message: unknown }).message;
      if (typeof message === "string") {
        return message;
      }
    }
  }
  return fallback;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiPath(path), {
    headers: init?.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...init
  });

  const body = await readBody(response);

  if (!response.ok) {
    throw new ApiError(response.status, getErrorMessage(body, `Request failed: ${response.status}`), body);
  }

  return body as T;
}
