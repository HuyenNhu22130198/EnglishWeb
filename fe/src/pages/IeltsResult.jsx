import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ieltsAPI } from '../services/ieltsService';
import styles from './IeltsResult.module.css';

const formatElapsedTime = (totalSeconds) => {
  if (totalSeconds == null || Number.isNaN(Number(totalSeconds))) {
    return '--:--';
  }

  const minutes = Math.floor(Number(totalSeconds) / 60);
  const seconds = Number(totalSeconds) % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const formatBand = (value) => {
  if (value == null || value === '') {
    return '0.0';
  }

  return Number(value).toFixed(1);
};

const getSkillLabel = (skill) => (String(skill || '').toUpperCase() === 'READING' ? 'Reading' : 'Listening');

const getPartLabel = (partNo, skill) =>
  String(skill || '').toUpperCase() === 'READING' ? `Reading Passage ${partNo}` : `Section ${partNo}`;

const getAnswerText = (question) =>
  question.selectedOptionKey || question.selectedAnswerText || 'Chưa trả lời';

const getCorrectAnswerText = (question) =>
  (question.correctAnswers || [])
    .map((answer) => answer.answerKey || answer.answerText)
    .filter(Boolean)
    .join(', ') || 'Không có';

const groupQuestionsByPart = (questions = []) => {
  const grouped = new Map();

  questions.forEach((question) => {
    const partNo = question.partNo || 0;
    const current = grouped.get(partNo) || [];
    grouped.set(partNo, [...current, question]);
  });

  return Array.from(grouped.entries())
    .map(([partNo, partQuestions]) => ({
      partNo,
      questions: partQuestions.sort((first, second) => Number(first.questionNo) - Number(second.questionNo)),
    }))
    .sort((first, second) => Number(first.partNo) - Number(second.partNo));
};

const IeltsResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { attemptId } = useParams();
  const [result, setResult] = useState(location.state?.result || null);
  const [loading, setLoading] = useState(!location.state?.result);
  const [error, setError] = useState('');
  const [showAllSolutions, setShowAllSolutions] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState(() => new Set());

  const fetchResult = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await ieltsAPI.getIeltsResult(attemptId);

      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.message || 'Không thể tải kết quả IELTS');
      }
    } catch (err) {
      setError(err.message || 'Lỗi kết nối đến server');
      console.error('Fetch IELTS result error:', err);
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
    if (!loading && result && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [attemptId, loading, result]);

  const questions = useMemo(() => result?.questionResults || [], [result]);
  const groupedParts = useMemo(() => groupQuestionsByPart(questions), [questions]);
  const wrongQuestions = useMemo(() => questions.filter((question) => !question.isCorrect), [questions]);
  const elapsedTimeText = formatElapsedTime(result?.elapsedSeconds ?? location.state?.elapsedSeconds);

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

  const isOpen = (questionId) => showAllSolutions || expandedQuestions.has(questionId);

  const handleScrollToQuestion = (questionId) => {
    document.getElementById(`ielts-result-question-${questionId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  if (loading) {
    return (
      <main className={styles.resultPage}>
        <section className={styles.emptyState}>
          <h2>Đang tải kết quả IELTS...</h2>
          <p>Vui lòng chờ trong giây lát.</p>
        </section>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className={styles.resultPage}>
        <section className={styles.emptyState}>
          <h2>Không thể tải kết quả IELTS</h2>
          <p>{error || 'Kết quả không tồn tại hoặc bạn không có quyền truy cập.'}</p>
          <button type="button" onClick={fetchResult}>
            Thử lại
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.resultPage}>
      <section className={styles.heroResult}>
        <div className={styles.heroResultContent}>
          <span className={styles.eyebrow}>Kết quả IELTS {getSkillLabel(result.skill)}</span>
          <h1>{result.examName}</h1>
          <p>
            Band được quy đổi theo số câu đúng trên thang IELTS Listening/Reading tham khảo từ ZIM.
          </p>

          <div className={styles.actions}>
            <button type="button" onClick={() => navigate('/exams/ielts')}>
              Quay lại kho đề
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => navigate(`/practice/ielts/${result.examId}?skill=${result.skill}`)}
            >
              Làm lại đề này
            </button>
          </div>
        </div>

        <div className={styles.totalScoreCard}>
          <span>Band ước tính</span>
          <strong>{formatBand(result.bandScore)}</strong>
          <small>{result.correctCount}/{result.totalQuestions} câu đúng</small>
        </div>
      </section>

      <section className={styles.scoreGrid}>
        <article className={styles.scoreCard}>
          <span>Kỹ năng</span>
          <strong>{getSkillLabel(result.skill)}</strong>
          <p>{result.totalQuestions} câu</p>
        </article>
        <article className={styles.scoreCard}>
          <span>Đã trả lời</span>
          <strong>{result.answeredCount}</strong>
          <p>{result.answeredCount}/{result.totalQuestions} câu</p>
        </article>
        <article className={styles.scoreCard}>
          <span>Số câu đúng</span>
          <strong>{result.correctCount}</strong>
          <p>Quy đổi band {formatBand(result.bandScore)}</p>
        </article>
        <article className={styles.scoreCard}>
          <span>Câu cần xem lại</span>
          <strong>{wrongQuestions.length}</strong>
          <p>Các câu sai hoặc bỏ trống</p>
        </article>
        <article className={styles.scoreCard}>
          <span>Thời gian làm bài</span>
          <strong>{elapsedTimeText}</strong>
          <p>Đếm từ lúc mở đề</p>
        </article>
      </section>

      <section className={styles.contentLayout}>
        <aside className={styles.questionNavigator}>
          <div className={styles.navigatorHeader}>
            <h3>Bảng câu hỏi</h3>
            <button
              type="button"
              className={styles.showAllButton}
              onClick={() => {
                setShowAllSolutions((prev) => !prev);
                setExpandedQuestions(new Set());
              }}
            >
              {showAllSolutions ? 'Ẩn toàn bộ lời giải' : 'Hiển thị toàn bộ lời giải'}
            </button>
          </div>

          {groupedParts.map((part) => (
            <div key={part.partNo} className={styles.partNavBlock}>
              <button
                type="button"
                className={styles.partNavTitle}
                onClick={() => handleScrollToQuestion(part.questions[0]?.questionId)}
              >
                {getPartLabel(part.partNo, result.skill)}
              </button>
              <div className={styles.numberGrid}>
                {part.questions.map((question) => (
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
                ))}
              </div>
            </div>
          ))}
        </aside>

        <section className={styles.contentArea}>
          {groupedParts.map((part) => (
            <section key={part.partNo} className={styles.partSection}>
              <div className={styles.partHeader}>
                <h2>{getPartLabel(part.partNo, result.skill)}</h2>
              </div>

              <div className={styles.questionList}>
                {part.questions.map((question) => (
                  <details
                    key={question.questionId}
                    id={`ielts-result-question-${question.questionId}`}
                    className={`${styles.questionCard} ${
                      question.isCorrect ? styles.correctCard : styles.wrongCard
                    }`}
                    open={isOpen(question.questionId)}
                  >
                    <summary
                      className={styles.questionSummary}
                      onClick={(event) => {
                        if (showAllSolutions) {
                          return;
                        }

                        event.preventDefault();
                        toggleQuestion(question.questionId);
                      }}
                    >
                      <div>
                        <span className={styles.questionIndex}>Câu {question.questionNo}</span>
                        <div className={styles.answerBadgeRow}>
                          <span
                            className={`${styles.answerBadge} ${
                              question.isCorrect ? styles.answerBadgeCorrect : styles.answerBadgeWrong
                            }`}
                          >
                            Bạn chọn: {getAnswerText(question)}
                          </span>
                          {!question.isCorrect && (
                            <span className={`${styles.answerBadge} ${styles.answerBadgeCorrect}`}>
                              Đáp án đúng: {getCorrectAnswerText(question)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={styles.summaryHint}>Nhấn để mở lời giải</span>
                    </summary>

                    <div className={styles.solutionBody}>
                      {question.groupTitle ? <h3>{question.groupTitle}</h3> : null}
                      {question.promptText ? (
                        <div className={styles.detailPanel}>
                          <span>Câu hỏi</span>
                          <p>{question.promptText}</p>
                        </div>
                      ) : null}

                      {question.options?.length > 0 ? (
                        <div className={styles.optionList}>
                          {question.options.map((option) => (
                            <div key={`${question.questionId}-${option.optionKey}`} className={styles.optionItem}>
                              <strong>{option.optionKey}</strong>
                              <span>{option.optionText}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className={styles.answerGrid}>
                        <div>
                          <span>Bạn chọn</span>
                          <strong>{getAnswerText(question)}</strong>
                        </div>
                        <div>
                          <span>Đáp án đúng</span>
                          <strong>{getCorrectAnswerText(question)}</strong>
                        </div>
                      </div>

                      {question.explanationText ? (
                        <div className={styles.detailPanel}>
                          <span>Giải thích</span>
                          <p>{question.explanationText}</p>
                        </div>
                      ) : null}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </section>
      </section>
    </main>
  );
};

export default IeltsResult;
