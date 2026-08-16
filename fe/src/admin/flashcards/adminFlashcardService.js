import { API_BASE } from '../../config/apiBase';

const API_BASE_URL = `${API_BASE}/admin/flashcards`;

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
    const error = new Error(data?.message || 'Không thể xử lý flashcard.');
    error.data = data?.data;
    throw error;
  }

  return data;
};

export const adminFlashcardAPI = {
  getDecks: () => request('/decks'),
  createDeck: (payload) => request('/decks', { method: 'POST', body: JSON.stringify(payload) }),
  updateDeck: (id, payload) => request(`/decks/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteDeck: (id) => request(`/decks/${id}`, { method: 'DELETE' }),
  getDeckCards: (deckId) => request(`/decks/${deckId}/cards`),
  createCard: (deckId, payload) => request(`/decks/${deckId}/cards`, { method: 'POST', body: JSON.stringify(payload) }),
  updateCard: (cardId, payload) => request(`/cards/${cardId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCard: (cardId) => request(`/cards/${cardId}`, { method: 'DELETE' }),
  importCards: (deckId, file) => {
    const body = new FormData();
    body.append('file', file);
    return request(`/decks/${deckId}/cards/import`, { method: 'POST', body });
  },
  async downloadImportTemplate() {
    const response = await fetch(`${API_BASE_URL}/import-template`, {
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    });

    if (!response.ok) {
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      throw new Error(data?.message || 'Không thể tải file mẫu Excel.');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'flashcard-import-template.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
