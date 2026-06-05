import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { dictionaryAPI } from '../services/dictionaryService';
import styles from './Dictionary.module.css';

const Dictionary = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialKeyword = searchParams.get('keyword')?.trim() || '';

  const [searchTerm, setSearchTerm] = useState(initialKeyword);
  const [wordData, setWordData] = useState(null);
  const [loading, setLoading] = useState(Boolean(initialKeyword));
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);

  const audioRef = useRef(null);

  const fetchWord = useCallback((keyword) => {
    const controller = new AbortController();

    const run = async () => {
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
        setLoading(false);
      }
    };

    run();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const keyword = searchParams.get('keyword')?.trim() || '';
    setSearchTerm(keyword);

    if (!keyword) {
      setLoading(false);
      setError('');
      setWordData(null);
      return undefined;
    }

    let cleanup = null;

    const timer = window.setTimeout(() => {
      cleanup = fetchWord(keyword);
    }, 180);

    return () => {
      window.clearTimeout(timer);

      if (cleanup) {
        cleanup();
      }
    };
  }, [fetchWord, searchParams]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();

    const keyword = searchTerm.trim();

    if (!keyword) return;

    setSearchParams({ keyword });
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
    setSearchParams({ keyword: synonym });
  };

const hasPronunciation = Boolean(wordData?.phonetic || wordData?.audioUrl);
const hasWordTypes = wordData?.wordTypes?.length > 0;
const hasWordForms = wordData?.wordForms?.length > 0;
const hasSynonyms = wordData?.synonyms?.length > 0;
const hasExample = Boolean(wordData?.example?.en || wordData?.example?.vi);
  

  return (
    <main className={styles.dictionaryPage}>
      <section className={styles.heroSection}>
        <div className="container">
          <div className={styles.searchShell}>
            <div className={styles.heroText}>
              <p className={styles.heroLabel}>Vocabulary Dictionary</p>
              <h1>Tra cứu từ vựng</h1>
              <p>
                Nhập một từ hoặc cụm từ tiếng Anh để xem nghĩa tiếng Việt,
                nghĩa tiếng Anh và phát âm.
              </p>
            </div>

            <form onSubmit={handleSearch} className={styles.searchForm}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ví dụ: improve, success, take care of..."
                className={styles.searchInput}
              />

              <button
                type="submit"
                className={styles.searchButton}
                disabled={loading}
              >
                {loading ? 'Đang tra...' : 'Tra từ'}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className={styles.contentSection}>
        <div className="container">
          {loading ? (
            <div className={styles.stateCard}>
              <div className={styles.spinner} />
              <h2>Đang tra cứu</h2>
              <p>Hệ thống đang kiểm tra dữ liệu từ vựng.</p>
            </div>
          ) : error ? (
            <div className={styles.stateCard}>
              <h2>Không tìm thấy kết quả</h2>
              <p>{error}</p>

              <button
                type="button"
                className={styles.retryButton}
                onClick={() => {
                  setSearchParams({});
                  setSearchTerm('');
                }}
              >
                Nhập lại
              </button>
            </div>
          ) : wordData ? (
            <article className={styles.resultCard}>
              
            <header className={styles.wordHeader}>
  <div className={styles.wordHeaderMain}>
    <span className={styles.wordLabel}>Từ đang tra</span>

    <div className={styles.wordTitleRow}>
      <h2 className={styles.wordTitle}>{wordData.word}</h2>

      {hasWordTypes ? (
        <div className={styles.wordTypeInline}>
          {wordData.wordTypes.map((type, index) => (
            <span
              key={`${type.label}-${index}`}
              className={styles.wordTypePill}
            >
              {type.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  </div>

  <div className={styles.actionGroup}>
    <button
      type="button"
      className={styles.secondaryButton}
      onClick={handleCopyWord}
    >
      {copied ? 'Đã copy' : 'Copy'}
    </button>

    {wordData.audioUrl ? (
      <button
        type="button"
        className={styles.primaryButton}
        onClick={handlePlayAudio}
      >
        {playingAudio ? 'Đang phát...' : 'Nghe phát âm'}
      </button>
    ) : null}
  </div>
</header>




              <section className={styles.requiredGrid}>
                <div className={styles.infoCard}>
                  <h3>Nghĩa tiếng Việt</h3>
                  <p className={styles.mainMeaning}>
                    {wordData.vietnameseMeaning}
                  </p>
                </div>

                <div className={styles.infoCard}>
                  <h3>Nghĩa tiếng Anh</h3>
                  <p>{wordData.englishMeaning}</p>
                </div>

                <div className={styles.infoCard}>
                  <h3>Phát âm</h3>

                  {hasPronunciation ? (
                    <div className={styles.pronunciationBox}>
                      {wordData.phonetic ? (
                        <span className={styles.phoneticText}>
                          {wordData.phonetic}
                        </span>
                      ) : null}

                      {wordData.audioUrl ? (
                        <button
                          type="button"
                          className={styles.audioButton}
                          onClick={handlePlayAudio}
                        >
                          {playingAudio ? 'Đang phát...' : 'Phát âm'}
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className={styles.emptyArea} />
                  )}
                </div>
              </section>


<section className={styles.wordFormsSection}>
  <div className={styles.wordFormsCard}>
    <h3>Word forms</h3>

    {hasWordForms ? (
      <ul className={styles.wordFormsList}>
        {wordData.wordForms.map((form, index) => (
          <li key={`${form.word}-${index}`} className={styles.wordFormItem}>
            <strong>{form.word}</strong>

            {form.code ? (
              <span className={styles.wordFormCode}> ({form.code})</span>
            ) : null}

            {form.vietnameseMeaning ? (
              <span className={styles.wordFormMeaning}>
                : {form.vietnameseMeaning}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    ) : (
      <div className={styles.emptyArea} />
    )}
  </div>
</section>



              <section className={styles.optionalSection}>
                <div className={styles.optionalCard}>
                  <h3>Từ đồng nghĩa</h3>

                  {hasSynonyms ? (
                    <div className={styles.chipGrid}>
                      {wordData.synonyms.slice(0, 16).map((synonym) => (
                        <button
                          key={synonym}
                          type="button"
                          className={styles.synonymChip}
                          onClick={() => handleSynonymClick(synonym)}
                        >
                          {synonym}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.emptyArea} />
                  )}
                </div>

                <div className={styles.optionalCard}>
                  <h3>Ví dụ minh hoạ</h3>

                  {hasExample ? (
                    <div className={styles.exampleBox}>
                      {wordData.example.en ? (
                        <p className={styles.exampleEn}>
                          “{wordData.example.en}”
                        </p>
                      ) : null}

                      {wordData.example.vi ? (
                        <p className={styles.exampleVi}>
                          {wordData.example.vi}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className={styles.emptyArea} />
                  )}
                </div>
              </section>
            </article>
          ) : (
            <div className={styles.emptyIntro}>
              <h2>Nhập từ bạn muốn tra cứu</h2>
              <p>
                Ví dụ: <strong>success</strong>, <strong>environment</strong>,{' '}
                <strong>look after</strong>.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default Dictionary;