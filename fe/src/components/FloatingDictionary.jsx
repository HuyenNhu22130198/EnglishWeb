import { useEffect, useRef, useState } from 'react';
import { dictionaryAPI } from '../services/dictionaryService';
import styles from './FloatingDictionary.module.css';

const FloatingDictionary = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [wordData, setWordData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);

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
    lookupWord(synonym);
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

      <div className={styles.sideDock}>
        <button
          type="button"
          className={styles.dictionaryTab}
          onClick={() => setIsOpen(true)}
          aria-label="Mở từ điển"
        >
          <span className={styles.bookIcon}>Aa</span>
          <span>Từ điển</span>
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
