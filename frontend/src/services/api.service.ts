import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const requestUrl = error.config?.url ?? '';
    const authHeader = error.config?.headers?.Authorization;
    const hasToken = !!localStorage.getItem('token');
    const isTaskRequest = requestUrl.includes('/tasks');
    const isLoginOrRegister =
      requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');

    console.error('Response error:', {
      url: requestUrl,
      status: error.response?.status,
      data: error.response?.data,
      error: error.message
    });

    // Do not force logout for task endpoint 401s to avoid unwanted session drops.
    // Task errors will be handled in the UI, while true auth/session errors still logout.
    if (
      error.response?.status === 401 &&
      hasToken &&
      !isLoginOrRegister &&
      !isTaskRequest &&
      authHeader
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
