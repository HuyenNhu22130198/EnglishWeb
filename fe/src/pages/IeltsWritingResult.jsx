import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { removeIeltsWritingDraft } from '../hooks/useIeltsWritingDraft';
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

const IeltsWritingResult = ({ result }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const tasks = useMemo(
    () => [...(result.tasks || [])].sort((left, right) => Number(left.taskNo) - Number(right.taskNo)),
    [result.tasks]
  );
  const [activeTask, setActiveTask] = useState(tasks[0]?.taskNo || 1);

  const handleRetake = () => {
    removeIeltsWritingDraft(user?.id ?? user?.userId, result.examId);
    navigate(`/practice/ielts/${result.examId}/writing`);
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
          </section>
        ))}
      </div>
    </main>
  );
};

export default IeltsWritingResult;
