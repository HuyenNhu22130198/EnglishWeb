const API_BASE_URL = 'http://localhost:8080/api/dictionary';

export const dictionaryAPI = {
  async lookupWord(word, signal) {
    const searchTerm = word.trim();

    if (!searchTerm) {
      throw new Error('Vui lòng nhập từ hoặc cụm từ cần tra cứu.');
    }

    const response = await fetch(
      `${API_BASE_URL}/search?keyword=${encodeURIComponent(searchTerm)}`,
      { signal }
    );

    if (!response.ok) {
      let message = 'Không thể tải dữ liệu từ điển.';

      try {
        const errorData = await response.json();
        message = errorData.message || errorData.error || message;
      } catch {
        // Không cần xử lý thêm
      }

      throw new Error(message);
    }

    const data = await response.json();

    return {
  word: data.word || searchTerm,

  phonetic: data.phonetic || '',
  audioUrl: data.audioUrl || '',

  vietnameseMeaning: data.vietnameseMeaning || '',
  englishMeaning: data.englishMeaning || '',

  wordTypes: Array.isArray(data.wordTypes) ? data.wordTypes : [],
  wordForms: Array.isArray(data.wordForms) ? data.wordForms : [],

  synonyms: Array.isArray(data.synonyms) ? data.synonyms : [],

  example: {
    en: data.exampleEn || '',
    vi: data.exampleVi || '',
  },

  source: data.source || 'backend',
};
  },
};