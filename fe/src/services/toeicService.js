const API_BASE_URL = 'http://localhost:8080/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');

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
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Không thể tải danh sách đề TOEIC');
    }

    return data;
  },

  async getToeicPractice(examId) {
    const response = await fetch(`${API_BASE_URL}/toeic/exams/${examId}/practice`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Không thể tải nội dung đề TOEIC');
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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Không thể nộp bài TOEIC');
    }

    return data;
  },

  async getToeicResult(attemptId) {
    const response = await fetch(`${API_BASE_URL}/toeic/exams/results/${attemptId}`, {
      headers: {
        ...getAuthHeaders(),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Không thể tải kết quả bài thi');
    }

    return data;
  },
};