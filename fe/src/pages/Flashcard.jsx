import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import styles from './Flashcard.module.css';

const STORAGE_KEY = 'english-web-flashcards-v1';
const DELETED_STARTER_KEY = 'english-web-deleted-starter-flashcards-v1';
const EDITED_STARTER_KEY = 'english-web-edited-starter-flashcards-v1';
const NEXT_ID_KEY = 'english-web-next-flashcard-id-v1';

const starterCards = [
  {
    id: 'toeic-001',
    term: 'reimbursement',
    pronunciation: '/ˌriːɪmˈbɜːsmənt/',
    meaning: 'sự hoàn trả',
    example: 'Please submit your receipt for reimbursement.',
    topic: 'TOEIC',
    level: 'Basic',
  },
  {
    id: 'toeic-002',
    term: 'deadline',
    pronunciation: '/ˈdedlaɪn/',
    meaning: 'hạn chót',
    example: 'Please submit the report before the deadline.',
    topic: 'TOEIC',
    level: 'Basic',
  },
  {
    id: 'toeic-003',
    term: 'inventory',
    pronunciation: '/ˈɪnvəntri/',
    meaning: 'hàng tồn kho; danh mục kiểm kê',
    example: 'The store checks its inventory every Friday.',
    topic: 'TOEIC',
    level: 'Intermediate',
  },
];

const emptyForm = {
  term: '',
  pronunciation: '',
  wordType: '',
  meaning: '',
  example: '',
  level: 'Basic',
};

