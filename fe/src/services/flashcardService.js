import { API_BASE } from '../config/apiBase';

const API_BASE_URL = API_BASE;

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

export const flashcardAPI = {
  async getSystemDecks() {
    const response = await fetch(`${API_BASE_URL}/flashcards/decks`);
    return handleResponse(response, 'Không thể tải danh sách bộ flashcard.');
  },
  async getSystemDeckCards(deckId) {
    const response = await fetch(`${API_BASE_URL}/flashcards/decks/${deckId}/cards`);
    return handleResponse(response, 'Không thể tải flashcard trong bộ này.');
  },
};
