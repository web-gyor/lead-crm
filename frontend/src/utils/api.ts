const rawBase: string = (import.meta.env.VITE_API_URL as string) || "";
const API_BASE = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;

// ─── AUTH HELPERS ─────────────────────────────────────────────────────────────

export const clearAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

// ─── INTERNAL UTILITIES ───────────────────────────────────────────────────────

const formatUrl = (endpoint: string): string => {
  const clean = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE}${clean}`;
};

// 🚀 FIXED: Paths aligned with your routing specifications (/auth vs /api/auth)
const PUBLIC_ROUTES = [
  "/auth/login",
  "/api/auth/login",
  "/api/users/forgot-password",
  "/api/users/reset-password",
];

const getHeaders = (endpoint: string, isJson = false): Record<string, string> => {
  const headers: Record<string, string> = {};
  const normalised = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  
  // Checks if the route matches any entry inside our public accessibility whitelist
  const isPublic = PUBLIC_ROUTES.some((r) => normalised.includes(r));

  if (!isPublic) {
    const token = localStorage.getItem("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  if (isJson) headers["Content-Type"] = "application/json";

  return headers;
};

const handleResponse = async (response: Response) => {
  // 🚀 FIXED: Swapped out response.url comparison checks to handle absolute server endpoints cleanly
  const isLoginRequest = response.url.includes("/auth/login") || response.url.includes("/api/auth/login");

  // Session expired boundary handling guard
  if (response.status === 401 && !isLoginRequest) {
    clearAuth();
    return null;
  }

  // No content response handling fallback
  if (response.status === 204) return { success: true };

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  const data = isJson
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    const message =
      (isJson && (data?.message || data?.error)) ||
      `HTTP ${response.status}`;

    console.error(`[API] ${response.status} ${response.url}`, data ?? "");
    throw new Error(message);
  }

  return data;
};

// Wrap fetch so network-level failures produce a readable error
const safeFetch = async (url: string, options: RequestInit) => {
  try {
    return await fetch(url, options);
  } catch (err: any) {
    console.error(`[API] Network error → ${url}\nIs the backend running on ${API_BASE}?`, err.message);
    throw new Error(`Cannot reach server at ${API_BASE} — check that the backend is running and VITE_API_URL is correct`);
  }
};

// ─── API METHODS ──────────────────────────────────────────────────────────────

export const apiGet = async (endpoint: string) => {
  const response = await safeFetch(formatUrl(endpoint), {
    method:  "GET",
    headers: getHeaders(endpoint),
  });
  return handleResponse(response);
};

export const apiPost = async (endpoint: string, data: any) => {
  const isFormData = data instanceof FormData;
  const response = await safeFetch(formatUrl(endpoint), {
    method:  "POST",
    headers: getHeaders(endpoint, !isFormData),
    body:    isFormData ? data : JSON.stringify(data),
  });
  return handleResponse(response);
};

export const apiPut = async (endpoint: string, data: any) => {
  const isFormData = data instanceof FormData;
  const response = await safeFetch(formatUrl(endpoint), {
    method:  "PUT",
    headers: getHeaders(endpoint, !isFormData),
    body:    isFormData ? data : JSON.stringify(data),
  });
  return handleResponse(response);
};

export const apiDelete = async (endpoint: string) => {
  const response = await safeFetch(formatUrl(endpoint), {
    method:  "DELETE",
    headers: getHeaders(endpoint),
  });
  return handleResponse(response);
};