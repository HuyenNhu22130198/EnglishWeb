import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmDialog } from '../contexts/useConfirmDialog';
import { loadIeltsWritingDraft, useIeltsWritingDraft } from '../hooks/useIeltsWritingDraft';
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
  const confirm = useConfirmDialog();
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? user?.userId;

  const [practice, setPractice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTask, setActiveTask] = useState(1);
  const [answers, setAnswers] = useState({});
  const [notes, setNotes] = useState({});
  const [openNotes, setOpenNotes] = useState({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [submitNotice, setSubmitNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [draftReady, setDraftReady] = useState(false);

  const currentDraft = useMemo(() => ({
    examId: Number(examId),
    userId,
    task1Answer: answers[1] || '',
    task2Answer: answers[2] || '',
    task1Note: notes[1] || '',
    task2Note: notes[2] || '',
    activeTask,
    elapsedSeconds,
  }), [activeTask, answers, elapsedSeconds, examId, notes, userId]);

  const { saveStatus, markDirty, clearDraft } = useIeltsWritingDraft({
    userId,
    examId,
    ready: draftReady,
    draft: currentDraft,
  });

  useEffect(() => {
    const fetchWriting = async () => {
      try {
        setLoading(true);
        setDraftReady(false);
        setError('');

        if (userId === null || userId === undefined) {
          throw new Error('Không thể xác định tài khoản để khôi phục bản nháp Writing.');
        }

        const response = await ieltsAPI.getIeltsPractice(examId, 'WRITING');

        if (!response.success) {
          setError(response.message || 'Không thể tải đề IELTS Writing');
          return;
        }

        setPractice(response.data);
        const draft = loadIeltsWritingDraft(userId, examId);
        setAnswers({
          1: draft?.task1Answer || '',
          2: draft?.task2Answer || '',
        });
        setNotes({
          1: draft?.task1Note || '',
          2: draft?.task2Note || '',
        });
        setOpenNotes({
          1: Boolean(draft?.task1Note),
          2: Boolean(draft?.task2Note),
        });
        setActiveTask(draft?.activeTask || 1);
        setElapsedSeconds(draft?.elapsedSeconds || 0);
        setDraftReady(true);
      } catch (err) {
        setError(err.message || 'Lỗi kết nối đến server');
      } finally {
        setLoading(false);
      }
    };

    fetchWriting();
  }, [examId, userId]);

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
    const writingTasks = practice?.writingTasks || [];

    return TASK_NUMBERS.map((partNo) => {
      const writingTask = writingTasks.find((task) => Number(task.taskNo) === partNo) || null;
      const taskGroups = groups.filter((group) => Number(group.partNo) === partNo);
      const groupAssets = taskGroups.flatMap((group) => (group.mainAsset ? [group.mainAsset] : []));
      const partAssets = assets.filter((asset) => Number(asset.partNo) === partNo);
      const taskAssets = uniqByAsset([...(writingTask?.asset ? [writingTask.asset] : []), ...groupAssets, ...partAssets]);

      return {
        partNo,
        writingTask,
        groups: taskGroups,
        assets: taskAssets,
      };
    });
  }, [practice]);

  const handleAnswerChange = (partNo, value) => {
    markDirty();
    setAnswers((current) => ({
      ...current,
      [partNo]: value,
    }));
  };

  const handleNoteChange = (partNo, value) => {
    markDirty();
    setNotes((current) => ({
      ...current,
      [partNo]: value,
    }));
  };

  const handleTaskChange = (partNo) => {
    markDirty();
    setActiveTask(partNo);
  };

  const handleClearDraft = async () => {
    const confirmed = await confirm({
      title: 'Xóa bản nháp?',
      message: 'Toàn bộ bài viết và ghi chú đang lưu sẽ bị xóa. Thao tác này không thể hoàn tác.',
      confirmLabel: 'Xóa bản nháp',
      tone: 'danger',
    });
    if (!confirmed) return;

    clearDraft();
    setAnswers({ 1: '', 2: '' });
    setNotes({ 1: '', 2: '' });
    setOpenNotes({});
    setActiveTask(1);
    setElapsedSeconds(0);
    setSubmitNotice(null);
  };

  const toggleNote = (partNo) => {
    setOpenNotes((current) => ({
      ...current,
      [partNo]: !current[partNo],
    }));
  };

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }

    const confirmed = await confirm({
      title: 'Nộp bài IELTS Writing?',
      message: 'Bài viết của bạn sẽ được AI chấm điểm ngay sau khi nộp và không thể chỉnh sửa sau khi nộp.',
      confirmLabel: 'Nộp bài',
    });
    if (!confirmed) return;

    try {
      setSubmitting(true);
      setSubmitNotice(null);
      const taskAnswers = tasks.map((task) => ({
        taskId: task.writingTask?.taskId || null,
        taskNo: task.partNo,
        answerText: answers[task.partNo] || '',
      }));
      const response = await ieltsAPI.submitIeltsExam(examId, 'WRITING', taskAnswers, elapsedSeconds);
      const attemptId = response?.data?.attemptId;
      if (!response?.success || !attemptId) {
        throw new Error(response?.message || 'Không thể nộp bài IELTS Writing');
      }
      clearDraft();
      navigate(`/practice/ielts/result/${attemptId}`);
    } catch (submitError) {
      setSubmitNotice({
        type: 'warning',
        title: 'Nộp bài chưa thành công',
        message: submitError.message || 'Vui lòng kiểm tra kết nối và thử lại. Nội dung bài viết vẫn được giữ nguyên.',
      });
    } finally {
      setSubmitting(false);
    }
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

            <button type="button" className={styles.submitButton} onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Đang nộp' : 'Nộp bài'}
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

      <div className={styles.draftToolbar}>
        <span
          className={`${styles.draftStatus} ${saveStatus === 'error' ? styles.draftStatusError : ''}`}
          aria-live="polite"
        >
          {saveStatus === 'saving' && 'Đang lưu...'}
          {saveStatus === 'saved' && 'Đã tự động lưu'}
          {saveStatus === 'error' && 'Không thể lưu nháp'}
        </span>
        <button type="button" className={styles.clearDraftButton} onClick={handleClearDraft}>
          Xóa nháp
        </button>
      </div>

      <div className={styles.taskTabs} aria-label="Chọn task IELTS Writing">
        {tasks.map((task) => (
          <button
            key={task.partNo}
            type="button"
            className={`${styles.taskTab} ${activeTask === task.partNo ? styles.taskTabActive : ''}`}
            onClick={() => handleTaskChange(task.partNo)}
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

                {task.writingTask ? (
                  <article className={styles.questionGroup}>
                    {task.writingTask.instruction ? (
                      <p className={styles.groupInstruction}>{task.writingTask.instruction}</p>
                    ) : null}
                    {task.writingTask.prompt ? (
                      <p className={styles.questionPrompt}>{task.writingTask.prompt}</p>
                    ) : null}
                  </article>
                ) : task.groups.length === 0 ? (
                  <p className={styles.noContent}>Chưa có nội dung cho task này.</p>
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
