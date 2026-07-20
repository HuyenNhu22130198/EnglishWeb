import { useEffect, useRef, useState } from 'react';
import { chatbotAPI } from '../services/chatbotService';
import { dictionaryAPI } from '../services/dictionaryService';
import styles from './FloatingDictionary.module.css';

const initialChatMessages = [
  {
    id: 'welcome',
    role: 'bot',
    text: 'Hãy copy câu hỏi trên đề bài, mình sẽ tìm đáp án và giải thích trong ngân hàng đề.',
  },
];

const faqItems = [
  {
    question: 'Lam sao de chatbot giai thich cau hoi trong de thi?',
    answer:
      'Mo tab Giai thich cau hoi, copy nguyen cau hoi trong de TOEIC hoac IELTS roi gui. He thong se doi chieu voi ngan hang de va tra dap an kem giai thich neu tim thay.',
  },
  {
    question: 'Chatbot co cham bai Writing hoac Speaking khong?',
    answer:
      'Hien tai chatbot tap trung tra cuu dap an va giai thich cau hoi co san trong ngan hang de. Writing va Speaking se can module rieng de goi y bai mau, y tuong hoac luyen phat am.',
  },
  {
    question: 'Vi sao chatbot khong tim thay cau hoi?',
    answer:
      'Ban nen copy sat noi dung cau hoi trong de. Neu chi nhap vai tu khoa qua chung chung, he thong co the khong du du lieu de xac dinh dung cau hoi.',
  },
  {
    question: 'Toi co the dung chatbot o trang nao?',
    answer:
      'Co the mo chatbot o moi trang bang thanh cong cu noi ben phai. Khi dang lam de, ban co the copy cau hoi va dan vao tab Giai thich cau hoi.',
  },
];

const formatPercent = (value) => {
  if (typeof value !== 'number') {
    return '';
  }

  return `${Math.round(value * 100)}%`;
};

const formatAnswerValue = (answer) => {
  if (!answer) {
    return '';
  }

  return [answer.key, answer.text].filter(Boolean).join(' - ');
};

