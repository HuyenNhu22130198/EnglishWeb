import { API_BASE } from '../../config/apiBase';

const API_BASE_URL = `${API_BASE}/admin/banners`;

const getToken = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.token || localStorage.getItem('token') || '';
  } catch {
    return localStorage.getItem('token') || '';
  }
};

const request = async (path = '', options = {}) => {
  const headers = {
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    ...options.headers,
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || 'Khong the xu ly banner.');
  }

  return data;
};

export const adminBannerAPI = {
  getBanners: () => request(),
  uploadBannerImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/upload', { method: 'POST', body: formData });
  },
  createBanner: (payload) => request('', { method: 'POST', body: JSON.stringify(payload) }),
  updateBanner: (id, payload) => request(`/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteBanner: (id) => request(`/${id}`, { method: 'DELETE' }),
};
