import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ieltsAPI } from '../services/ieltsService';
import styles from './IeltsWriting.module.css';

const TASK_NUMBERS = [1, 2];

const countWords = (text) => {
  const words = String(text || '').match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu);
  return words ? words.length : 0;
};

const formatElapsedTime = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const getTaskLabel = (partNo) => `Task ${partNo}`;

const getTaskInstruction = (partNo) => {
  if (Number(partNo) === 1) {
    return 'You should spend about 20 minutes on this task.';
  }

  return 'You should spend about 40 minutes on this task.';
};

const getWordTarget = (partNo) => {
  if (Number(partNo) === 1) {
    return 'Write at least 150 words.';
  }

  return 'Write at least 250 words.';
};

const uniqByAsset = (assets) => {
  const seen = new Set();

  return assets.filter((asset) => {
    const key = asset?.id || asset?.assetUrl;
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const IeltsWriting = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [practice, setPractice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTask, setActiveTask] = useState(1);
  const [answers, setAnswers] = useState({});
  const [notes, setNotes] = useState({});
  const [openNotes, setOpenNotes] = useState({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [submitNotice, setSubmitNotice] = useState(null);

  useEffect(() => {
    const fetchWriting = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await ieltsAPI.getIeltsPractice(examId, 'WRITING');

        if (!response.success) {
          setError(response.message || 'Không thể tải đề IELTS Writing');
          return;
        }

        setPractice(response.data);
      } catch (err) {
        setError(err.message || 'Lỗi kết nối đến server');
      } finally {
        setLoading(false);
      }
    };

    fetchWriting();
  }, [examId]);

  useEffect(() => {
    if (loading || !practice) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [loading, practice]);

  const tasks = useMemo(() => {
    const groups = practice?.groups || [];
    const assets = practice?.assets || [];

    return TASK_NUMBERS.map((partNo) => {
      const taskGroups = groups.filter((group) => Number(group.partNo) === partNo);
      const groupAssets = taskGroups.flatMap((group) => (group.mainAsset ? [group.mainAsset] : []));
      const partAssets = assets.filter((asset) => Number(asset.partNo) === partNo);
      const taskAssets = uniqByAsset([...groupAssets, ...partAssets]);

      return {
        partNo,
        groups: taskGroups,
        assets: taskAssets,
      };
    });
  }, [practice]);

  const handleAnswerChange = (partNo, value) => {
    setAnswers((current) => ({
      ...current,
      [partNo]: value,
    }));
  };

  const handleNoteChange = (partNo, value) => {
    setNotes((current) => ({
      ...current,
      [partNo]: value,
    }));
  };

  const toggleNote = (partNo) => {
    setOpenNotes((current) => ({
      ...current,
      [partNo]: !current[partNo],
    }));
  };

  const handleSubmit = () => {
    const answeredTasks = TASK_NUMBERS.filter((partNo) => countWords(answers[partNo]) > 0);

    if (answeredTasks.length === 0) {
      setSubmitNotice({
        type: 'warning',
        title: 'Chưa có bài làm',
        message: 'Hãy viết bài cho ít nhất một task trước khi nộp.',
      });
      return;
    }

    setSubmitNotice({
      type: 'success',
      title: 'Đã ghi nhận bài Writing',
      message: 'Bài làm đã được ghi nhận tạm thời trên trang này. Chức năng chấm điểm Writing sẽ được kết nối sau.',
    });
  };

  if (loading) {
    return (
      <main className={styles.practicePage}>
        <section className={styles.emptyState}>
          <h2>Đang tải đề IELTS Writing...</h2>
          <p>Hệ thống đang lấy nội dung đề.</p>
        </section>
      </main>
    );
  }

  if (error || !practice) {
    return (
      <main className={styles.practicePage}>
        <section className={styles.emptyState}>
          <h2>Không thể tải đề IELTS Writing</h2>
          <p>{error || 'Dữ liệu đề thi không hợp lệ.'}</p>
          <button type="button" onClick={() => navigate('/exams/ielts')}>
            Quay lại kho đề
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
            <button type="button" className={styles.topBackButton} onClick={() => navigate(`/exams/ielts/${examId}`)}>
              ← Quay lại
            </button>

            <div className={styles.examBarTitle}>
              <strong>{practice.examName}</strong>
              <span>IELTS Writing</span>
            </div>

            <div className={styles.navigatorTimer} aria-label={`Thời gian làm bài ${formatElapsedTime(elapsedSeconds)}`}>
              <span className={styles.navigatorTimerLabel}>Thời gian</span>
              <span className={styles.navigatorTimerValue}>{formatElapsedTime(elapsedSeconds)}</span>
            </div>

            <button type="button" className={styles.submitButton} onClick={handleSubmit}>
              Nộp bài
            </button>
          </div>
        </div>
      </header>

      {submitNotice ? (
        <div
          className={`${styles.submitNotice} ${
            submitNotice.type === 'success' ? styles.submitNoticeSuccess : styles.submitNoticeWarning
          }`}
          role="alert"
          aria-live="assertive"
        >
          <div className={styles.submitNoticeContent}>
            <strong>{submitNotice.title}</strong>
            <p>{submitNotice.message}</p>
          </div>
          <button type="button" onClick={() => setSubmitNotice(null)} aria-label="Đóng thông báo">
            Đóng
          </button>
        </div>
      ) : null}

      <div className={styles.taskTabs} aria-label="Chọn task IELTS Writing">
        {tasks.map((task) => (
          <button
            key={task.partNo}
            type="button"
            className={`${styles.taskTab} ${activeTask === task.partNo ? styles.taskTabActive : ''}`}
            onClick={() => setActiveTask(task.partNo)}
          >
            {getTaskLabel(task.partNo)}
          </button>
        ))}
      </div>

      <div className={styles.examContent}>
        {tasks.map((task) => (
          <section
            key={task.partNo}
            className={`${styles.taskPanel} ${activeTask === task.partNo ? styles.taskPanelActive : ''}`}
            aria-hidden={activeTask !== task.partNo}
          >
            <div className={styles.promptPane}>
              <div className={styles.writingPaper}>
                <div className={styles.paperSkill}>Writing</div>
                <h1>WRITING TASK {task.partNo}</h1>
                <p className={styles.taskHint}>{getTaskInstruction(task.partNo)}</p>

                {task.groups.length === 0 ? (
                  <p className={styles.noContent}>Chưa có câu hỏi cho task này.</p>
                ) : (
                  task.groups.map((group) => (
                    <article key={group.groupId} className={styles.questionGroup}>
                      {group.title ? <h2>{group.title}</h2> : null}
                      {group.instructionText ? <p className={styles.groupInstruction}>{group.instructionText}</p> : null}
                      {group.sharedText ? <p className={styles.sharedText}>{group.sharedText}</p> : null}

                      {(group.blocks || []).map((block) => (
                        <div key={block.blockId} className={styles.questionBlock}>
                          {block.instructionText ? <p>{block.instructionText}</p> : null}
                          {(block.questions || []).map((question) => (
                            <p key={question.questionId} className={styles.questionPrompt}>
                              {question.promptText}
                            </p>
                          ))}
                        </div>
                      ))}
                    </article>
                  ))
                )}

                <p className={styles.wordTarget}>{getWordTarget(task.partNo)}</p>

                {task.assets.length > 0 ? (
                  <div className={styles.assetStack}>
                    {task.assets.map((asset) => (
                      <figure key={asset.id || asset.assetUrl} className={styles.assetCard}>
                        <img src={asset.assetUrl} alt={`IELTS Writing Task ${task.partNo}`} />
                      </figure>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className={styles.answerPane}>
              <button type="button" className={styles.noteToggle} onClick={() => toggleNote(task.partNo)}>
                Thêm ghi chú / dàn ý
              </button>

              {openNotes[task.partNo] ? (
                <textarea
                  className={styles.noteInput}
                  value={notes[task.partNo] || ''}
                  onChange={(event) => handleNoteChange(task.partNo, event.target.value)}
                  placeholder="Thêm ghi chú tại đây ..."
                />
              ) : null}

              <textarea
                className={styles.essayInput}
                value={answers[task.partNo] || ''}
                onChange={(event) => handleAnswerChange(task.partNo, event.target.value)}
                placeholder="Viết essay tại đây ..."
              />

              <p className={styles.wordCount}>Word count: {countWords(answers[task.partNo])}</p>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
};

export default IeltsWriting;
