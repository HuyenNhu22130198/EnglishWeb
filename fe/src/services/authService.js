import axios from 'axios';

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const API_BASE_URL = configuredApiBaseUrl.endsWith('/api')
  ? configuredApiBaseUrl
  : `${configuredApiBaseUrl}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getStoredToken = () => {
  try {
    const rawUser = localStorage.getItem('user');

    if (rawUser) {
      const user = JSON.parse(rawUser);
      if (user?.token) return user.token;
    }

    return localStorage.getItem('token') || '';
  } catch {
    return localStorage.getItem('token') || '';
  }
};

export const storeUser = (userData) => {
  const storedUser = authAPI.getStoredUser() || {};
  const safeUserData = { ...(userData || {}) };
  delete safeUserData.password;
  const token = safeUserData.token || storedUser.token || localStorage.getItem('token') || '';

  localStorage.setItem('user', JSON.stringify({
    ...storedUser,
    ...safeUserData,
    token,
  }));

  if (token) {
    localStorage.setItem('token', token);
  }
};

api.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Các endpoint xác thực (login / oauth / register / forgot / reset...) tự hiển thị lỗi
    // ngay trên trang, không được redirect kẻo mất thông báo lỗi + nút gửi lại xác thực.
    const requestUrl = error.config?.url || '';
    const isAuthEndpoint = requestUrl.includes('/auth/');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (data) => {
    const response = await api.post('/auth/register', {
      email: data.email,
      username: data.username,
      password: data.password,
      confirmPassword: data.confirmPassword,
      fullName: data.fullName,
    });

    return response.data;
  },

  login: async (emailOrUsername, password) => {
    const response = await api.post('/auth/login', {
      emailOrUsername,
      password,
    });

    const apiResponse = response.data;
    const loginData = apiResponse?.data;

    if (apiResponse?.success && loginData?.token) {
      storeUser(loginData);
    }

    return apiResponse;
  },

  verifyEmail: async (token) => {
    const response = await api.get('/auth/verify-email', { params: { token } });
    return response.data;
  },

  resendVerification: async (email) => {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, password, confirmPassword) => {
    const response = await api.post('/auth/reset-password', {
      token,
      password,
      confirmPassword,
    });
    return response.data;
  },

  oauthGoogle: async (credential) => {
    const response = await api.post('/auth/oauth/google', { credential });
    const apiResponse = response.data;
    if (apiResponse?.success && apiResponse.data?.token) {
      storeUser(apiResponse.data);
    }
    return apiResponse;
  },

  oauthFacebook: async (credential) => {
    const response = await api.post('/auth/oauth/facebook', { credential });
    const apiResponse = response.data;
    if (apiResponse?.success && apiResponse.data?.token) {
      storeUser(apiResponse.data);
    }
    return apiResponse;
  },

  getCurrentUser: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },

  updateCurrentUser: async (data) => {
    const response = await api.put('/users/me', data);
    const apiResponse = response.data;
    const updatedUser = apiResponse?.data;

    if (apiResponse?.success && updatedUser) {
      storeUser(updatedUser);
    }

    return apiResponse;
  },

  updateAccountSettings: async (data) => {
    const response = await api.put('/users/me/settings', data);
    const apiResponse = response.data;

    if (apiResponse?.success && apiResponse.data) {
      storeUser(apiResponse.data);
    }

    return apiResponse;
  },

  changePassword: async (data) => {
    const response = await api.put('/users/me/change-password', data);
    return response.data;
  },

  deleteCurrentUser: async (data) => {
    const response = await api.put('/users/me/delete', data);
    return response.data;
  },

  syncCurrentUser: async () => {
    const response = await api.get('/users/me');
    const apiResponse = response.data;

    if (apiResponse?.success && apiResponse.data) {
      storeUser(apiResponse.data);
    }

    return apiResponse;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  isAuthenticated: () => {
    return !!getStoredToken();
  },

  getStoredUser: () => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },
};

export default api;
