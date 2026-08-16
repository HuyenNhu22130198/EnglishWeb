import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFlashcardNextIdKey, getFlashcardStorageKey } from '../utils/flashcardStorage';
import { flashcardAPI } from '../services/flashcardService';
import styles from './Flashcard.module.css';

const emptyForm = {
  term: '',
  pronunciation: '',
  wordType: '',
  meaning: '',
  example: '',
  level: 'Basic',
};

const loadStoredJson = (key, fallback) => {
  if (!key || typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const speakText = (text) => {
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  window.speechSynthesis.speak(utterance);
};

const ModeTabs = ({ mode, onModeChange }) => (
  <div className={styles.modeTabs}>
    <button
      type="button"
      className={mode === 'mine' ? styles.modeTabActive : styles.modeTab}
      onClick={() => onModeChange('mine')}
    >
      Của tôi
    </button>
    <button
      type="button"
      className={mode === 'system' ? styles.modeTabActive : styles.modeTab}
      onClick={() => onModeChange('system')}
    >
      Có sẵn
    </button>
  </div>
);

const FlashcardWorkspace = ({ user, storageKey, nextIdKey, mode, onModeChange }) => {
  const [customCards, setCustomCards] = useState(() => loadStoredJson(storageKey, []));
  const [nextCustomId, setNextCustomId] = useState(() => loadStoredJson(nextIdKey, 1));
  const [screen, setScreen] = useState('list');
  const [selectedDeck, setSelectedDeck] = useState('');
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [deckMode, setDeckMode] = useState('existing');
  const [newDeckName, setNewDeckName] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [editingCardId, setEditingCardId] = useState('');

  const authorName = user?.fullName || user?.username || user?.email || 'Bạn';
  const cards = customCards;

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
    if (!storageKey || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(customCards));
  }, [customCards, storageKey]);

  useEffect(() => {
    if (!nextIdKey || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(nextIdKey, JSON.stringify(nextCustomId));
  }, [nextCustomId, nextIdKey]);

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

    const updatedCard = {
      term,
      pronunciation: form.pronunciation.trim(),
      wordType: form.wordType.trim(),
      meaning,
      example: form.example.trim(),
      topic: deckName,
      level: form.level,
    };

    if (editingCardId) {
      setCustomCards((currentCards) =>
        currentCards.map((card) =>
          card.id === editingCardId ? { ...card, ...updatedCard } : card
        )
      );

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
      ...updatedCard,
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
    const deckName = deckMode === 'new' ? newDeckName.trim() : selectedDeck.trim();
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

    setCustomCards((currentCards) => currentCards.filter((card) => card.id !== cardId));
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
    if (!practiceCards.length) {
      return;
    }

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
        <p className={styles.editingNotice}>Đang chỉnh sửa flashcard</p>
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
          Hủy chỉnh sửa
        </button>
      ) : null}
    </form>
  );

  if (screen === 'list') {
    return (
      <main className={styles.flashcardPage}>
        <section className={styles.deckSection}>
          <div className="container">
            <ModeTabs mode={mode} onModeChange={onModeChange} />
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
            <ModeTabs mode={mode} onModeChange={onModeChange} />
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
              ← Quay lại
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

const SystemFlashcardWorkspace = ({ mode, onModeChange }) => {
  const [decks, setDecks] = useState([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [decksError, setDecksError] = useState('');
  const [screen, setScreen] = useState('list');
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [deckCards, setDeckCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardsError, setCardsError] = useState('');
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    let cancelled = false;

    flashcardAPI
      .getSystemDecks()
      .then((data) => {
        if (!cancelled) setDecks(data || []);
      })
      .catch((err) => {
        if (!cancelled) setDecksError(err.message || 'Không thể tải danh sách bộ flashcard.');
      })
      .finally(() => {
        if (!cancelled) setLoadingDecks(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const resetPractice = () => {
    setPracticeIndex(0);
    setIsFlipped(false);
  };

  const openDeck = (deck) => {
    setSelectedDeck(deck);
    setScreen('deck');
    setCardsError('');
    setLoadingCards(true);
    resetPractice();

    flashcardAPI
      .getSystemDeckCards(deck.id)
      .then((data) => setDeckCards(data || []))
      .catch((err) => setCardsError(err.message || 'Không thể tải flashcard trong bộ này.'))
      .finally(() => setLoadingCards(false));
  };

  const openPractice = () => {
    setScreen('practice');
    resetPractice();
  };

  const goBackToList = () => {
    setScreen('list');
    setSelectedDeck(null);
    setDeckCards([]);
    resetPractice();
  };

  const goBackToDeck = () => {
    setScreen('deck');
    resetPractice();
  };

  const goToPracticeCard = (direction) => {
    if (!deckCards.length) return;

    setPracticeIndex((currentIndex) => {
      const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1 + deckCards.length;
      return nextIndex % deckCards.length;
    });
    setIsFlipped(false);
  };

  const practiceCard = deckCards[practiceIndex] || null;

  if (screen === 'practice') {
    return (
      <main className={styles.flashcardPage}>
        <section className={styles.practiceSection}>
          <div className="container">
            <button type="button" className={styles.backButton} onClick={goBackToDeck}>
              ← Quay lại
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

            {deckCards.length > 1 ? (
              <div className={styles.practiceActions}>
                <button type="button" onClick={() => goToPracticeCard('prev')}>
                  Trước
                </button>
                <span>
                  {practiceIndex + 1}/{deckCards.length}
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

  if (screen === 'deck' && selectedDeck) {
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
                <h1 className={styles.deckTitle}>{selectedDeck.name}</h1>
                <p className={styles.deckSubtitle}>{deckCards.length} từ trong bộ này</p>
              </div>

              <button type="button" className={styles.practiceButton} onClick={openPractice}>
                Luyện tập flashcards
              </button>
            </div>

            {cardsError ? <p className={styles.formError}>{cardsError}</p> : null}

            <div className={styles.wordList}>
              {loadingCards ? (
                <div className={styles.emptyState}>
                  <h2>Đang tải flashcard...</h2>
                </div>
              ) : (
                deckCards.map((card) => (
                  <article key={card.id} className={styles.wordItem}>
                    <div className={styles.wordItemHeader}>
                      <strong>{card.term}</strong>
                      <button type="button" onClick={() => speakText(card.term)}>
                        🔊
                      </button>
                    </div>

                    <p>
                      <b>Định nghĩa:</b>
                      {card.wordType ? (
                        <span className={styles.wordType}>({card.wordType})</span>
                      ) : null}
                      <span>{card.meaning}</span>
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.flashcardPage}>
      <section className={styles.deckSection}>
        <div className="container">
          <ModeTabs mode={mode} onModeChange={onModeChange} />
          <div className={styles.pageHeader}>
            <div>
              <p className={styles.pageKicker}>Flashcards</p>
              <h1 className={styles.deckTitle}>Bộ flashcard có sẵn</h1>
              <p className={styles.deckSubtitle}>Chọn một bộ để ôn tập từ vựng.</p>
            </div>

            <div className={styles.pageStats}>
              <span className={styles.statPill}>{decks.length} bộ thẻ</span>
            </div>
          </div>

          {decksError ? <p className={styles.formError}>{decksError}</p> : null}

          {loadingDecks ? (
            <div className={styles.emptyState}>
              <h2>Đang tải bộ flashcard...</h2>
            </div>
          ) : decks.length === 0 ? (
            <div className={styles.emptyState}>
              <h2>Chưa có bộ flashcard nào được thêm.</h2>
            </div>
          ) : (
            <div className={styles.deckGrid}>
              {decks.map((deck) => (
                <button
                  key={deck.id}
                  type="button"
                  className={styles.deckCard}
                  onClick={() => openDeck(deck)}
                >
                  <strong>{deck.name}</strong>
                  <span className={styles.deckCount}>▣ {deck.cardCount} từ</span>
                  {deck.level ? <span className={styles.deckAuthor}>{deck.level}</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

const Flashcard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const storageKey = useMemo(() => getFlashcardStorageKey(user), [user]);
  const nextIdKey = useMemo(() => getFlashcardNextIdKey(user), [user]);
  const [mode, setMode] = useState('mine');

  if (mode === 'system') {
    return <SystemFlashcardWorkspace mode={mode} onModeChange={setMode} />;
  }

  if (loading) {
    return (
      <main className={styles.flashcardPage}>
        <section className={styles.deckSection}>
          <div className="container">
            <ModeTabs mode={mode} onModeChange={setMode} />
            <div className={styles.emptyState}>
              <h2>Đang tải dữ liệu flashcard...</h2>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!user || !storageKey || !nextIdKey) {
    return (
      <main className={styles.flashcardPage}>
        <section className={styles.deckSection}>
          <div className="container">
            <ModeTabs mode={mode} onModeChange={setMode} />
            <div className={styles.pageHeader}>
              <div>
                <p className={styles.pageKicker}>Flashcards</p>
                <h1 className={styles.deckTitle}>Flashcard của riêng bạn</h1>
                <p className={styles.deckSubtitle}>
                  Đăng nhập để tạo bộ thẻ, lưu từ vựng và luyện tập theo tài khoản của bạn.
                </p>
              </div>
            </div>

            <div className={styles.emptyState}>
              <h2>Bạn chưa đăng nhập</h2>
              <button
                type="button"
                className={styles.practiceButton}
                onClick={() => navigate('/login')}
              >
                Đăng nhập
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <FlashcardWorkspace
      key={storageKey}
      user={user}
      storageKey={storageKey}
      nextIdKey={nextIdKey}
      mode={mode}
      onModeChange={setMode}
    />
  );
};

export default Flashcard;
