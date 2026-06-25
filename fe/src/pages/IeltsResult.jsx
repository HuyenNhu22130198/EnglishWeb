import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ieltsAPI } from '../services/ieltsService';
import styles from './IeltsResult.module.css';

const IeltsResult = () => {
  const navigate = useNavigate();
  const { attemptId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchResult = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await ieltsAPI.getIeltsResult(attemptId);

        if (!mounted) {
          return;
        }

        if (response.success) {
          setResult(response.data);
        } else {
          setError(response.message || 'Khong the tai ket qua IELTS');
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Loi ket noi den server');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchResult();

    return () => {
      mounted = false;
    };
  }, [attemptId]);

  if (loading) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyState}>
          <h1>Dang tai ket qua IELTS...</h1>
        </section>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyState}>
          <h1>Khong the tai ket qua IELTS</h1>
          <p>{error || 'Ket qua khong ton tai hoac ban khong co quyen truy cap.'}</p>
          <button type="button" onClick={() => navigate('/exams/ielts')}>
            Quay lai kho de
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>Ket qua IELTS {result.skill}</span>
        <h1>{result.examName}</h1>
        <p>
          Dung {result.correctCount}/{result.totalQuestions} cau • Band uoc tinh {result.bandScore}
        </p>
      </section>

      <section className={styles.stats}>
        <div className={styles.statCard}>
          <span>Da tra loi</span>
          <strong>{result.answeredCount}</strong>
        </div>
        <div className={styles.statCard}>
          <span>So cau dung</span>
          <strong>{result.correctCount}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Band uoc tinh</span>
          <strong>{result.bandScore}</strong>
        </div>
      </section>

      <section className={styles.parts}>
        {result.partSummaries?.map((part) => (
          <article key={part.partNo} className={styles.partCard}>
            <h2>Part {part.partNo}</h2>
            <p>
              {part.correctCount}/{part.totalQuestions} cau dung
            </p>
          </article>
        ))}
      </section>

      <section className={styles.reviewList}>
        {result.questionResults?.map((question) => (
          <article
            key={question.questionId}
            className={`${styles.reviewCard} ${question.isCorrect ? styles.correct : styles.incorrect}`}
          >
            <div className={styles.reviewHeader}>
              <span>
                Cau {question.questionNo} • Part {question.partNo}
              </span>
              <strong>{question.isCorrect ? 'Dung' : 'Sai'}</strong>
            </div>

            {question.groupTitle ? <h2>{question.groupTitle}</h2> : null}
            {question.sharedText ? <div className={styles.sharedText}>{question.sharedText}</div> : null}
            {question.promptText ? <p>{question.promptText}</p> : null}

            <div className={styles.answerGrid}>
              <div>
                <span>Ban chon</span>
                <strong>{question.selectedOptionKey || question.selectedAnswerText || 'Chua tra loi'}</strong>
              </div>
              <div>
                <span>Dap an dung</span>
                <strong>
                  {(question.correctAnswers || [])
                    .map((answer) => answer.answerKey || answer.answerText)
                    .filter(Boolean)
                    .join(', ') || 'Khong co'}
                </strong>
              </div>
            </div>

            {question.options?.length > 0 && (
              <div className={styles.options}>
                {question.options.map((option) => (
                  <div key={`${question.questionId}-${option.optionKey}`} className={styles.optionItem}>
                    <strong>{option.optionKey}</strong> {option.optionText}
                  </div>
                ))}
              </div>
            )}

            {question.explanationText ? (
              <div className={styles.explanation}>
                <span>Giai thich</span>
                <p>{question.explanationText}</p>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
};

export default IeltsResult;
