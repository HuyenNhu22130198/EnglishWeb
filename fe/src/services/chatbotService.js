const API_BASE_URL = 'http://localhost:8080/api/chatbot';

const parseApiResponse = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      message: text,
    };
  }
};

const createApiError = (response, data, fallbackMessage) => {
  const statusText = response.status ? `HTTP ${response.status}` : 'lỗi mạng';
  const error = new Error(data?.message || `${fallbackMessage} (${statusText})`);
  error.status = response.status;
  error.statusText = response.statusText;
  error.data = data;
  return error;
};

export const chatbotAPI = {
  async ask(message) {
    const response = await fetch(`${API_BASE_URL}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
      }),
    });

    const data = await parseApiResponse(response);

    if (!response.ok) {
      throw createApiError(response, data, 'Không thể tra cứu câu hỏi');
    }

    return data;
  },
};
