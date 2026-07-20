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
  const statusText = response.status ? `HTTP ${response.status}` : 'loi mang';
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

const buildSkillSearchParams = (skill) => {
  const normalizedSkill = String(skill || '').trim().toUpperCase();
  const searchParams = new URLSearchParams();

  if (normalizedSkill) {
    searchParams.set('skill', normalizedSkill);
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

export const ieltsAPI = {
  async getIeltsExams(keyword = '') {
    const searchParams = keyword.trim()
      ? `?keyword=${encodeURIComponent(keyword.trim())}`
      : '';

    const response = await fetch(`${API_BASE_URL}/ielts/exams${searchParams}`);
    const data = await parseApiResponse(response);

    if (!response.ok) {
      throw createApiError(response, data, 'Khong the tai danh sach de IELTS');
    }

    return data;
  },

  async getIeltsPractice(examId, skill) {
    const response = await fetch(
      `${API_BASE_URL}/ielts/exams/${examId}/practice${buildSkillSearchParams(skill)}`
    );
    const data = await parseApiResponse(response);

    if (!response.ok) {
      throw createApiError(response, data, 'Khong the tai noi dung de IELTS');
    }

    return data;
  },

  async submitIeltsExam(examId, skill, answers, elapsedSeconds = 0) {
    const normalizedSkill = String(skill || '').trim().toUpperCase();
    const response = await fetch(
      `${API_BASE_URL}/ielts/exams/${examId}/submit${buildSkillSearchParams(skill)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          ...(normalizedSkill === 'WRITING' ? { tasks: answers } : { answers }),
          elapsedSeconds,
        }),
      }
    );

    const data = await parseApiResponse(response);

    if (!response.ok) {
      throw createApiError(response, data, 'Khong the nop bai IELTS');
    }

    return data;
  },

  async getIeltsResult(attemptId) {
    const response = await fetch(`${API_BASE_URL}/ielts/exams/results/${attemptId}`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    const data = await parseApiResponse(response);

    if (!response.ok) {
      throw createApiError(response, data, 'Khong the tai ket qua IELTS');
    }

    return data;
  },

  async getMyIeltsHistory() {
    const response = await fetch(`${API_BASE_URL}/users/me/ielts-history`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    const data = await parseApiResponse(response);

    if (!response.ok) {
      throw createApiError(response, data, 'Không thể tải lịch sử thi IELTS của bạn');
    }

    return data;
  },

  async getSpeakingToken() {
    return this.speakingRequest('/speech-token');
  },

  async startSpeakingAttempt(examId) {
    return this.speakingRequest(`/exams/${examId}/attempts`, { method: 'POST' });
  },

  async getSpeakingAttempt(examId, attemptId) {
    return this.speakingRequest(`/exams/${examId}/attempts/${attemptId}`);
  },

  async saveSpeakingAnswer(examId, payload) {
    return this.speakingRequest(`/exams/${examId}/answers`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async completeSpeakingAttempt(examId, attemptId) {
    return this.speakingRequest(`/exams/${examId}/attempts/${attemptId}/complete`, { method: 'POST' });
  },

  async speakingRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}/ielts/speaking${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
    });
    const data = await parseApiResponse(response);
    if (!response.ok) throw createApiError(response, data, 'Không thể xử lý bài luyện Speaking');
    return data;
  },
};
