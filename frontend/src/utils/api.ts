// 1. Sanitize the URL immediately to prevent "//auth/login"
const rawBase =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000"
    : "";
const API_BASE = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

// 2. Optimized formatUrl to ensure NO double slashes
const formatUrl = (endpoint: string) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${cleanEndpoint}`;
};

const handleResponse = async (response: Response) => {
  // Check for 401 Unauthorized
  if (response.status === 401 && !response.url.includes('/auth/login')) {
    clearAuth();
    return null;
  }
  
  if (response.status === 204) return { success: true };

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // Helpful for debugging Vercel 405s
    console.error(`API Error: ${response.status} at ${response.url}`);
    throw new Error(data?.message || `Error: ${response.status}`);
  }
  return data;
};

const getHeaders = (endpoint: string, isJson = false) => {
  const headers: Record<string, string> = {};
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // 3. Ensure these match your Backend routes exactly
 const publicApiEndpoints = [
  '/api/auth/login',
  '/api/users/forgot-password',
  '/api/users/reset-password'
];

  const isPublicApi = publicApiEndpoints.some(route => normalizedEndpoint.includes(route));

  if (!isPublicApi) {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

// --- API Methods (These remain the same, they are now safer thanks to formatUrl) ---

export const apiGet = async (endpoint: string) => {
  const response = await fetch(formatUrl(endpoint), { 
    headers: getHeaders(endpoint), 
    method: 'GET'
  });
  return handleResponse(response);
};

export const apiPost = async (endpoint: string, data: any) => {
  const isFormData = data instanceof FormData;
  const response = await fetch(formatUrl(endpoint), {
    method: 'POST', 
    headers: getHeaders(endpoint, !isFormData), 
    body: isFormData ? data : JSON.stringify(data)
  });
  return handleResponse(response);
};

export const apiPut = async (endpoint: string, data: any) => {
  const isFormData = data instanceof FormData;
  const response = await fetch(formatUrl(endpoint), {
    method: 'PUT', 
    headers: getHeaders(endpoint, !isFormData), 
    body: isFormData ? data : JSON.stringify(data)
  });
  return handleResponse(response);
};

export const apiDelete = async (endpoint: string) => {
  const response = await fetch(formatUrl(endpoint), {
    method: 'DELETE', 
    headers: getHeaders(endpoint) 
  });
  return handleResponse(response);
};