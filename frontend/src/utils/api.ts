const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // Only redirect if we aren't already on the login page to avoid loops
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

/**
 * Helper to construct full URL
 */
const formatUrl = (endpoint: string) => 
  `${API_BASE}/${endpoint.replace(/^\//, '')}`;

/**
 * Helper to process fetch responses
 */
const handleResponse = async (response: Response) => {
  // Only auto-clear on 401 if it's NOT a login attempt
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

/**
 * Core Header logic - Synchronized with backend routes
 */
const getHeaders = (endpoint: string, isJson = false) => {
  const headers: any = {};

  const publicRoutes = [
    '/auth/login',
    '/api/users/forgot-password',
    '/api/users/reset-password'
  ];

  const isPublicRoute = publicRoutes.some(route => 
    endpoint.includes(route) || 
    window.location.pathname.includes('login') ||
    window.location.pathname.includes('reset-password')
  );

  if (!isPublicRoute) {
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

// --- API Methods ---

export const apiGet = async (endpoint: string) => {
  const response = await fetch(formatUrl(endpoint), { 
    headers: getHeaders(endpoint), 
    method: 'GET'
  });
  return handleResponse(response);
};

export const apiPost = async (endpoint: string, data: any) => {
  const response = await fetch(formatUrl(endpoint), {
    method: 'POST', 
    headers: getHeaders(endpoint, true), 
    body: JSON.stringify(data)
  });
  return handleResponse(response);
};

export const apiPut = async (endpoint: string, data: any) => {
  const response = await fetch(formatUrl(endpoint), {
    method: 'PUT', 
    headers: getHeaders(endpoint, true), 
    body: JSON.stringify(data)
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