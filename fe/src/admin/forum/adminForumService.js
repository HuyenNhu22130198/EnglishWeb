import { API_BASE } from '../../config/apiBase';

const API_BASE_URL = `${API_BASE}/admin/forum`;

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

  if (!(options.body instanceof FormData) && !headers['Content-Type'] && options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || 'Không thể xử lý yêu cầu diễn đàn.');
  }

  return data;
};

const toQuery = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export const adminForumAPI = {
  getPosts: (params) => request(`/posts${toQuery(params)}`),
  deletePost: (postId) => request(`/posts/${postId}`, { method: 'DELETE' }),
  deleteComment: (commentId) => request(`/comments/${commentId}`, { method: 'DELETE' }),
  getReports: (params) => request(`/reports${toQuery(params)}`),
  resolveReport: (reportId, deleteTarget) =>
    request(`/reports/${reportId}/resolve${toQuery({ deleteTarget })}`, { method: 'POST' }),
  dismissReport: (reportId) => request(`/reports/${reportId}/dismiss`, { method: 'POST' }),
};