const loadStoredJson = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const speakText = (text) => {
  if (!text || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  window.speechSynthesis.speak(utterance);
};

const Flashcard = () => {
  const { user } = useAuth();
  const [customCards, setCustomCards] = useState(() =>
    loadStoredJson(STORAGE_KEY, [])
  );
  const [deletedStarterIds, setDeletedStarterIds] = useState(() =>
    loadStoredJson(DELETED_STARTER_KEY, [])
  );
  const [editedStarterCards, setEditedStarterCards] = useState(() =>
    loadStoredJson(EDITED_STARTER_KEY, {})
  );
  const [nextCustomId, setNextCustomId] = useState(() =>
    loadStoredJson(NEXT_ID_KEY, 1)
  );
  const [screen, setScreen] = useState('list');
  const [selectedDeck, setSelectedDeck] = useState('');
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [deckMode, setDeckMode] = useState('existing');
  const [newDeckName, setNewDeckName] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [editingCardId, setEditingCardId] = useState('');

  const authorName = user?.fullName || user?.username || 'ndangthihuyen';

  const cards = useMemo(() => {
    const starterDeck = starterCards
      .filter((card) => !deletedStarterIds.includes(card.id))
      .map((card) => ({
        ...card,
        ...(editedStarterCards[card.id] || {}),
      }));

    return [...starterDeck, ...customCards];
  }, [customCards, deletedStarterIds, editedStarterCards]);

  const decks = useMemo(() => {
    const deckMap = new Map();

    cards.forEach((card) => {
      const deckName = card.topic || 'My list';
      const currentDeck = deckMap.get(deckName) || {
        name: deckName,
        count: 0,
      };

      deckMap.set(deckName, {
        ...currentDeck,
        count: currentDeck.count + 1,
      });
    });

    return Array.from(deckMap.values());
  }, [cards]);

  const deckNames = useMemo(() => decks.map((deck) => deck.name), [decks]);
  const totalCards = cards.length;
  const totalDecks = decks.length;

  const deckCards = useMemo(
    () => cards.filter((card) => card.topic === selectedDeck),
    [cards, selectedDeck]
  );

  const practiceCards = deckCards;

  const practiceCard = practiceCards[practiceIndex] || null;

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customCards));
  }, [customCards]);

  useEffect(() => {
    window.localStorage.setItem(
      DELETED_STARTER_KEY,
      JSON.stringify(deletedStarterIds)
    );
  }, [deletedStarterIds]);

  useEffect(() => {
    window.localStorage.setItem(
      EDITED_STARTER_KEY,
      JSON.stringify(editedStarterCards)
    );
  }, [editedStarterCards]);

  useEffect(() => {
    window.localStorage.setItem(NEXT_ID_KEY, JSON.stringify(nextCustomId));
  }, [nextCustomId]);

  const resetPractice = () => {
    setPracticeIndex(0);
    setIsFlipped(false);
  };

  const openDeck = (deckName) => {
    setSelectedDeck(deckName);
    setScreen('deck');
    setForm(emptyForm);
    setFormError('');
    setEditingCardId('');
    resetPractice();
  };

  const openCreateDeck = () => {
    setScreen('create');
    setSelectedDeck(deckNames[0] || '');
    setDeckMode(deckNames.length ? 'existing' : 'new');
    setNewDeckName('');
    setForm(emptyForm);
    setFormError('');
    setEditingCardId('');
  };

  const openPractice = () => {
    setScreen('practice');
    resetPractice();
  };

  const goBackToList = () => {
    setScreen('list');
    setSelectedDeck('');
    setForm(emptyForm);
    setFormError('');
    setEditingCardId('');
    resetPractice();
  };

  const goBackToDeck = () => {
    setScreen('deck');
    resetPractice();
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
    setFormError('');
  };

  const saveCardToDeck = (event, targetDeck) => {
    event.preventDefault();

    const term = form.term.trim();
    const meaning = form.meaning.trim();
    const deckName = targetDeck.trim();

    if (!term || !meaning) {
      setFormError('Vui lòng nhập đầy đủ Từ vựng và Nghĩa tiếng Việt.');
      return;
    }

    if (!deckName) {
      setFormError('Vui lòng chọn hoặc nhập tên bộ thẻ.');
      return;
    }

    if (editingCardId) {
      const updatedCard = {
        term,
        pronunciation: form.pronunciation.trim(),
        wordType: form.wordType.trim(),
        meaning,
        example: form.example.trim(),
        topic: deckName,
        level: form.level,
      };

      if (editingCardId.startsWith('custom-')) {
        setCustomCards((currentCards) =>
          currentCards.map((card) =>
            card.id === editingCardId ? { ...card, ...updatedCard } : card
          )
        );
      } else {
        setEditedStarterCards((currentCards) => ({
          ...currentCards,
          [editingCardId]: updatedCard,
        }));
      }

      setSelectedDeck(deckName);
      setScreen('deck');
      setForm(emptyForm);
      setFormError('');
      setEditingCardId('');
      resetPractice();
      return;
    }

    const newCard = {
      id: `custom-${nextCustomId}`,
      term,
      pronunciation: form.pronunciation.trim(),
      wordType: form.wordType.trim(),
      meaning,
      example: form.example.trim(),
      topic: deckName,
      level: form.level,
    };

    setNextCustomId((currentId) => currentId + 1);
    setCustomCards((currentCards) => [newCard, ...currentCards]);
    setSelectedDeck(deckName);
    setScreen('deck');
    setForm(emptyForm);
    setFormError('');
    setEditingCardId('');
    resetPractice();
  };

  const handleCreateCard = (event) => {
    const deckName =
      deckMode === 'new' ? newDeckName.trim() : selectedDeck.trim();
    saveCardToDeck(event, deckName);
  };

  const handleDeckCardAdd = (event) => {
    saveCardToDeck(event, selectedDeck);
  };

  const deleteCard = (cardId) => {
    if (editingCardId === cardId) {
      setEditingCardId('');
      setForm(emptyForm);
      setFormError('');
    }

    if (cardId.startsWith('custom-')) {
      setCustomCards((currentCards) =>
        currentCards.filter((card) => card.id !== cardId)
      );
      return;
    }

    setDeletedStarterIds((currentIds) => [...currentIds, cardId]);
  };

  const startEditCard = (card) => {
    setEditingCardId(card.id);
    setForm({
      term: card.term || '',
      pronunciation: card.pronunciation || '',
      wordType: card.wordType || '',
      meaning: card.meaning || '',
      example: card.example || '',
      level: card.level || 'Basic',
    });
    setFormError('');
  };

  const cancelEdit = () => {
    setEditingCardId('');
    setForm(emptyForm);
    setFormError('');
  };

  const goToPracticeCard = (direction) => {
    if (!practiceCards.length) return;

    setPracticeIndex((currentIndex) => {
      const nextIndex =
        direction === 'next'
          ? currentIndex + 1
          : currentIndex - 1 + practiceCards.length;

      return nextIndex % practiceCards.length;
    });
    setIsFlipped(false);
  };

  const renderAddForm = (onSubmit, showDeckPicker = false) => (
    <form className={styles.addForm} onSubmit={onSubmit}>
      <h2>Thêm flashcard mới</h2>

      {editingCardId ? (
        <p className={styles.editingNotice}>Dang chinh sua flashcard</p>
      ) : null}

      {showDeckPicker ? (
        <>
          <div className={styles.deckMode}>
            <button
              type="button"
              className={deckMode === 'existing' ? styles.activeDeckMode : ''}
              onClick={() => setDeckMode('existing')}
            >
              Bộ đã có
            </button>
            <button
              type="button"
              className={deckMode === 'new' ? styles.activeDeckMode : ''}
              onClick={() => setDeckMode('new')}
            >
              Bộ mới
            </button>
          </div>

          {deckMode === 'existing' ? (
            <select
              value={selectedDeck}
              onChange={(event) => setSelectedDeck(event.target.value)}
            >
              {deckNames.map((deckName) => (
                <option key={deckName} value={deckName}>
                  {deckName}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={newDeckName}
              onChange={(event) => setNewDeckName(event.target.value)}
              placeholder="Tên bộ thẻ mới"
            />
          )}
        </>
      ) : null}

      <input
        name="term"
        value={form.term}
        onChange={handleInputChange}
        placeholder="Từ vựng *"
      />
      <input
        name="pronunciation"
        value={form.pronunciation}
        onChange={handleInputChange}
        placeholder="Phiên âm"
      />
      <input
        name="wordType"
        value={form.wordType}
        onChange={handleInputChange}
        placeholder="Từ loại"
      />
      <textarea
        name="meaning"
        value={form.meaning}
        onChange={handleInputChange}
        placeholder="Nghĩa tiếng Việt *"
        rows="3"
      />
      <textarea
        name="example"
        value={form.example}
        onChange={handleInputChange}
        placeholder="Câu ví dụ"
        rows="3"
      />
      <select name="level" value={form.level} onChange={handleInputChange}>
        <option>Basic</option>
        <option>Intermediate</option>
        <option>Advanced</option>
      </select>
      {formError ? <p className={styles.formError}>{formError}</p> : null}
      <button type="submit">Thêm vào bộ thẻ</button>
      {editingCardId ? (
        <button type="button" className={styles.cancelEditButton} onClick={cancelEdit}>
          Huy chinh sua
        </button>
      ) : null}
    </form>
  );

  if (screen === 'list') {
    return (
      <main className={styles.flashcardPage}>
        <section className={styles.deckSection}>
          <div className="container">
            <div className={styles.pageHeader}>
              <div>
                <p className={styles.pageKicker}>Flashcards</p>
                <h1 className={styles.deckTitle}>List từ đã tạo:</h1>
              </div>

              <div className={styles.pageStats}>
                <span className={styles.statPill}>{totalDecks} bộ thẻ</span>
                <span className={styles.statPill}>{totalCards} từ</span>
              </div>
            </div>

            <div className={styles.deckGrid}>
              <button
                type="button"
                className={styles.createDeckCard}
                onClick={openCreateDeck}
              >
                <span aria-hidden="true">+</span>
                <strong>Tạo list từ</strong>
              </button>

              {decks.map((deck) => (
                <button
                  key={deck.name}
                  type="button"
                  className={styles.deckCard}
                  onClick={() => openDeck(deck.name)}
                >
                  <strong>{deck.name}</strong>
                  <span className={styles.deckCount}>▣ {deck.count} từ</span>
                  <span className={styles.deckAuthor}>
                    <span>{authorName.charAt(0).toUpperCase()}</span>
                    {authorName}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (screen === 'create') {
    return (
      <main className={styles.flashcardPage}>
        <section className={styles.studySection}>
          <div className="container">
            <button type="button" className={styles.topBackButton} onClick={goBackToList}>
              ← Quay lại
            </button>
            <div className={styles.createPanel}>{renderAddForm(handleCreateCard, true)}</div>
          </div>
        </section>
      </main>
    );
  }

  if (screen === 'practice') {
    return (
      <main className={styles.flashcardPage}>
        <section className={styles.practiceSection}>
          <div className="container">
            <button type="button" className={styles.backButton} onClick={goBackToDeck}>
              Quay lại bộ thẻ
            </button>

            <div className={styles.practiceCard}>
              <span className={styles.newWordBadge}>Từ mới</span>

              {practiceCard ? (
                <div
                  className={styles.practiceFlipArea}
                  onClick={() => setIsFlipped((current) => !current)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setIsFlipped((current) => !current);
                    }
                  }}
                >
                  {isFlipped ? (
                    <span className={styles.practiceMeaning}>
                      <strong>{practiceCard.meaning}</strong>
                      {practiceCard.example ? <small>{practiceCard.example}</small> : null}
                    </span>
                  ) : (
                    <span className={styles.practiceTerm}>
                      <strong>{practiceCard.term}</strong>
                      <button
                        type="button"
                        className={styles.soundButton}
                        onClick={(event) => {
                          event.stopPropagation();
                          speakText(practiceCard.term);
                        }}
                      >
                        🔊
                      </button>
                    </span>
                  )}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <h2>Chưa có từ trong bộ thẻ này</h2>
                </div>
              )}

              <button
                type="button"
                className={styles.flipIcon}
                onClick={() => setIsFlipped((current) => !current)}
              >
                ↻
              </button>
            </div>

            {practiceCards.length > 1 ? (
              <div className={styles.practiceActions}>
                <button type="button" onClick={() => goToPracticeCard('prev')}>
                  Trước
                </button>
                <span>
                  {practiceIndex + 1}/{practiceCards.length}
                </span>
                <button type="button" onClick={() => goToPracticeCard('next')}>
                  Sau
                </button>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.flashcardPage}>
      <section className={styles.deckDetailSection}>
        <div className="container">
          <button type="button" className={styles.topBackButton} onClick={goBackToList}>
            ← Quay lại
          </button>

          <div className={styles.deckDetailHeader}>
            <div>
              <p className={styles.pageKicker}>Deck detail</p>
              <h1 className={styles.deckTitle}>{selectedDeck}</h1>
              <p className={styles.deckSubtitle}>{deckCards.length} từ trong bộ này</p>
            </div>

            <button type="button" className={styles.practiceButton} onClick={openPractice}>
              Luyện tập flashcards
            </button>
          </div>

          <div className={styles.deckDetailLayout}>
            <div className={styles.deckAddPanel}>
              {renderAddForm(handleDeckCardAdd)}
            </div>

            <div className={styles.deckWordsPanel}>
              <p className={styles.listCount}>List có {deckCards.length} từ</p>

              <div className={styles.wordList}>
                {deckCards.map((card) => (
                  <article key={card.id} className={styles.wordItem}>
                    <div className={styles.wordItemHeader}>
                      <strong>{card.term}</strong>
                      <button type="button" onClick={() => speakText(card.term)}>
                        🔊
                      </button>
                      <button
                        type="button"
                        className={styles.editButton}
                        onClick={() => startEditCard(card)}
                      >
                        ✎
                      </button>
                    </div>

                    <p>
                      <b>Định nghĩa:</b>
                      {card.wordType ? (
                        <span className={styles.wordType}>({card.wordType})</span>
                      ) : null}
                      <span>{card.meaning}</span>
                    </p>

                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => deleteCard(card.id)}
                    >
                      🗑
                    </button>
                  </article>
                ))}
              </div>

              {deckCards.length ? <span className={styles.pageNumber}>1</span> : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Flashcard;
