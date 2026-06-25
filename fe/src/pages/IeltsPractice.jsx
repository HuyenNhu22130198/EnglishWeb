import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ieltsAPI } from '../services/ieltsService';
import styles from './IeltsPractice.module.css';

const isAudioAsset = (asset) => String(asset?.assetType || '').toLowerCase().includes('audio');

const isVisualAsset = (asset) => {
  const assetType = String(asset?.assetType || '').toLowerCase();

  return ['image', 'map', 'table', 'diagram', 'photo', 'picture'].some((type) => assetType.includes(type));
};

const getQuestionRange = (questions) => {
  if (!questions.length) {
    return '';
  }

  const numbers = questions.map((question) => question.questionNo).filter(Boolean);
  const first = Math.min(...numbers);
  const last = Math.max(...numbers);

  return first === last ? `Question ${first}` : `Questions ${first}-${last}`;
};

const normalizeAnswerValue = (answer) => answer?.answerText || '';

const shouldShowSharedText = (skill) => skill === 'READING';

const IeltsPractice = () => {
  const navigate = useNavigate();
  const { examId } = useParams();
  const [searchParams] = useSearchParams();
  const skill = String(searchParams.get('skill') || 'LISTENING').toUpperCase();

  const [practice, setPractice] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchPractice = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await ieltsAPI.getIeltsPractice(examId, skill);

        if (!mounted) {
          return;
        }

        if (response.success) {
          setPractice(response.data);
          setAnswers({});
        } else {
          setError(response.message || 'Khong the tai noi dung de IELTS');
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

    fetchPractice();

    return () => {
      mounted = false;
    };
  }, [examId, skill]);

  const groups = practice?.groups || [];
  const assetsByPart = useMemo(() => {
    const result = new Map();

    (practice?.assets || []).forEach((asset) => {
      const partNo = asset.partNo || 0;
      const currentAssets = result.get(partNo) || [];
      result.set(partNo, [...currentAssets, asset]);
    });

    return result;
  }, [practice]);

  const questionGroups = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        questions: group.blocks.flatMap((block) => block.questions),
      })),
    [groups]
  );

  const answeredCount = useMemo(
    () => Object.values(answers).filter((answer) => String(answer?.answerText || '').trim()).length,
    [answers]
  );

  const handleAnswerChange = (questionId, value) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: {
        selectedOptionKey: null,
        answerText: value,
      },
    }));
  };

  const scrollToQuestion = (questionId) => {
    document.getElementById(`ielts-question-${questionId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const scrollToPart = (partNo) => {
    document.getElementById(`ielts-part-${partNo}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');

      const payload = Object.entries(answers).map(([questionId, answer]) => ({
        questionId: Number(questionId),
        selectedOptionKey: null,
        answerText: answer.answerText?.trim() || null,
      }));

      const response = await ieltsAPI.submitIeltsExam(examId, skill, payload);

      if (response.success && response.data?.attemptId) {
        navigate(`/practice/ielts/result/${response.data.attemptId}`);
        return;
      }

      setError(response.message || 'Khong the nop bai IELTS');
    } catch (err) {
      setError(err.message || 'Loi ket noi den server');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.practicePage}>
        <section className={styles.emptyState}>
          <h2>Dang tai de IELTS...</h2>
          <p>He thong dang lay noi dung de tu database.</p>
        </section>
      </main>
    );
  }

  if (error || !practice) {
    return (
      <main className={styles.practicePage}>
        <section className={styles.emptyState}>
          <h2>Khong the tai de IELTS</h2>
          <p>{error || 'Du lieu de thi khong hop le.'}</p>
          <button type="button" onClick={() => navigate('/exams/ielts')}>
            Quay lai kho de
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.practicePage}>
      <header className={styles.stickyExamBar}>
        <div className={styles.examBarInner}>
          <div className={styles.examBarControls}>
            <button type="button" className={styles.topBackButton} onClick={() => navigate('/exams/ielts')}>
              Quay lai
            </button>

            <div className={styles.examBarTitle}>
              <strong>{practice.examName}</strong>
              <span>
                IELTS {practice.skill} - {practice.examCode}
              </span>
            </div>

            <div className={styles.examProgress}>
              <span>Da tra loi</span>
              <strong>
                {answeredCount}/{practice.totalQuestions}
              </strong>
            </div>

            <button type="button" className={styles.submitButton} onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Dang nop' : 'Nop bai'}
            </button>
          </div>
        </div>
      </header>

      <div className={styles.bodyLayout}>
        <aside className={styles.questionNavigator}>
          <div className={styles.navigatorHeader}>
            <h3>IELTS {practice.skill}</h3>
            <p>{practice.examCode}</p>
          </div>

          <div className={styles.navigatorLegend}>
            <span className={styles.legendItem}>
              <i className={`${styles.legendDot} ${styles.legendAnswered}`} /> Da lam
            </span>
            <span className={styles.legendItem}>
              <i className={`${styles.legendDot} ${styles.legendUnanswered}`} /> Chua lam
            </span>
          </div>

          {questionGroups.map((group) => (
            <div key={group.groupId} className={styles.partNavBlock}>
              <button type="button" className={styles.partNavTitle} onClick={() => scrollToPart(group.partNo)}>
                Part {group.partNo}
              </button>
              <div className={styles.numberGrid}>
                {group.questions.map((question) => {
                  const isAnswered = Boolean(String(answers[question.questionId]?.answerText || '').trim());

                  return (
                    <button
                      key={question.questionId}
                      type="button"
                      className={`${styles.numberButton} ${isAnswered ? styles.answeredNumber : ''}`}
                      onClick={() => scrollToQuestion(question.questionId)}
                    >
                      {question.questionNo}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        <section className={styles.examContent}>
          {error ? <p className={styles.errorText}>{error}</p> : null}

          {groups.map((group) => {
            const partAssets = assetsByPart.get(group.partNo) || [];
            const audioAssets = partAssets.filter(isAudioAsset);
            const visualAssets = partAssets.filter(isVisualAsset);

            return (
              <section key={group.groupId} id={`ielts-part-${group.partNo}`} className={styles.partSection}>
                <div className={styles.partHeader}>
                  <div>
                    <span>IELTS {practice.skill}</span>
                    <h2>Part {group.partNo}</h2>
                  </div>
                  <p>{group.title}</p>
                </div>

                <article className={styles.groupCard}>
                  {group.instructionText ? <p className={styles.groupInstruction}>{group.instructionText}</p> : null}

                  {audioAssets.length > 0 && (
                    <div className={styles.audioStack}>
                      {audioAssets.map((asset) => (
                        <audio key={asset.id} controls src={asset.assetUrl} className={styles.audioPlayer} />
                      ))}
                    </div>
                  )}

                  <div className={styles.ieltsExamLayout}>
                    <div className={styles.sourcePane}>
                      {visualAssets.length > 0 && (
                        <div className={styles.materialGrid}>
                          {visualAssets.map((asset) => (
                            <div key={asset.id} className={styles.materialImageCard}>
                              <img src={asset.assetUrl} alt={`${asset.assetType || 'IELTS'} part ${asset.partNo}`} />
                            </div>
                          ))}
                        </div>
                      )}

                      {shouldShowSharedText(practice.skill) && group.sharedText ? (
                        <div className={styles.passageBox}>
                          {group.sharedText.split(/\n{2,}/).map((paragraph, index) => (
                            <p key={`${group.groupId}-paragraph-${index}`}>{paragraph.trim()}</p>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className={styles.answerPane}>
                      {group.blocks.map((block) => (
                        <section key={block.blockId} className={styles.questionBlock}>
                          <div className={styles.blockHeader}>
                            <span>{getQuestionRange(block.questions)}</span>
                            <strong>{block.questionType}</strong>
                            {block.instructionText ? <p>{block.instructionText}</p> : null}
                          </div>

                          <div className={styles.questionList}>
                            {block.questions.map((question) => {
                              const answerValue = normalizeAnswerValue(answers[question.questionId]);

                              return (
                                <div
                                  key={question.questionId}
                                  id={`ielts-question-${question.questionId}`}
                                  className={styles.questionCard}
                                >
                                  <div className={styles.questionTop}>
                                    <button type="button" className={styles.questionIndex}>
                                      {question.questionNo}
                                    </button>
                                    <input
                                      type="text"
                                      value={answerValue}
                                      onChange={(event) => handleAnswerChange(question.questionId, event.target.value)}
                                      className={styles.answerInput}
                                      placeholder="Nhap dap an"
                                      aria-label={`Answer for question ${question.questionNo}`}
                                    />
                                  </div>

                                  {question.promptText ? (
                                    <p className={styles.questionText}>{question.promptText}</p>
                                  ) : null}

                                  {question.options?.length > 0 && (
                                    <div className={styles.optionReference}>
                                      {question.options.map((option) => (
                                        <div key={option.optionId} className={styles.optionReferenceItem}>
                                          <strong>{option.optionKey}</strong>
                                          <span>{option.optionText}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  </div>
                </article>
              </section>
            );
          })}
        </section>
      </div>
    </main>
  );
};

export default IeltsPractice;
