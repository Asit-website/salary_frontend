import axios from 'axios';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal ? 'http://localhost:4000' : 'https://backend.vetansutra.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Generate or retrieve persistent visitor ID (browser fingerprint)
let deviceFingerprint = localStorage.getItem('device_fingerprint');
if (!deviceFingerprint) {
  const array = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 16; i++) array[i] = Math.floor(Math.random() * 256);
  }
  deviceFingerprint = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  localStorage.setItem('device_fingerprint', deviceFingerprint);
}

// Add auth token to requests and handle FormData content-type
// Check sessionStorage first (for impersonated sessions), then localStorage
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('impersonate_token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Inject secure Zero Trust device trust headers
  if (deviceFingerprint) {
    config.headers['x-device-fingerprint'] = deviceFingerprint;
    config.headers['x-app-platform'] = 'web';
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

// Background refresh queue handling
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      (typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary'))
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

// Response interceptor for automatic transparent token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Trigger refresh only on 401 Unauthorized errors and if it's not a retry already
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If the refresh endpoint itself failed, clear credentials and redirect to login
      if (originalRequest.url && originalRequest.url.includes('/auth/refresh')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();
        window.location.href = '/';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        let currentIsSuperadmin = false;
        let currentOrgAccountId = null;

        const userStr = sessionStorage.getItem('impersonate_user') || localStorage.getItem('user');
        if (userStr) {
          try {
            const uObj = JSON.parse(userStr);
            currentIsSuperadmin = !!uObj.isSuperadminPanel;
            currentOrgAccountId = uObj.orgAccountId || null;
          } catch (_) {}
        }

        const resp = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { isSuperadminPanel: currentIsSuperadmin, orgAccountId: currentOrgAccountId },
          { withCredentials: true }
        );
        const { token } = resp.data;

        // Parse token claims and update local storage/session storage user object
        const decoded = parseJwt(token);
        if (decoded) {
          const uStr = sessionStorage.getItem('impersonate_user') || localStorage.getItem('user');
          if (uStr) {
            try {
              const uObj = JSON.parse(uStr);
              const updatedUser = {
                ...uObj,
                id: decoded.id,
                role: decoded.role,
                phone: decoded.phone,
                name: decoded.name,
                staffId: decoded.staffId,
                orgAccountId: decoded.orgAccountId,
                channelPartnerId: decoded.channelPartnerId,
                isSuperadminPanel: decoded.isSuperadminPanel,
                permissions: decoded.permissions
              };
              if (sessionStorage.getItem('impersonate_token')) {
                sessionStorage.setItem('impersonate_user', JSON.stringify(updatedUser));
              } else {
                localStorage.setItem('user', JSON.stringify(updatedUser));
              }
            } catch (_) {}
          }
        }

        if (sessionStorage.getItem('impersonate_token')) {
          sessionStorage.setItem('impersonate_token', token);
        }
        localStorage.setItem('token', token);
        originalRequest.headers.Authorization = `Bearer ${token}`;

        processQueue(null, token);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();
        window.location.href = '/';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE_URL };
