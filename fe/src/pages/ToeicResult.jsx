import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toeicAPI } from '../services/toeicService';
import styles from './ToeicResult.module.css';

const normalizeText = (value) => (value || '').replace(/\r\n/g, '\n').trim();

const stripMarker = (line) =>
  line
    .replace(
      /^(english|script(?:\s+english)?|transcript|vietnamese|translation|dich(?:\s+nghia)?|dịch(?:\s+nghĩa)?|tieng viet|tiếng việt|viet(?:namese)?|bản dịch)\s*[:：-]\s*/i,
      ''
    )
    .trim();

const parseTranscriptText = (rawText) => {
  const text = normalizeText(rawText);

  if (!text) {
    return { english: '', vietnamese: '' };
  }

  const lines = text.split('\n');
  const englishLines = [];
  const vietnameseLines = [];
  let mode = null;
  let hasExplicitMarkers = false;

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      if (mode === 'english') {
        englishLines.push('');
      } else if (mode === 'vietnamese') {
        vietnameseLines.push('');
      }
      return;
    }

    if (/^(english|script(?:\s+english)?|transcript)\s*[:：-]/i.test(trimmed)) {
      mode = 'english';
      hasExplicitMarkers = true;
      const content = stripMarker(trimmed);
      if (content) englishLines.push(content);
      return;
    }

    if (
      /^(vietnamese|translation|dich(?:\s+nghia)?|dịch(?:\s+nghĩa)?|tieng viet|tiếng việt|viet(?:namese)?|bản dịch)\s*[:：-]/i.test(
        trimmed
      )
    ) {
      mode = 'vietnamese';
      hasExplicitMarkers = true;
      const content = stripMarker(trimmed);
      if (content) vietnameseLines.push(content);
      return;
    }

    if (mode === 'vietnamese') {
      vietnameseLines.push(trimmed);
      return;
    }

    if (mode === 'english') {
      englishLines.push(trimmed);
      return;
    }

    englishLines.push(trimmed);
  });

  if (hasExplicitMarkers) {
    return {
      english: englishLines.join('\n').trim(),
      vietnamese: vietnameseLines.join('\n').trim(),
    };
  }

  const paragraphs = text
    .split(/\n\s*\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (paragraphs.length >= 2) {
    return {
      english: paragraphs[0],
      vietnamese: paragraphs.slice(1).join('\n\n'),
    };
  }

  return { english: text, vietnamese: '' };
};

const renderParagraphs = (value) => {
  const text = normalizeText(value);

  if (!text) {
    return <span className={styles.mutedText}>Chưa có nội dung.</span>;
  }

  return text.split(/\n+/).map((paragraph, index) => (
    <p key={`${paragraph.slice(0, 12)}-${index}`}>{paragraph}</p>
  ));
};

const partHasSharedTranscript = (partNo) => [3, 4].includes(Number(partNo));
const partHasSharedPassage = (partNo) => [6, 7].includes(Number(partNo));
const partHidesQuestionText = (partNo) => [1, 2, 6].includes(Number(partNo));

const buildQuestionGroups = (questions) => {
  const partBuckets = new Map();

  questions.forEach((question) => {
    const partNo = Number(question.partNo);
    const partKey = String(partNo);

    if (!partBuckets.has(partKey)) {
      partBuckets.set(partKey, []);
    }

    const bucket = partBuckets.get(partKey);
    const sharedSeed = normalizeText(
      question.sharedText || question.groupTitle || question.transcriptText || ''
    );
    const shouldMergeBySharedText = partHasSharedTranscript(partNo) || partHasSharedPassage(partNo);
    const groupKey = shouldMergeBySharedText && sharedSeed
      ? `${partKey}:${sharedSeed}`
      : `${partKey}:${question.questionId}`;

    let group = bucket[bucket.length - 1];

    if (!group || group.groupKey !== groupKey) {
      group = {
        groupKey,
        partNo,
        groupTitle: question.groupTitle || `Part ${partNo}`,
        sharedText: question.sharedText || '',
        transcript: parseTranscriptText(question.transcriptText),
        questions: [],
      };
      bucket.push(group);
    }

    if (!group.sharedText && question.sharedText) {
      group.sharedText = question.sharedText;
    }

    if (!group.transcript.english && !group.transcript.vietnamese) {
      group.transcript = parseTranscriptText(question.transcriptText);
    }

    group.questions.push(question);
  });

  return Array.from(partBuckets.entries())
    .map(([partNo, groups]) => ({
      partNo: Number(partNo),
      groups,
    }))
    .sort((a, b) => a.partNo - b.partNo);
};

