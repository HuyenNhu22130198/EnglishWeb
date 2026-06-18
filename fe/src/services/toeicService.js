import { getStoredToken } from './authService';

const API_BASE_URL = 'http://localhost:8080/api';

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

const getAuthHeaders = () => {
  const token = getStoredToken();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

export const toeicAPI = {
  async getToeicExams(keyword = '') {
    const searchParams = keyword.trim()
      ? `?keyword=${encodeURIComponent(keyword.trim())}`
      : '';

    const response = await fetch(`${API_BASE_URL}/toeic/exams${searchParams}`);
    const data = await parseApiResponse(response);

    if (!response.ok) {
      throw createApiError(response, data, 'Không thể tải danh sách đề TOEIC');
    }

    return data;
  },

  async getToeicPractice(examId) {
    const response = await fetch(`${API_BASE_URL}/toeic/exams/${examId}/practice`);
    const data = await parseApiResponse(response);

    if (!response.ok) {
      throw createApiError(response, data, 'Không thể tải nội dung đề TOEIC');
    }

    return data;
  },

  async submitToeicExam(examId, answers) {
    const response = await fetch(`${API_BASE_URL}/toeic/exams/${examId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        answers,
      }),
    });

    const data = await parseApiResponse(response);

    if (!response.ok) {
      throw createApiError(response, data, 'Không thể nộp bài TOEIC');
    }

    return data;
  },

  async getToeicResult(attemptId) {
    const response = await fetch(`${API_BASE_URL}/toeic/exams/results/${attemptId}`, {
      headers: {
        ...getAuthHeaders(),
      },
    });

    const data = await parseApiResponse(response);

    if (!response.ok) {
      throw createApiError(response, data, 'Không thể tải kết quả bài thi');
    }

    return data;
  },

  async getMyToeicHistory() {
    const response = await fetch(`${API_BASE_URL}/users/me/toeic-history`, {
      headers: {
        ...getAuthHeaders(),
      },
    });

    const data = await parseApiResponse(response);

    if (!response.ok) {
      throw createApiError(response, data, 'Không thể tải lịch sử thi TOEIC của bạn');
    }

    return data;
  },
};
