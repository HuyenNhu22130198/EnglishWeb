import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toeicAPI } from '../services/toeicService';
import styles from './ToeicPractice.module.css';

const isImageMaterial = (material) => {
  const type = material.materialType?.toLowerCase() || '';
  return type.includes('image') || type.includes('picture') || type.includes('photo');
};

const isTextMaterial = (material) => {
  const type = material.materialType?.toLowerCase() || '';
  return type.includes('text') || type.includes('passage') || type.includes('article');
};

const normalizeContent = (value) => (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
const AUDIO_MARKER_STORAGE_PREFIX = 'toeic-practice-audio-markers';

const getAudioMarkerStorageKey = (examId) => `${AUDIO_MARKER_STORAGE_PREFIX}:${examId}`;

const formatAudioTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainderSeconds = totalSeconds % 60;

  return `${minutes}:${String(remainderSeconds).padStart(2, '0')}`;
};

const clampTime = (value, max) => Math.max(0, Math.min(value, max || 0));

const readAudioMarkers = (examId) => {
  if (!examId || typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(getAudioMarkerStorageKey(examId));

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((marker) => ({
        id: marker.id || `${examId}-${marker.time}`,
        time: Number(marker.time) || 0,
      }))
      .filter((marker) => Number.isFinite(marker.time) && marker.time >= 0)
      .sort((a, b) => a.time - b.time);
  } catch (error) {
    console.error('Failed to read audio markers:', error);
    return [];
  }
};