const FloatingDictionary = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [wordData, setWordData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [activeChatTab, setActiveChatTab] = useState('faq');
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState(initialChatMessages);
  const [chatLoading, setChatLoading] = useState(false);

  const audioRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const lookupWord = async (keyword) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError('');
      setCopied(false);

      const data = await dictionaryAPI.lookupWord(keyword, controller.signal);
      setWordData(data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setWordData(null);
        setError(err.message || 'Không thể tải dữ liệu từ điển.');
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }

      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();

    const keyword = searchTerm.trim();

    if (!keyword) return;

    setIsOpen(true);
    setIsChatOpen(false);
    lookupWord(keyword);
  };

  const handlePlayAudio = () => {
    if (!wordData?.audioUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(wordData.audioUrl);
    audioRef.current = audio;

    setPlayingAudio(true);

    audio.onended = () => setPlayingAudio(false);
    audio.onerror = () => setPlayingAudio(false);

    audio.play().catch(() => {
      setPlayingAudio(false);
    });
  };

  const handleCopyWord = async () => {
    if (!wordData?.word) return;

    try {
      await navigator.clipboard.writeText(wordData.word);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch {
      setCopied(false);
    }
  };

  const handleSynonymClick = (synonym) => {
    setSearchTerm(synonym);
    setIsOpen(true);
    setIsChatOpen(false);
    lookupWord(synonym);
  };

  const openDictionary = () => {
    setIsOpen(true);
    setIsChatOpen(false);
  };

  const openChatbot = () => {
    setIsChatOpen(true);
    setIsOpen(false);
  };

  const clearChat = () => {
    setChatMessages(initialChatMessages);
    setChatMessage('');
  };

  const handleChatSubmit = async (event) => {
    event.preventDefault();

    const trimmedMessage = chatMessage.trim();

    if (!trimmedMessage || chatLoading) {
      return;
    }

    setChatMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text: trimmedMessage,
      },
    ]);
    setChatMessage('');
    setChatLoading(true);

    try {
      const response = await chatbotAPI.ask(trimmedMessage);
      const data = response?.data;

      setChatMessages((current) => [
        ...current,
        {
          id: `bot-${Date.now()}`,
          role: 'bot',
          text: data?.message || response?.message || 'Đã nhận câu hỏi.',
          result: data,
        },
      ]);
    } catch (err) {
      setChatMessages((current) => [
        ...current,
        {
          id: `bot-error-${Date.now()}`,
          role: 'bot',
          text: err.message || 'Không thể tra cứu câu hỏi lúc này.',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const hasPronunciation = Boolean(wordData?.phonetic || wordData?.audioUrl);
  const hasWordTypes = wordData?.wordTypes?.length > 0;
  const hasWordForms = wordData?.wordForms?.length > 0;
  const hasSynonyms = wordData?.synonyms?.length > 0;
  const hasExample = Boolean(wordData?.example?.en || wordData?.example?.vi);

  return (
    <div className={styles.floatingDictionary}>
      {isOpen ? (
        <aside className={styles.panel} aria-label="Từ điển">
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelKicker}>Anh-Việt</p>
              <h2>Dictionary</h2>
            </div>

            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              aria-label="Đóng từ điển"
            >
              x
            </button>
          </div>

          <form onSubmit={handleSearch} className={styles.searchForm}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nhập từ cần tra"
              className={styles.searchInput}
            />

            <button type="submit" className={styles.searchButton} disabled={loading}>
              {loading ? 'Đang tra...' : 'Tra từ'}
            </button>
          </form>

          <div className={styles.panelBody}>
            {loading ? (
              <div className={styles.stateBox}>
                <div className={styles.spinner} />
                <p>Đang tra cứu...</p>
              </div>
            ) : error ? (
              <div className={styles.stateBox}>
                <h3>Không tìm thấy kết quả</h3>
                <p>{error}</p>
              </div>
            ) : wordData ? (
              <article className={styles.result}>
                <header className={styles.wordHeader}>
                  <div className={styles.wordMain}>
                    <span>Từ đang tra</span>
                    <h3>{wordData.word}</h3>

                    {hasWordTypes ? (
                      <div className={styles.wordTypes}>
                        {wordData.wordTypes.map((type, index) => (
                          <span key={`${type.label}-${index}`}>{type.label}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.actions}>
                    <button type="button" onClick={handleCopyWord}>
                      {copied ? 'Đã copy' : 'Copy'}
                    </button>

                    {wordData.audioUrl ? (
                      <button type="button" onClick={handlePlayAudio}>
                        {playingAudio ? 'Đang phát...' : 'Nghe'}
                      </button>
                    ) : null}
                  </div>
                </header>

                <section className={styles.infoStack}>
                  <div className={styles.infoBlock}>
                    <h4>Nghĩa tiếng Việt</h4>
                    <p className={styles.mainMeaning}>{wordData.vietnameseMeaning}</p>
                  </div>

                  <div className={styles.infoBlock}>
                    <h4>Nghĩa tiếng Anh</h4>
                    <p>{wordData.englishMeaning}</p>
                  </div>

                  <div className={styles.infoBlock}>
                    <h4>Phát âm</h4>

                    {hasPronunciation ? (
                      <div className={styles.pronunciation}>
                        {wordData.phonetic ? <span>{wordData.phonetic}</span> : null}

                        {wordData.audioUrl ? (
                          <button type="button" onClick={handlePlayAudio}>
                            {playingAudio ? 'Đang phát...' : 'Phát âm'}
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <p className={styles.muted}>Chưa có dữ liệu.</p>
                    )}
                  </div>

                  <div className={styles.infoBlock}>
                    <h4>Word forms</h4>

                    {hasWordForms ? (
                      <ul className={styles.wordForms}>
                        {wordData.wordForms.map((form, index) => (
                          <li key={`${form.word}-${index}`}>
                            <strong>{form.word}</strong>
                            {form.code ? <span> ({form.code})</span> : null}
                            {form.vietnameseMeaning ? (
                              <em>: {form.vietnameseMeaning}</em>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.muted}>Chưa có dữ liệu.</p>
                    )}
                  </div>

                  <div className={styles.infoBlock}>
                    <h4>Từ đồng nghĩa</h4>

                    {hasSynonyms ? (
                      <div className={styles.chips}>
                        {wordData.synonyms.slice(0, 16).map((synonym) => (
                          <button
                            key={synonym}
                            type="button"
                            onClick={() => handleSynonymClick(synonym)}
                          >
                            {synonym}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.muted}>Chưa có dữ liệu.</p>
                    )}
                  </div>

                  <div className={styles.infoBlock}>
                    <h4>Ví dụ minh họa</h4>

                    {hasExample ? (
                      <div className={styles.example}>
                        {wordData.example.en ? <p>{wordData.example.en}</p> : null}
                        {wordData.example.vi ? <span>{wordData.example.vi}</span> : null}
                      </div>
                    ) : (
                      <p className={styles.muted}>Chưa có dữ liệu.</p>
                    )}
                  </div>
                </section>
              </article>
            ) : (
              <div className={styles.stateBox}>
                <h3>Nhập từ bạn muốn tra cứu</h3>
                <p>Ví dụ: success, environment, look after.</p>
              </div>
            )}
          </div>
        </aside>
      ) : null}

      {isChatOpen ? (
        <aside className={`${styles.panel} ${styles.chatPanel}`} aria-label="Chatbot">
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelKicker}>TOEIC / IELTS</p>
              <h2>Chatbot</h2>
            </div>

            <div className={styles.panelActions}>
              <button
                type="button"
                className={styles.toolButton}
                onClick={clearChat}
                aria-label="Làm mới hội thoại"
              >
                ↻
              </button>

              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setIsChatOpen(false)}
                aria-label="Đóng chatbot"
              >
                x
              </button>
            </div>
          </div>

          <div className={styles.chatTabs} role="tablist" aria-label="Chatbot tabs">
            <button
              type="button"
              className={activeChatTab === 'faq' ? styles.activeChatTab : ''}
              onClick={() => setActiveChatTab('faq')}
              role="tab"
              aria-selected={activeChatTab === 'faq'}
            >
              Cau hoi thuong gap
            </button>

            <button
              type="button"
              className={activeChatTab === 'explain' ? styles.activeChatTab : ''}
              onClick={() => setActiveChatTab('explain')}
              role="tab"
              aria-selected={activeChatTab === 'explain'}
            >
              Giai thich cau hoi
            </button>
          </div>

          {activeChatTab === 'faq' ? (
            <div className={styles.faqList}>
              {faqItems.map((item) => (
                <article className={styles.faqItem} key={item.question}>
                  <h3>{item.question}</h3>
                  <p>{item.answer}</p>
                </article>
              ))}
            </div>
          ) : null}

          <div
            className={`${styles.chatMessages} ${
              activeChatTab === 'explain' ? '' : styles.hiddenPanel
            }`}
          >
            {chatMessages.map((item) => (
              <article
                key={item.id}
                className={`${styles.chatMessage} ${
                  item.role === 'user' ? styles.userMessage : styles.botMessage
                }`}
              >
                <p>{item.text}</p>

                {item.result?.found ? (
                  <div className={styles.answerCard}>
                    <div className={styles.metaRow}>
                      <span>{item.result.examType}</span>
                      <span>{item.result.examCode}</span>
                      {item.result.skill ? <span>{item.result.skill}</span> : null}
                      {item.result.partNo ? <span>Part {item.result.partNo}</span> : null}
                      {item.result.matchScore ? (
                        <span>Match {formatPercent(item.result.matchScore)}</span>
                      ) : null}
                    </div>

                    <h3>Câu {item.result.questionNo || item.result.questionId}</h3>

                    {item.result.questionText ? (
                      <p className={styles.questionText}>{item.result.questionText}</p>
                    ) : null}

                    <div className={styles.answerLine}>
                      <strong>Đáp án:</strong>
                      {item.result.answers?.length ? (
                        <div className={styles.answerValues}>
                          {item.result.answers.map((answer, index) => (
                            <span key={`${item.id}-answer-${answer.key || answer.text || index}`}>
                              {formatAnswerValue(answer)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span>
                          {[item.result.answer, item.result.answerText]
                            .filter(Boolean)
                            .join(' - ')}
                        </span>
                      )}
                    </div>

                    {item.result.options?.length ? (
                      <ul className={styles.optionList}>
                        {item.result.options.map((option) => (
                          <li
                            key={`${item.id}-${option.label}`}
                            className={option.correct ? styles.correctOption : ''}
                          >
                            <strong>{option.label}.</strong> {option.text}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {item.result.explanation ? (
                      <div className={styles.detailBlock}>
                        <strong>Giải thích</strong>
                        <p>{item.result.explanation}</p>
                      </div>
                    ) : null}

                    {item.result.transcriptText ? (
                      <div className={styles.detailBlock}>
                        <strong>Transcript</strong>
                        <p>{item.result.transcriptText}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}

            {chatLoading ? (
              <div className={`${styles.chatMessage} ${styles.botMessage}`}>
                <p>Đang tìm trong ngân hàng câu hỏi...</p>
              </div>
            ) : null}
          </div>

          <form
            className={`${styles.chatForm} ${
              activeChatTab === 'explain' ? '' : styles.hiddenPanel
            }`}
            onSubmit={handleChatSubmit}
          >
            <textarea
              value={chatMessage}
              onChange={(event) => setChatMessage(event.target.value)}
              placeholder="Paste câu hỏi cần hỏi..."
              rows={3}
            />
            <button type="submit" disabled={chatLoading || !chatMessage.trim()}>
              Gửi
            </button>
          </form>
        </aside>
      ) : null}

      <div className={styles.sideDock}>
        <button
          type="button"
          className={styles.dictionaryTab}
          onClick={openDictionary}
          aria-label="Mở từ điển"
        >
          <span className={styles.bookIcon}>Aa</span>
          <span>Từ điển</span>
        </button>

        <button
          type="button"
          className={styles.dictionaryTab}
          onClick={openChatbot}
          aria-label="Mở chatbot"
        >
          <span className={styles.chatIcon}>?</span>
          <span>Chatbot</span>
        </button>

        <button
          type="button"
          className={styles.topButton}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Lên đầu trang"
        >
          ^
        </button>
      </div>
    </div>
  );
};

export default FloatingDictionary;
