import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000';
// const API_BASE_URL = 'http://15.206.144.225:4000'
// const API_BASE_URL = '/api';
// const API_BASE_URL = "https://backend.vetansutra.com";

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
