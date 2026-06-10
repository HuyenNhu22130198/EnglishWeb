const API_BASE_URL = 'http://localhost:8080/api/admin/dictionary';

const getToken = () => {
  try {
    const rawUser = localStorage.getItem('user');

    if (rawUser) {
      const user = JSON.parse(rawUser);
      return user?.token || '';
    }

    return localStorage.getItem('token') || '';
  } catch {
    return '';
  }
};

const buildHeaders = () => {
  const token = getToken();

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (response) => {
  if (!response.ok) {
    let message = 'Không thể xử lý yêu cầu.';

    try {
      const errorData = await response.json();
      message = errorData.message || errorData.error || message;
    } catch {
      // ignore
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export const adminDictionaryAPI = {
  async getEntries({ keyword = '', page = 0, size = 10 }) {
    const params = new URLSearchParams({
      keyword,
      page: String(page),
      size: String(size),
    });

    const response = await fetch(`${API_BASE_URL}?${params.toString()}`, {
      method: 'GET',
      headers: buildHeaders(),
    });

    return handleResponse(response);
  },

  async getEntry(id) {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'GET',
      headers: buildHeaders(),
    });

    return handleResponse(response);
  },

  async generateEntry(keyword) {
    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ keyword }),
    });

    return handleResponse(response);
  },

  async updateEntry(id, payload) {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(payload),
    });

    return handleResponse(response);
  },

  async deleteEntry(id) {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    });

    return handleResponse(response);
  },
};