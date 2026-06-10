import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getStoredToken = () => {
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
    if (error.response?.status === 401) {
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
      localStorage.setItem('token', loginData.token);
      localStorage.setItem('user', JSON.stringify(loginData));
    }

    return apiResponse;
  },

  getCurrentUser: async () => {
    const response = await api.get('/users/me');
    return response.data;
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