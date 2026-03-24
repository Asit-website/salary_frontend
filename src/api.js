import axios from 'axios';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal ? 'http://localhost:4000' : 'https://backend.vetansutra.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests and handle FormData content-type
// Check sessionStorage first (for impersonated sessions), then localStorage
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('impersonate_token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Automatically add X-Org-Id if user is in context (crucial for superadmin/impersonation)
  const userStr = sessionStorage.getItem('impersonate_user') || localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user?.orgAccountId) {
        config.headers['X-Org-Id'] = user.orgAccountId;
      }
    } catch (_) { }
  }

  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
  }
  return config;
});

export default api;
export { API_BASE_URL };