const ToeicResult = () => {
  const { attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [result, setResult] = useState(location.state?.result || null);
  const [loading, setLoading] = useState(!location.state?.result);
  const [error, setError] = useState('');
  const [listeningAudioUrl, setListeningAudioUrl] = useState('');
  const [showAllSolutions, setShowAllSolutions] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState(() => new Set());

  const clearPracticeAudioMarkers = () => {
    if (typeof window === 'undefined' || !result?.examId) {
      return;
    }

    window.localStorage.removeItem(`toeic-practice-audio-markers:${result.examId}`);
  };

  const handleBackToExamList = () => {
    clearPracticeAudioMarkers();
    navigate('/exams/toeic');
  };

  const handleRedoExam = () => {
    clearPracticeAudioMarkers();
    navigate(`/practice/toeic/${result.examId}`);
  };

  const fetchResult = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await toeicAPI.getToeicResult(attemptId);

      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.message || 'Không thể tải kết quả bài thi');
      }
    } catch (err) {
      setError(err.message || 'Lỗi kết nối đến server');
      console.error('Fetch TOEIC result error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!result) {
      fetchResult();
    }
  }, [attemptId]);

  useEffect(() => {
    const loadAudio = async () => {
      if (!result?.examId) {
        return;
      }

      try {
        const response = await toeicAPI.getToeicPractice(result.examId);

        if (response.success) {
          setListeningAudioUrl(response.data?.listeningAudioUrl || '');
        }
      } catch (err) {
        console.error('Fetch TOEIC practice meta error:', err);
      }
    };

    loadAudio();
  }, [result?.examId]);

  const detailedQuestions = useMemo(() => {
    if (!result?.questionResults) return [];

    return result.questionResults.map((question) => ({
      ...question,
      transcript: parseTranscriptText(question.transcriptText),
      options: question.options || [],
      isListening: Number(question.partNo) >= 1 && Number(question.partNo) <= 4,
    }));
  }, [result]);

  const groupedParts = useMemo(() => buildQuestionGroups(detailedQuestions), [detailedQuestions]);

  const allQuestions = useMemo(
    () => detailedQuestions,
    [detailedQuestions]
  );

  const wrongQuestions = useMemo(() => allQuestions.filter((q) => !q.isCorrect), [allQuestions]);

  const handleScrollToQuestion = (questionId) => {
    const element = document.getElementById(`question-${questionId}`);

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  const toggleQuestion = (questionId) => {
    if (showAllSolutions) {
      return;
    }

    setExpandedQuestions((prev) => {
      const next = new Set(prev);

      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }

      return next;
    });
  };

  const toggleShowAll = () => {
    setShowAllSolutions((prev) => {
      const next = !prev;

      if (!next) {
        setExpandedQuestions(new Set());
      }

      return next;
    });
  };

  const isOpen = (questionId) => showAllSolutions || expandedQuestions.has(questionId);

  const renderTranscriptPlain = (transcript) => {
    const english = normalizeText(transcript?.english);
    const vietnamese = normalizeText(transcript?.vietnamese);

    if (!english && !vietnamese) {
      return <span className={styles.mutedText}>Chưa có script.</span>;
    }

    return (
      <div className={styles.transcriptStack}>
        {english && <div className={styles.transcriptPlain}>{renderParagraphs(english)}</div>}
        {vietnamese && <div className={styles.transcriptPlain}>{renderParagraphs(vietnamese)}</div>}
      </div>
    );
  };

  const renderOptionList = (question) => {
    if (!question.options?.length) {
      return null;
    }

    return (
      <div className={styles.optionList}>
        {question.options.map((option) => (
          <div key={`${question.questionId}-${option.optionLabel}`} className={styles.optionItem}>
            <span className={styles.optionLabel}>{option.optionLabel}</span>
            <span className={styles.optionText}>{option.optionText || '—'}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderQuestionBody = (question, partNo) => {
    const hideQuestionText = partHidesQuestionText(partNo);

    return (
      <>
        {[1, 2].includes(Number(partNo)) && (
          <div className={styles.transcriptBlock}>{renderTranscriptPlain(question.transcript)}</div>
        )}

        {!hideQuestionText && question.questionText && (
          <div className={styles.detailPanel}>
            <span className={styles.detailPanelLabel}>Câu hỏi</span>
            <div className={styles.transcriptContent}>{renderParagraphs(question.questionText)}</div>
          </div>
        )}

        {renderOptionList(question)}

        <div className={styles.detailPanel}>
          <span className={styles.detailPanelLabel}>Giải thích</span>
          <div className={styles.transcriptContent}>{renderParagraphs(question.explanation)}</div>
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <main className={styles.resultPage}>
        <div className={styles.emptyState}>
          <h2>Đang tải kết quả...</h2>
          <p>Vui lòng chờ trong giây lát.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.resultPage}>
        <div className={styles.emptyState}>
          <h2>Không thể tải kết quả</h2>
          <p>{error}</p>
          <button type="button" onClick={fetchResult}>
            Thử lại
          </button>
        </div>
      </main>
    );
  }

  if (!result) {
    return (
      <main className={styles.resultPage}>
        <div className={styles.emptyState}>
          <h2>Không có dữ liệu kết quả</h2>
          <p>Vui lòng nộp bài lại hoặc kiểm tra backend.</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.resultPage}>
      <section className={styles.heroResult}>
        <div>
          <span className={styles.eyebrow}>Kết quả TOEIC</span>
          <h1>{result.examName}</h1>
          <p>
            Bạn đã hoàn thành bài thi. 
          </p>
        </div>

        <div className={styles.totalScoreCard}>
          <span>Tổng điểm</span>
          <strong>{result.totalScore}</strong>
          <small>/ 990</small>
        </div>
      </section>

      <section className={styles.scoreGrid}>
        <article className={styles.scoreCard}>
          <span>Listening</span>
          <strong>{result.listeningScore}</strong>
          <p>{result.listeningCorrect}/100 câu đúng</p>
        </article>

        <article className={styles.scoreCard}>
          <span>Reading</span>
          <strong>{result.readingScore}</strong>
          <p>{result.readingCorrect}/100 câu đúng</p>
        </article>

        <article className={styles.scoreCard}>
          <span>Tổng câu đúng</span>
          <strong>{result.correctCount}</strong>
          <p>{result.correctCount}/{result.totalQuestions} câu</p>
        </article>

        <article className={styles.scoreCard}>
          <span>Sai câu</span>
          <strong>{wrongQuestions.length}</strong>
          <p>Các câu cần xem lại</p>
        </article>
      </section>

      <section className={styles.audioDock}>
        <div className={styles.audioDockInner}>
          <div className={styles.audioPlayerWrap}>
            {listeningAudioUrl ? (
              <audio controls src={listeningAudioUrl} className={styles.audioPlayer}>
                Trình duyệt của bạn không hỗ trợ audio.
              </audio>
            ) : (
              <p>Chưa có audio cho đề này.</p>
            )}
          </div>
        </div>
      </section>

      <section className={styles.contentLayout}>
        <aside className={styles.questionNavigator}>
          <div className={styles.navigatorHeader}>
            <h3>Đi nhanh</h3>
            <p>Chạm vào số câu để nhảy đến phần lời giải tương ứng.</p>
          </div>

          {groupedParts.map((part) => (
            <div key={part.partNo} className={styles.partNavBlock}>
              <button
                type="button"
                className={styles.partNavTitle}
                onClick={() => {
                  const firstQuestion = part.groups[0]?.questions[0];
                  if (firstQuestion) handleScrollToQuestion(firstQuestion.questionId);
                }}
              >
                PART {part.partNo}
              </button>

              <div className={styles.numberGrid}>
                {part.groups.flatMap((group) =>
                  group.questions.map((question) => (
                    <button
                      key={question.questionId}
                      type="button"
                      className={`${styles.numberButton} ${
                        question.isCorrect ? styles.correctNumber : styles.wrongNumber
                      }`}
                      onClick={() => handleScrollToQuestion(question.questionId)}
                    >
                      {question.questionNo}
                    </button>
                  ))
                )}
              </div>
            </div>
          ))}
        </aside>

        <section className={styles.contentArea}>
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Lời giải chi tiết</h2>
                <p>Chọn để mở toàn bộ lời giải.</p>
              </div>

              <button type="button" className={styles.showAllButton} onClick={toggleShowAll}>
                {showAllSolutions ? 'Ẩn toàn bộ lời giải' : 'Hiển thị toàn bộ lời giải'}
              </button>
            </div>
          </section>

          {groupedParts.map((part) => (
            <section key={part.partNo} className={styles.partSection}>
              <div className={styles.partHeader}>
                <h2>PART {part.partNo}</h2>
              </div>

              <div className={styles.partGroups}>
                {part.groups.map((group) => {
                  const showSharedTranscript = partHasSharedTranscript(part.partNo);
                  const showSharedPassage = partHasSharedPassage(part.partNo);
                  const groupStart = group.questions[0]?.questionNo;
                  const groupEnd = group.questions[group.questions.length - 1]?.questionNo;
                  const groupLabel =
                    group.questions.length > 1 && groupStart !== groupEnd
                      ? `Cụm câu ${groupStart}-${groupEnd}`
                      : `Câu ${groupStart}`;

                  return (
                    <article key={group.groupKey} className={styles.groupCard}>
                      {(showSharedTranscript || showSharedPassage) && (
                        <div className={styles.groupPassage}>
                          {showSharedTranscript && renderTranscriptPlain(group.transcript)}
                          {showSharedPassage && renderParagraphs(group.sharedText)}
                        </div>
                      )}

                      <div className={styles.groupMeta}>
                        <h3>{groupLabel}</h3>
                        <span>{group.groupTitle}</span>
                      </div>

                      <div className={styles.questionList}>
                        {group.questions.map((question) => (
                          <details
                            key={question.questionId}
                            id={`question-${question.questionId}`}
                            className={`${styles.questionCard} ${
                              question.isCorrect ? styles.correctCard : styles.wrongCard
                            }`}
                            open={isOpen(question.questionId)}
                          >
                            <summary
                              className={styles.questionSummary}
                              onClick={(e) => {
                                if (showAllSolutions) {
                                  return;
                                }

                                e.preventDefault();
                                toggleQuestion(question.questionId);
                              }}
                            >
                              <div className={styles.questionSummaryLeft}>
                                <span className={styles.questionIndex}>Câu {question.questionNo}</span>
                                <div className={styles.summaryMeta}>
                                  <span className={styles.partBadge}>Part {question.partNo}</span>
                                  <span
                                    className={
                                      question.isCorrect ? styles.correctBadge : styles.wrongBadge
                                    }
                                  >
                                    {question.isCorrect ? 'Đúng' : 'Sai'}
                                  </span>
                                </div>
                              </div>

                              <div className={styles.summaryRight}>
                                <span>Nhấn để mở lời giải</span>
                              </div>
                            </summary>

                            <div className={styles.solutionBody}>{renderQuestionBody(question, part.partNo)}</div>
                          </details>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </section>
      </section>

      <div className={styles.actions}>
        <button type="button" onClick={handleBackToExamList}>
          Quay lại kho đề
        </button>

        <button
          type="button"
          className={styles.secondaryButton}
          onClick={handleRedoExam}
        >
          Làm lại đề này
        </button>
      </div>
    </main>
  );
};

export default ToeicResult;
