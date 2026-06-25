const API_BASE_URL = 'http://localhost:8080/api';

const parseResponse = async (response) => {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const handleResponse = async (response, fallbackMessage) => {
  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(data?.message || fallbackMessage);
  }

  return data;
};

export const bannerAPI = {
  async getPublicBanners() {
    const response = await fetch(`${API_BASE_URL}/banners`);
    return handleResponse(response, 'Không thể tải banner.');
  },
};