const ToeicPractice = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const suppressAudioMarkerPersist = useRef(false);

  const [examData, setExamData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [activePart, setActivePart] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isAudioMarkerPanelOpen, setIsAudioMarkerPanelOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content:
        'Bạn đang vướng câu nào? Hãy copy nguyên câu hỏi hoặc đoạn đáp án bạn muốn hỏi vào đây, mình sẽ hỗ trợ bạn phân tích cách làm nhé.',
    },
  ]);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioMarkers, setAudioMarkers] = useState([]);

  const fetchPracticeExam = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await toeicAPI.getToeicPractice(testId);

      if (response.success) {
        setExamData(response.data);
        setActivePart(response.data?.groups?.[0]?.partNo || 1);
      } else {
        setError(response.message || 'Không thể tải nội dung đề TOEIC');
      }
    } catch (err) {
      setError(err.message || 'Lỗi kết nối đến server');
      console.error('Fetch TOEIC practice error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPracticeExam();
  }, [testId]);

  useEffect(() => {
    setAudioMarkers(readAudioMarkers(testId));
    setAudioDuration(0);
    setAudioCurrentTime(0);
    setIsAudioMarkerPanelOpen(true);
  }, [testId]);

  useEffect(() => {
    if (!testId || typeof window === 'undefined') {
      return;
    }

    if (suppressAudioMarkerPersist.current) {
      suppressAudioMarkerPersist.current = false;
      return;
    }

    window.localStorage.setItem(getAudioMarkerStorageKey(testId), JSON.stringify(audioMarkers));
  }, [audioMarkers, testId]);

  const questions = useMemo(() => {
    if (!examData?.groups) return [];

    return examData.groups.flatMap((group) =>
      group.questions.map((question) => ({
        ...question,
        partNo: group.partNo,
      }))
    );
  }, [examData]);

  const questionsByPart = useMemo(() => {
    const result = {};

    questions.forEach((question) => {
      if (!result[question.partNo]) {
        result[question.partNo] = [];
      }

      result[question.partNo].push(question);
    });

    return result;
  }, [questions]);

  const groupsByPart = useMemo(() => {
    if (!examData?.groups) return {};

    const result = {};

    examData.groups.forEach((group) => {
      if (!result[group.partNo]) {
        result[group.partNo] = [];
      }

      result[group.partNo].push(group);
    });

    return result;
  }, [examData]);

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = examData?.totalQuestions || questions.length || 200;
  const progressPercent =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const handleChooseAnswer = (questionId, optionLabel) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionLabel,
    }));
  };

  const handleScrollToQuestion = (questionNo, partNo) => {
    setActivePart(partNo);

    const element = document.getElementById(`question-${questionNo}`);

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  const clearAudioMarkers = () => {
    suppressAudioMarkerPersist.current = true;
    setAudioMarkers([]);

    if (typeof window !== 'undefined' && testId) {
      window.localStorage.removeItem(getAudioMarkerStorageKey(testId));
    }
  };

  const handleBackToExamList = () => {
    clearAudioMarkers();
    navigate('/exams/toeic');
  };

  const handleAudioLoadedMetadata = (event) => {
    setAudioDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0);
  };

  const handleAudioTimeUpdate = (event) => {
    setAudioCurrentTime(event.currentTarget.currentTime || 0);
  };

  const handleAudioTimelineClick = (event) => {
    if (!audioDuration || !audioRef.current) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min((event.clientX - rect.left) / rect.width, 1));
    const targetTime = ratio * audioDuration;

    audioRef.current.currentTime = targetTime;
    setAudioCurrentTime(targetTime);
  };

  const handleAddAudioMarker = () => {
    if (!audioDuration) {
      return;
    }

    const markerTime = clampTime(audioCurrentTime, audioDuration);
    const marker = {
      id: `${Date.now()}-${Math.round(markerTime * 1000)}`,
      time: markerTime,
    };

    setAudioMarkers((prev) => [...prev, marker].sort((a, b) => a.time - b.time));
  };

  const handleJumpToMarker = (markerTime) => {
    if (!audioRef.current) {
      return;
    }

    const nextTime = clampTime(markerTime, audioDuration);
    audioRef.current.currentTime = nextTime;
    setAudioCurrentTime(nextTime);
  };

  const handleRemoveAudioMarker = (markerId) => {
    setAudioMarkers((prev) => prev.filter((marker) => marker.id !== markerId));
  };

  const getVisibleOptions = (options = [], partNo) => {
    if (Number(partNo) === 2) {
      return options.filter((option) =>
        ['A', 'B', 'C'].includes(option.optionLabel?.toUpperCase())
      );
    }

    return options;
  };

  const shouldShowOptionText = (partNo) => ![1, 2].includes(Number(partNo));

  const shouldShowQuestionText = (partNo, questionText) =>
    ![1, 2].includes(Number(partNo)) && questionText?.trim();

  const getQuestionImage = (question, imageMaterials, partNo) => {
    if (question.imageUrl) {
      return question.imageUrl;
    }

    if (Number(partNo) === 1 && imageMaterials.length > 0) {
      return imageMaterials[0].assetUrl;
    }

    return null;
  };

  // Nộp bài thi và chuyển đến trang kết quả
  const handleSubmitExam = async () => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;

    if (!token) {
      alert('Bạn cần đăng nhập để nộp bài và lưu kết quả.');
      navigate('/login');
      return;
    }

    const confirmSubmit = window.confirm(
      `Bạn đã chọn ${answeredCount}/${totalQuestions} câu. Bạn có chắc chắn muốn nộp bài không?`
    );

    if (!confirmSubmit) {
      return;
    }

    try {
      setSubmitting(true);

      const answerPayload = Object.entries(answers).map(([questionId, selectedLabel]) => ({
        questionId: Number(questionId),
        selectedLabel,
      }));

      const response = await toeicAPI.submitToeicExam(testId, answerPayload);

      if (response.success) {
        clearAudioMarkers();
        navigate(`/practice/toeic/result/${response.data.attemptId}`, {
          state: {
            result: response.data,
          },
        });
      } else {
        alert(response.message || 'Nộp bài thất bại');
      }
    } catch (err) {
      alert(err.message || 'Có lỗi xảy ra khi nộp bài');
      console.error('Submit TOEIC exam error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Xử lý gửi tin nhắn chat
  const handleSendChatMessage = (e) => {
    e.preventDefault();

    const message = chatInput.trim();

    if (!message) {
      return;
    }

    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: 'user',
        content: message,
      },
      {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Mình đã nhận câu hỏi của bạn.',
      },
    ]);

    setChatInput('');
  };

  if (loading) {
    return (
      <main className={styles.practicePage}>
        <div className={styles.emptyState}>
          <h2>Đang tải đề thi...</h2>
          <p>Vui lòng chờ trong giây lát.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.practicePage}>
        <div className={styles.emptyState}>
          <h2>Không thể tải đề thi</h2>
          <p>{error}</p>

          <button type="button" onClick={fetchPracticeExam}>
            Thử lại
          </button>
        </div>
      </main>
    );
  }

  if (!examData) {
    return (
      <main className={styles.practicePage}>
        <div className={styles.emptyState}>
          <h2>Không có dữ liệu đề thi</h2>
          <p>Vui lòng kiểm tra lại database hoặc API backend.</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.practicePage}>
      <section className={styles.stickyExamBar}>
        <div className={styles.examBarInner}>
          <div className={styles.examBarControls}>
            <button
              type="button"
              className={styles.backButton}
              onClick={handleBackToExamList}
            >
              ← Kho đề
            </button>

 <div className={styles.audioDock}>
            <div className={styles.audioBox}>
              {examData.listeningAudioUrl ? (
                <>
                  <audio
                    ref={audioRef}
                    controls
                    src={examData.listeningAudioUrl}
                    className={styles.audioPlayer}
                    onLoadedMetadata={handleAudioLoadedMetadata}
                    onTimeUpdate={handleAudioTimeUpdate}
                  >
                    Trình duyệt của bạn không hỗ trợ audio.
                  </audio>

                  <div className={styles.audioMarkerTopBar}>
                    {/* <span className={styles.audioTimeText}>
                      {formatAudioTime(audioCurrentTime)} / {formatAudioTime(audioDuration)}
                    </span> */}

                    <button
                      type="button"
                      className={styles.audioMarkerButton}
                      onClick={handleAddAudioMarker}
                      disabled={!audioDuration}
                    >
                      Đánh dấu
                    </button>
                  </div>

                      <div className={styles.audioMarkerPanelWrap}>
                    <button
                      type="button"
                      className={styles.audioMarkerPanelToggle}
                      onClick={() => setIsAudioMarkerPanelOpen((prev) => !prev)}
                      aria-expanded={isAudioMarkerPanelOpen}
                    >
                      <span>Đã đánh dấu {audioMarkers.length}</span>
                      <strong>
                        {isAudioMarkerPanelOpen ? 'Thu gọn' : 'Mở rộng'}
                      </strong>
                    </button>

                    {isAudioMarkerPanelOpen && (
                      <div className={styles.audioMarkerPanel}>
                        <div className={styles.audioMarkerPanelHeader}>
                          <span>Danh sách mốc thời gian</span>
                          {audioMarkers.length > 0 && (
                            <button
                              type="button"
                              className={styles.audioMarkerPanelClear}
                              onClick={clearAudioMarkers}
                            >
                              Xóa tất cả
                            </button>
                          )}
                        </div>

                        {audioMarkers.length > 0 ? (
                          <div className={styles.audioMarkerGrid}>
                            {audioMarkers.map((marker, index) => (
                              <div key={marker.id} className={styles.audioMarkerRow}>
                                <button
                                  type="button"
                                  className={styles.audioMarkerJump}
                                  onClick={() => handleJumpToMarker(marker.time)}
                                  title="Bấm để chuyển đến mốc"
                                >
                                  {index + 1}. {formatAudioTime(marker.time)}
                                </button>

                                <button
                                  type="button"
                                  className={styles.audioMarkerDelete}
                                  onClick={() => handleRemoveAudioMarker(marker.id)}
                                  aria-label={`Xóa mốc ${index + 1}`}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className={styles.audioMarkersEmpty}>Chưa có đánh dấu nào.</p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p>Chưa có audio cho đề này.</p>
              )}
            </div>
          </div>
            

            <button
              type="button"
              className={styles.submitButton}
              onClick={handleSubmitExam}
              disabled={submitting}
            >
              {submitting ? 'Đang nộp...' : 'Nộp bài'}
            </button>
          </div>

          <div className={styles.examBarTop}>
            <div className={styles.examMeta}>
              <div>
                {/* <h1>ETS 2021 - Test 01</h1> */}
              </div>
            </div>
          </div>

      
        </div>
      </section>

      <section className={styles.bodyLayout}>
        <aside className={styles.questionNavigator}>
          <div className={styles.navigatorHeader}>
            <h3>Bảng câu hỏi</h3>
            <p>Click vào số câu để di chuyển nhanh.</p>
          </div>

          {Object.entries(questionsByPart).map(([partNo, partQuestions]) => (
            <div key={partNo} className={styles.partNavBlock}>
              <button
                type="button"
                className={`${styles.partNavTitle} ${
                  Number(activePart) === Number(partNo) ? styles.activePart : ''
                }`}
                onClick={() => setActivePart(Number(partNo))}
              >
                PART {partNo}
              </button>

              <div className={styles.numberGrid}>
                {partQuestions.map((question) => (
                  <button
                    key={question.questionId}
                    type="button"
                    className={`${styles.numberButton} ${
                      answers[question.questionId] ? styles.answeredNumber : ''
                    }`}
                    onClick={() =>
                      handleScrollToQuestion(question.questionNo, Number(partNo))
                    }
                  >
                    {question.questionNo}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <section className={styles.examContent}>
          {Object.entries(groupsByPart).map(([partNo, partGroups]) => (
            <section key={partNo} className={styles.partSection}>
              <div className={styles.partHeader}>
                <h2>PART {partNo}</h2>
              </div>

              <div className={styles.partGroups}>
                {partGroups.map((group) => {
                  const numberPart = Number(partNo);
                  const imageMaterials = group.materials?.filter(isImageMaterial) || [];
                  const textMaterials = group.materials?.filter(isTextMaterial) || [];
                  const passageMap = new Map();

                  const addPassage = (text) => {
                    const normalized = normalizeContent(text);
                    if (!normalized || passageMap.has(normalized)) {
                      return;
                    }
                    passageMap.set(normalized, text);
                  };

                  const shouldShowGroupImages = numberPart >= 6 && imageMaterials.length > 0;
                  const shouldShowPassage =
                    numberPart >= 6 && (group.sharedText || textMaterials.length > 0);

                  addPassage(group.sharedText);
                  textMaterials.forEach((material) => addPassage(material.content));

                  return (
                    <article key={group.groupId} className={styles.groupCard}>
                      {shouldShowGroupImages && (
                        <div className={styles.materialGrid}>
                          {imageMaterials.map((material) => (
                            <div key={material.id} className={styles.materialImageCard}>
                              <img
                                src={material.assetUrl}
                                alt={material.content || 'TOEIC material'}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {shouldShowPassage && (
                        <div className={styles.passageBox}>
                          {Array.from(passageMap.entries()).map(([key, text]) => (
                            <p key={key}>{text}</p>
                          ))}
                        </div>
                      )}

                      <div className={styles.questionList}>
                        {group.questions.map((question) => {
                          const questionImage = getQuestionImage(
                            question,
                            imageMaterials,
                            numberPart
                          );

                          const visibleOptions = getVisibleOptions(question.options, numberPart);
                          const hideOptionText = !shouldShowOptionText(numberPart);

                          return (
                            <div
                              key={question.questionId}
                              id={`question-${question.questionNo}`}
                              className={styles.questionCard}
                            >
                              <div className={styles.questionTop}>
                                <span className={styles.questionIndex}>
                                  Câu {question.questionNo}
                                </span>

                                {answers[question.questionId] && (
                                  <strong>Đã chọn {answers[question.questionId]}</strong>
                                )}
                              </div>

                              {questionImage && (
                                <div className={styles.questionImageBox}>
                                  <img
                                    src={questionImage}
                                    alt={`Question ${question.questionNo}`}
                                  />
                                </div>
                              )}

                              {shouldShowQuestionText(numberPart, question.questionText) && (
                                <p className={styles.questionText}>{question.questionText}</p>
                              )}

                              <div
                                className={`${styles.optionList} ${
                                  hideOptionText ? styles.shortOptionList : ''
                                }`}
                              >
                                {visibleOptions.map((option) => (
                                  <label
                                    key={
                                      option.optionId ||
                                      `${question.questionId}-${option.optionLabel}`
                                    }
                                    className={`${styles.optionItem} ${
                                      answers[question.questionId] === option.optionLabel
                                        ? styles.selectedOption
                                        : ''
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`question-${question.questionId}`}
                                      value={option.optionLabel}
                                      checked={
                                        answers[question.questionId] === option.optionLabel
                                      }
                                      onChange={() =>
                                        handleChooseAnswer(
                                          question.questionId,
                                          option.optionLabel
                                        )
                                      }
                                    />

                                    <span className={styles.optionLabel}>
                                      {option.optionLabel}
                                    </span>

                                    {!hideOptionText && (
                                      <span className={styles.optionText}>
                                        {option.optionText || `Đáp án ${option.optionLabel}`}
                                      </span>
                                    )}
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </section>
      </section>

      <div className={styles.examChatbot}>
        {!isChatOpen ? (
          <button
            type="button"
            className={styles.chatFloatingButton}
            onClick={() => setIsChatOpen(true)}
            aria-label="Mở trợ lý luyện đề"
          >
            <strong>Chat bot</strong>
          </button>
        ) : (
          <div className={styles.chatWindow}>
            <div className={styles.chatHeader}>
              <div>
                <strong>Trợ lý luyện đề TOEIC</strong>
                <span>Hỗ trợ phân tích câu hỏi</span>
              </div>

              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                aria-label="Đóng chatbot"
              >
                ×
              </button>
            </div>

            <div className={styles.chatBody}>
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`${styles.chatMessage} ${
                    message.role === 'user' ? styles.userMessage : styles.assistantMessage
                  }`}
                >
                  {message.content}
                </div>
              ))}
            </div>

            <form className={styles.chatForm} onSubmit={handleSendChatMessage}>
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Copy câu hỏi bạn muốn hỏi vào đây..."
                rows={2}
              />

              <button type="submit">Gửi</button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
};

export default ToeicPractice;
