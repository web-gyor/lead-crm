const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

const formatUrl = (endpoint: string) => 
  `${API_BASE}/${endpoint.replace(/^\//, '')}`;

const handleResponse = async (response: Response) => {
  if (response.status === 401 && !response.url.includes('/auth/login')) {
    clearAuth();
    return null;
  }
  
  if (response.status === 204) return { success: true };

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || `Error: ${response.status}`);
  }
  return data;
};

const getHeaders = (endpoint: string, isJson = false) => {
  const headers: any = {};
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

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

  // Only set application/json if explicitly requested
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

// --- API Methods ---

export const apiGet = async (endpoint: string) => {
  const response = await fetch(formatUrl(endpoint), { 
    headers: getHeaders(endpoint), 
    method: 'GET'
  });
  return handleResponse(response);
};

/**
 * Updated apiPost to detect FormData
 */
export const apiPost = async (endpoint: string, data: any) => {
  const isFormData = data instanceof FormData;
  
  const response = await fetch(formatUrl(endpoint), {
    method: 'POST', 
    // If it's FormData, we pass false to getHeaders so Content-Type is NOT set
    headers: getHeaders(endpoint, !isFormData), 
    body: isFormData ? data : JSON.stringify(data)
  });
  return handleResponse(response);
};

/**
 * Updated apiPut to detect FormData
 */
export const apiPut = async (endpoint: string, data: any) => {
  const isFormData = data instanceof FormData;

  const response = await fetch(formatUrl(endpoint), {
    method: 'PUT', 
    // If it's FormData, we pass false so the browser sets the multipart boundary
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