import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { removeIeltsWritingDraft } from '../hooks/useIeltsWritingDraft';
import { ieltsAPI } from '../services/ieltsService';
import styles from './IeltsWriting.module.css';

const formatPercent = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : '0.00';
};

const formatDuration = (totalSeconds) => {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = Math.floor(safeSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const topicRelevanceLabel = {
  ON_TOPIC: 'Đúng trọng tâm',
  PARTIALLY_OFF_TOPIC: 'Lạc đề một phần',
  OFF_TOPIC: 'Lạc đề',
};

const IeltsWritingResult = ({ result }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const tasks = useMemo(
    () => [...(result.tasks || [])].sort((left, right) => Number(left.taskNo) - Number(right.taskNo)),
    [result.tasks]
  );
  const [activeTask, setActiveTask] = useState(tasks[0]?.taskNo || 1);
  const [gradeOverrides, setGradeOverrides] = useState({});
  const [gradingTaskNo, setGradingTaskNo] = useState(null);
  const [gradingErrorByTask, setGradingErrorByTask] = useState({});

  const handleRetake = () => {
    removeIeltsWritingDraft(user?.id ?? user?.userId, result.examId);
    navigate(`/practice/ielts/${result.examId}/writing`);
  };

  const getTaskGrade = (task) => gradeOverrides[task.taskNo] || task;

  const handleGradeWithAi = async (task) => {
    if (!task.userAnswerId) return;
    setGradingTaskNo(task.taskNo);
    setGradingErrorByTask((previous) => ({ ...previous, [task.taskNo]: '' }));
    try {
      const response = await ieltsAPI.gradeWritingAnswer(task.userAnswerId);
      setGradeOverrides((previous) => ({ ...previous, [task.taskNo]: response.data }));
    } catch (requestError) {
      setGradingErrorByTask((previous) => ({
        ...previous,
        [task.taskNo]: requestError.message || 'Không thể chấm bài bằng AI. Vui lòng thử lại.',
      }));
    } finally {
      setGradingTaskNo(null);
    }
  };

  return (
    <main className={styles.practicePage}>
      <header className={styles.stickyExamBar}>
        <div className={styles.examBarInner}>
          <div className={`${styles.examBarControls} ${styles.reviewBarControls}`}>
            <button type="button" className={styles.topBackButton} onClick={() => navigate('/infor')}>
              ← Lịch sử
            </button>
            <div className={styles.examBarTitle}>
              <strong>{result.examName}</strong>
              <span>IELTS Writing · Bài đã nộp</span>
            </div>
            <div className={styles.navigatorTimer}>
              <span className={styles.navigatorTimerLabel}>Thời gian</span>
              <span className={styles.navigatorTimerValue}>{formatDuration(result.durationSeconds)}</span>
            </div>
            <button
              type="button"
              className={styles.retakeButton}
              onClick={handleRetake}
            >
              Làm lại đề này
            </button>
          </div>
        </div>
      </header>

      <div className={styles.taskTabs} aria-label="Chọn Task Writing cần xem">
        {tasks.map((task) => (
          <button
            key={task.taskId || task.taskNo}
            type="button"
            className={`${styles.taskTab} ${activeTask === task.taskNo ? styles.taskTabActive : ''}`}
            onClick={() => setActiveTask(task.taskNo)}
          >
            Task {task.taskNo}
          </button>
        ))}
      </div>

      <div className={styles.examContent}>
        {tasks.map((task) => (
          <section
            key={task.taskId || task.taskNo}
            className={`${styles.reviewTaskPanel} ${activeTask === task.taskNo ? styles.reviewTaskPanelActive : ''}`}
          >
            <article className={styles.writingPaper}>
              <div className={styles.paperSkill}>Writing</div>
              <h1>WRITING TASK {task.taskNo}</h1>
              {task.instruction ? <p className={styles.groupInstruction}>{task.instruction}</p> : null}
              {task.material && task.material !== task.prompt ? <p className={styles.sharedText}>{task.material}</p> : null}
              {task.prompt ? <p className={styles.questionPrompt}>{task.prompt}</p> : null}
              {task.imageUrl ? (
                <figure className={`${styles.assetCard} ${styles.resultAssetCard}`}>
                  <img src={task.imageUrl} alt={`IELTS Writing Task ${task.taskNo}`} />
                </figure>
              ) : null}
            </article>

            <div className={styles.reviewComparison}>
              <article className={styles.reviewEssayCard}>
                <div className={styles.reviewCardHeader}>
                  <h2>Bài viết của bạn</h2>
                  <span>{task.userWordCount || 0} từ</span>
                </div>
                <textarea className={styles.reviewEssay} value={task.userAnswer || ''} readOnly aria-label="Bài viết của bạn" />
              </article>

              <article className={styles.reviewEssayCard}>
                <div className={styles.reviewCardHeader}>
                  <h2>Bài mẫu</h2>
                </div>
                {task.sampleAnswer ? (
                  <textarea className={styles.reviewEssay} value={task.sampleAnswer} readOnly aria-label="Bài viết mẫu" />
                ) : (
                  <div className={styles.noSample}>Chưa có bài mẫu để so sánh</div>
                )}
              </article>
            </div>

            <div className={styles.similaritySummary}>
              <strong>Số từ trùng: {task.matchedWordCount || 0}</strong>
              <strong>Tỷ lệ từ trùng với bài mẫu: {formatPercent(task.similarityPercent)}%</strong>
              <p>
                Tỷ lệ này chỉ phản ánh mức độ trùng lặp từ vựng với bài mẫu, không phản ánh band IELTS hoặc chất lượng
                tổng thể của bài viết.
              </p>
            </div>

            <AiGradingPanel
              task={getTaskGrade(task)}
              isGrading={gradingTaskNo === task.taskNo}
              errorMessage={gradingErrorByTask[task.taskNo]}
              onGrade={() => handleGradeWithAi(task)}
            />
          </section>
        ))}
      </div>
    </main>
  );
};

const AiGradingPanel = ({ task, isGrading, errorMessage, onGrade }) => {
  if (!task.userAnswerId) return null;

  if (!task.geminiStatus) {
    return (
      <div className={styles.aiGradePanel}>
        <button type="button" className={styles.aiGradeButton} onClick={onGrade} disabled={isGrading}>
          {isGrading ? 'Đang chấm bằng AI...' : 'Chấm bằng AI'}
        </button>
        {errorMessage ? <p className={styles.aiGradeError}>{errorMessage}</p> : null}
      </div>
    );
  }

  if (task.geminiStatus === 'SKIPPED') {
    return (
      <div className={styles.aiGradePanel}>
        <p className={styles.aiGradeError}>Bỏ qua chấm AI: bài viết trống.</p>
      </div>
    );
  }

  if (task.geminiStatus === 'FAILED') {
    return (
      <div className={styles.aiGradePanel}>
        <p className={styles.aiGradeError}>Chấm AI thất bại: {task.geminiError || 'Lỗi không xác định.'}</p>
        <button type="button" className={styles.aiGradeButton} onClick={onGrade} disabled={isGrading}>
          {isGrading ? 'Đang thử lại...' : 'Thử chấm lại'}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.aiGradePanel}>
      <div className={styles.aiGradeHeader}>
        <h2>Kết quả chấm bằng AI</h2>
        <button type="button" className={styles.aiGradeButton} onClick={onGrade} disabled={isGrading}>
          {isGrading ? 'Đang chấm lại...' : 'Chấm lại'}
        </button>
      </div>

      <div className={styles.aiScoreGrid}>
        <div className={styles.aiScoreCard}>
          <span>Task Response</span>
          <strong>{task.taskResponsePercent ?? '—'}%</strong>
        </div>
        <div className={styles.aiScoreCard}>
          <span>Coherence</span>
          <strong>{task.coherencePercent ?? '—'}%</strong>
        </div>
        <div className={styles.aiScoreCard}>
          <span>Vocabulary</span>
          <strong>{task.vocabularyPercent ?? '—'}%</strong>
        </div>
        <div className={styles.aiScoreCard}>
          <span>Grammar</span>
          <strong>{task.grammarPercent ?? '—'}%</strong>
        </div>
        <div className={`${styles.aiScoreCard} ${styles.aiScoreCardOverall}`}>
          <span>Tổng thể</span>
          <strong>{task.overallQualityPercent ?? '—'}%</strong>
        </div>
      </div>

      <p className={styles.aiTopicRelevance}>
        Mức độ bám sát đề: <strong>{topicRelevanceLabel[task.topicRelevance] || task.topicRelevance}</strong>
        {' · '}
        {task.answersQuestion ? 'Đã trả lời câu hỏi' : 'Chưa trả lời trực tiếp câu hỏi'}
      </p>

      {task.geminiSummary ? <p className={styles.aiSummary}>{task.geminiSummary}</p> : null}

      {task.strengths?.length ? (
        <div className={styles.aiListBlock}>
          <h3>Điểm mạnh</h3>
          <ul>
            {task.strengths.map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {task.taskRequirements?.length ? (
        <div className={styles.aiListBlock}>
          <h3>Yêu cầu của đề bài</h3>
          <ul>
            {task.taskRequirements.map((requirement, index) => (
              <li key={index}>
                <span className={requirement.addressed ? styles.aiRequirementOk : styles.aiRequirementMissing}>
                  {requirement.addressed ? '✓' : '✗'}
                </span>{' '}
                {requirement.requirement}
                {requirement.explanation ? <span className={styles.aiRequirementNote}> — {requirement.explanation}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {task.errors?.length ? (
        <div className={styles.aiListBlock}>
          <h3>Lỗi cần sửa ({task.errors.length})</h3>
          <ul className={styles.aiErrorList}>
            {task.errors.map((error, index) => (
              <li key={index} className={styles.aiErrorItem}>
                <span className={styles.aiErrorType}>{error.type}</span>
                <p className={styles.aiErrorOriginal}>{error.original}</p>
                <p className={styles.aiErrorSuggestion}>→ {error.suggestion}</p>
                <p className={styles.aiErrorExplanation}>{error.explanation}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {task.correctedAnswerText ? (
        <div className={styles.aiListBlock}>
          <h3>Bài viết đã sửa</h3>
          <textarea className={styles.reviewEssay} value={task.correctedAnswerText} readOnly aria-label="Bài viết đã sửa bởi AI" />
        </div>
      ) : null}
    </div>
  );
};

export default IeltsWritingResult;
