import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ieltsAPI } from '../services/ieltsService';
import styles from './IeltsSpeakingFree.module.css';

const microphoneMessage = (error) => {
  if (error?.name === 'NotAllowedError') {
    return 'Bạn đã từ chối quyền microphone. Hãy bật quyền rồi thử lại.';
  }
  if (error?.name === 'NotFoundError') return 'Không tìm thấy microphone trên thiết bị.';
  return error?.message || 'Không thể sử dụng microphone.';
};

const formatTime = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

const IeltsSpeakingFree = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [practice, setPractice] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [attemptId, setAttemptId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [editedTranscript, setEditedTranscript] = useState('');
  const [recordState, setRecordState] = useState('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [processing, setProcessing] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const storageKey = useMemo(
    () => `ielts-speaking-free-attempt:${user?.id || user?.email || 'current'}:${examId}`,
    [examId, user]
  );

  const questions = useMemo(() => (practice?.speakingParts || []).flatMap((part) => {
    const samples = part.samples || [];
    if (Number(part.partNo) === 2 && (part.items || []).length) {
      const item = part.items[0];
      const sample = samples.find((entry) =>
        Number(entry.speakingItemId) === Number(item.itemId)
      ) || samples.find((entry) => entry.speakingItemId == null);
      return [{
        ...item,
        partNo: part.partNo,
        taskId: part.taskId,
        topicTitle: part.topicTitle,
        instruction: part.instruction,
        cueItems: part.items,
        sampleAnswerId: sample?.sampleAnswerId ?? null,
      }];
    }
    return (part.items || []).map((item, index) => {
      const sample = samples.find((entry) =>
        Number(entry.speakingItemId) === Number(item.itemId)
      ) || (samples[index]?.speakingItemId == null ? samples[index] : null);
      return {
        ...item,
        partNo: part.partNo,
        taskId: part.taskId,
        topicTitle: part.topicTitle,
        instruction: part.instruction,
        cueItems: [],
        sampleAnswerId: sample?.sampleAnswerId ?? null,
      };
    });
  }), [practice]);

  const selected = questions[selectedIndex];
  const current = selected ? answers[selected.itemId] : null;

  useEffect(() => {
    let active = true;
    ieltsAPI.getIeltsPractice(examId, 'SPEAKING')
      .then((response) => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Dữ liệu Speaking không hợp lệ.');
        }
        if (active) setPractice(response.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Không thể tải bài Speaking tự do.');
      });

    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      ieltsAPI.getSpeakingAttempt(examId, stored)
        .then((response) => {
          if (!active) return;
          if (response.data?.status === 'IN_PROGRESS') setAttemptId(Number(stored));
          else window.localStorage.removeItem(storageKey);
        })
        .catch(() => window.localStorage.removeItem(storageKey));
    }
    return () => { active = false; };
  }, [examId, storageKey]);

  useEffect(() => {
    setEditedTranscript(current?.transcriptText || '');
    setNotice('');
  }, [selectedIndex, current?.freeAnswerId, current?.transcriptText]);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const ensureAttempt = async () => {
    if (attemptId) return attemptId;
    const response = await ieltsAPI.startSpeakingAttempt(examId);
    const id = response.data?.attemptId;
    if (!id) throw new Error('Không thể tạo lượt luyện Speaking.');
    setAttemptId(id);
    window.localStorage.setItem(storageKey, String(id));
    return id;
  };

  const beginTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = window.setInterval(
      () => setElapsedSeconds((value) => value + 1),
      1000
    );
  };

  const uploadRecording = async (blob, duration) => {
    setProcessing('transcribing');
    setNotice('');
    try {
      const activeAttemptId = await ensureAttempt();
      const extension = blob.type.includes('ogg') ? 'ogg' : 'webm';
      const formData = new FormData();
      formData.append('audio', blob, `speaking-answer.${extension}`);
      formData.append('speakingItemId', String(selected.itemId));
      if (selected.sampleAnswerId != null) {
        formData.append('sampleAnswerId', String(selected.sampleAnswerId));
      }
      formData.append('durationSeconds', String(duration));
      const response = await ieltsAPI.transcribeFreeSpeakingAnswer(
        examId, activeAttemptId, formData
      );
      const answer = { ...response.data, durationSeconds: duration, grade: null };
      setAnswers((items) => ({ ...items, [selected.itemId]: answer }));
      setEditedTranscript(answer.transcriptText || '');
      if (answer.whisperStatus === 'FAILED') {
        setNotice('Không tạo được transcript tự động, vui lòng tự nhập câu trả lời của bạn.');
      }
    } catch (uploadError) {
      setNotice(uploadError.message || 'Không thể tải audio và tạo transcript.');
    } finally {
      setProcessing('');
      setRecordState('idle');
    }
  };

  const startRecording = async () => {
    if (!selected || processing) return;
    setNotice('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm']
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        clearInterval(timerRef.current);
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        uploadRecording(blob, elapsedSecondsRef.current);
      };
      setElapsedSeconds(0);
      elapsedSecondsRef.current = 0;
      recorder.start(500);
      setRecordState('recording');
      beginTimer();
    } catch (recordError) {
      setNotice(microphoneMessage(recordError));
    }
  };

  const elapsedSecondsRef = useRef(0);
  useEffect(() => { elapsedSecondsRef.current = elapsedSeconds; }, [elapsedSeconds]);

  const togglePause = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === 'recording') {
      recorder.pause();
      clearInterval(timerRef.current);
      setRecordState('paused');
    } else if (recorder.state === 'paused') {
      recorder.resume();
      beginTimer();
      setRecordState('recording');
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  };

  const submitAnswer = async () => {
    if (!current?.freeAnswerId || !editedTranscript.trim()) return;
    setProcessing('grading');
    setNotice('');
    try {
      const response = await ieltsAPI.submitFreeSpeakingAnswer(current.freeAnswerId, {
        transcriptText: editedTranscript.trim(),
      });
      const updated = {
        ...current,
        transcriptText: editedTranscript.trim(),
        grade: response.data,
      };
      setAnswers((items) => ({ ...items, [selected.itemId]: updated }));
      if (response.data?.geminiStatus === 'FAILED') {
        setNotice('Không thể chấm bài lúc này, vui lòng thử lại.');
      }
    } catch (submitError) {
      setNotice(submitError.message || 'Không thể chấm bài lúc này, vui lòng thử lại.');
    } finally {
      setProcessing('');
    }
  };

  if (error) {
    return <main className={styles.state}><p>{error}</p><button onClick={() => navigate(-1)}>Quay lại</button></main>;
  }
  if (!practice || !selected) {
    return <main className={styles.state}>Đang tải bài Speaking tự do...</main>;
  }

  const grade = current?.grade;
  const scoreEntries = grade ? [
    ['Đúng trọng tâm', grade.relevanceScore],
    ['Phát triển ý', grade.ideaDevelopmentScore],
    ['Ngữ pháp', grade.grammarScore],
    ['Từ vựng', grade.vocabularyScore],
    ['Mạch lạc', grade.coherenceScore],
    ['Band ước tính', grade.overallBandEstimate],
  ] : [];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button type="button" onClick={() => navigate(`/exams/ielts/${examId}`)}>Quay lại</button>
        <div><span>IELTS SPEAKING</span><h1>Trả lời tự do · AI chấm</h1></div>
        <strong className={styles.progress}>{selectedIndex + 1}/{questions.length}</strong>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          {[1, 2, 3].map((partNo) => {
            const partQuestions = questions.filter((item) => Number(item.partNo) === partNo);
            if (!partQuestions.length) return null;
            return <section key={partNo}>
              <h2>Part {partNo}</h2>
              {partQuestions.map((question) => {
                const index = questions.indexOf(question);
                return <button
                  type="button"
                  key={question.itemId}
                  className={index === selectedIndex ? styles.active : ''}
                  disabled={recordState !== 'idle' || Boolean(processing)}
                  onClick={() => setSelectedIndex(index)}
                >
                  <i className={answers[question.itemId]?.grade ? styles.done : ''} />
                  Câu {index + 1}
                </button>;
              })}
            </section>;
          })}
        </aside>

        <section className={styles.content}>
          <span className={styles.partBadge}>PART {selected.partNo}</span>
          <h2>{selected.topicTitle || 'Speaking question'}</h2>
          {selected.instruction ? <p className={styles.instruction}>{selected.instruction}</p> : null}
          {Number(selected.partNo) === 2 ? (
            <div className={styles.cueCard}>
              <h3>{selected.topicTitle}</h3>
              {(selected.cueItems || []).map((item) => <p key={item.itemId}>• {item.content}</p>)}
            </div>
          ) : (
            <div className={styles.question}>
              <span>Câu hỏi</span>
              <strong>{selected.content}</strong>
            </div>
          )}

          <div className={styles.recorder}>
            <div><h3>Ghi âm câu trả lời</h3><p>Có thể tạm dừng và tiếp tục nhiều lần.</p></div>
            <span className={styles.timer}>{formatTime(elapsedSeconds)}</span>
            <div className={styles.controls}>
              <button className={styles.recordButton} type="button"
                disabled={recordState !== 'idle' || Boolean(processing)} onClick={startRecording}>
                Bắt đầu
              </button>
              <button type="button" disabled={!['recording', 'paused'].includes(recordState)}
                onClick={togglePause}>
                {recordState === 'paused' ? 'Tiếp tục' : 'Tạm dừng'}
              </button>
              <button className={styles.stopButton} type="button"
                disabled={!['recording', 'paused'].includes(recordState)} onClick={stopRecording}>
                Dừng ghi âm
              </button>
            </div>

            {processing === 'transcribing' ? (
              <div className={styles.processing}><span /><p>Đang tạo transcript...</p></div>
            ) : null}
            {current?.audioUrl ? <audio controls src={current.audioUrl} /> : null}
          </div>

          {current?.freeAnswerId ? (
            <section className={styles.transcriptEditor}>
              <label htmlFor="free-transcript">Transcript — hãy xem và sửa trước khi nộp</label>
              <textarea
                id="free-transcript"
                rows={9}
                value={editedTranscript}
                onChange={(event) => setEditedTranscript(event.target.value)}
                placeholder="Nhập câu trả lời của bạn tại đây nếu transcript tự động không khả dụng..."
                disabled={processing === 'grading'}
              />
              <button type="button" onClick={submitAnswer}
                disabled={!editedTranscript.trim() || processing === 'grading'}>
                {processing === 'grading' ? 'Đang chấm bài...' : grade?.geminiStatus === 'FAILED' ? 'Nộp lại' : 'Nộp bài'}
              </button>
            </section>
          ) : null}

          {notice ? <p className={styles.notice}>{notice}</p> : null}

          {grade ? (
            <section className={styles.result}>
              <div className={styles.resultHeader}><div><span>KẾT QUẢ</span><h2>Câu trả lời của bạn</h2></div></div>
              {grade.geminiStatus === 'OK' ? (
                <>
                  <div className={styles.resultSection}>
                    <h3>Điểm nội dung Gemini</h3>
                    <div className={styles.scoreGrid}>
                      {scoreEntries.map(([label, value]) => <div key={label}>
                        <span>{label}</span><strong>{Number(value).toFixed(1)}/9</strong>
                      </div>)}
                    </div>
                  </div>
                  <div className={styles.resultSection}>
                    <h3>Lỗi và điểm cần cải thiện</h3>
                    <div className={styles.errorList}>
                      {(grade.errors || []).map((item, index) => <article key={`${item.type}-${index}`}>
                        <strong>{item.type || 'Cần cải thiện'}</strong>
                        {item.original ? <p><b>Hiện tại:</b> {item.original}</p> : null}
                        {item.suggestion ? <p><b>Gợi ý:</b> {item.suggestion}</p> : null}
                        {item.explanation ? <p>{item.explanation}</p> : null}
                      </article>)}
                    </div>
                    <h4>Câu trả lời AI đã chỉnh sửa</h4>
                    <p className={styles.corrected}>{grade.correctedAnswerText}</p>
                  </div>
                </>
              ) : <p className={styles.unavailable}>{grade.geminiError || 'Không thể chấm bài lúc này.'}</p>}
              <div className={styles.sampleAnswer}>
                <h3>Câu trả lời mẫu</h3>
                <p>{grade.sampleAnswerText || 'Chưa có câu trả lời mẫu cho câu hỏi này.'}</p>
              </div>
            </section>
          ) : null}
        </section>
      </div>
    </main>
  );
};

export default IeltsSpeakingFree;
