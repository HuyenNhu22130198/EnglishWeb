import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI, getStoredToken } from '../services/authService';
import { toeicAPI } from '../services/toeicService';
import { getFlashcardStorageKey } from '../utils/flashcardStorage';
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
const getMaterialQuestionNo = (material) => {
  const source = material.assetUrl || material.content || '';
  const fileName = decodeURIComponent(source.split(/[?#]/)[0].split('/').pop() || '');
  const match = fileName.match(/[_-](\d{1,3})(?:\.[a-z0-9]+)?$/i);

  return match ? Number(match[1]) : null;
};
const AUDIO_MARKER_STORAGE_PREFIX = 'toeic-practice-audio-markers';
const HIGHLIGHT_STORAGE_PREFIX = 'toeic-practice-highlights';
const ELAPSED_TIME_STORAGE_PREFIX = 'toeic-practice-elapsed-time';
const HIGHLIGHT_PALETTE = [
  { key: 'cyan', color: '#a5f3fc' },
  { key: 'pink', color: '#fbcfe8' },
  { key: 'green', color: '#bbf7d0' },
  { key: 'yellow', color: '#fef08a' },
];
const MARKER_STORAGE_NAMES = ['sessionStorage', 'localStorage'];

const emptyFlashcardForm = {
  deckMode: 'existing',
  deckName: 'TOEIC',
  newDeckName: '',
  term: '',
  pronunciation: '',
  wordType: '',
  meaning: '',
  example: '',
  level: 'Basic',
};

const loadStoredJson = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const loadFlashcardDeckNames = (user) => {
  if (typeof window === 'undefined') {
    return ['TOEIC'];
  }

  try {
    const storageKey = getFlashcardStorageKey(user);

    if (!storageKey) {
      return ['TOEIC'];
    }

    const storedCards = loadStoredJson(storageKey, []);
    const deckNames = new Set(['TOEIC']);

    storedCards.forEach((card) => {
      if (card?.topic) {
        deckNames.add(card.topic);
      }
    });

    return Array.from(deckNames);
  } catch {
    return ['TOEIC'];
  }
};

const createFlashcardId = (fallbackSeed = '') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `custom-${fallbackSeed || Date.now()}`;
};

const getAudioMarkerStorageKey = (examId) => `${AUDIO_MARKER_STORAGE_PREFIX}:${examId}`;
const getHighlightStorageKey = (examId) => `${HIGHLIGHT_STORAGE_PREFIX}:${examId}`;
const getElapsedTimeStorageKey = (attemptId) => `${ELAPSED_TIME_STORAGE_PREFIX}:${attemptId}`;
const getHighlightColor = (colorKey) =>
  HIGHLIGHT_PALETTE.find((item) => item.key === colorKey)?.color || '#fef08a';
const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

const formatAudioTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainderSeconds = totalSeconds % 60;

  return `${minutes}:${String(remainderSeconds).padStart(2, '0')}`;
};

const formatPracticeElapsedTime = (seconds) => {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const remainderSeconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainderSeconds).padStart(2, '0')}`;
};

const clampTime = (value, max) => Math.max(0, Math.min(value, max || 0));

const normalizeHighlightAnnotations = (annotations = []) => {
  return annotations
    .filter(isPlainObject)
    .map((annotation) => {
      const start = Math.max(0, Number(annotation.start) || 0);
      const end = Math.max(0, Number(annotation.end) || 0);
      const kind = ['underline', 'strike'].includes(annotation.kind) ? annotation.kind : 'highlight';
      const colorKey = HIGHLIGHT_PALETTE.some((item) => item.key === annotation.colorKey)
        ? annotation.colorKey
        : 'yellow';

      return { start, end, kind, colorKey };
    })
    .filter((annotation) => annotation.end > annotation.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
};

const normalizeLegacyHighlightAnnotations = (annotations = []) => {
  return annotations
    .filter(isPlainObject)
    .map((annotation) => ({
      start: annotation.start,
      end: annotation.end,
      kind: 'highlight',
      colorKey: 'yellow',
    }));
};

const readHighlights = (examId) => {
  if (!examId || typeof window === 'undefined') {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(getHighlightStorageKey(examId));

    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce((acc, [blockKey, annotations]) => {
      if (!Array.isArray(annotations)) {
        return acc;
      }

      const normalizedAnnotations = normalizeHighlightAnnotations(
        annotations.some((annotation) =>
          isPlainObject(annotation) && ('kind' in annotation || 'colorKey' in annotation)
        )
          ? annotations
          : normalizeLegacyHighlightAnnotations(annotations)
      );

      if (normalizedAnnotations.length > 0) {
        acc[blockKey] = normalizedAnnotations;
      }

      return acc;
    }, {});
  } catch (error) {
    console.error('Failed to read highlights:', error);
    return {};
  }
};

const getTextOffsetWithinRoot = (root, targetNode, targetOffset) => {
  if (!root || !targetNode || typeof document === 'undefined') {
    return null;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();
  let offset = 0;

  while (currentNode) {
    if (currentNode === targetNode) {
      return offset + targetOffset;
    }

    offset += currentNode.textContent?.length || 0;
    currentNode = walker.nextNode();
  }

  return null;
};

const renderHighlightedText = (text, annotations = [], stylesMap = {}) => {
  if (!text) {
    return '';
  }

  const normalizedAnnotations = normalizeHighlightAnnotations(annotations);

  if (normalizedAnnotations.length === 0) {
    return text;
  }

  const nodes = [];
  let cursor = 0;

  normalizedAnnotations.forEach((annotation, index) => {
    if (annotation.start > cursor) {
      nodes.push(text.slice(cursor, annotation.start));
    }

    nodes.push(
      <span
        key={`${annotation.start}-${annotation.end}-${index}`}
        className={`${stylesMap.segment || ''} ${stylesMap[annotation.kind] || ''}`}
        style={annotation.kind === 'highlight' ? { backgroundColor: getHighlightColor(annotation.colorKey) } : {}}
      >
        {text.slice(annotation.start, annotation.end)}
      </span>
    );

    cursor = annotation.end;
  });

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
};

const getMarkerStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  for (const storageName of MARKER_STORAGE_NAMES) {
    try {
      const storage = window[storageName];
      const probeKey = '__toeic_marker_probe__';
      storage.setItem(probeKey, '1');
      storage.removeItem(probeKey);
      return storage;
    } catch {
      // Try next storage option.
    }
  }

  return null;
};

const readAudioMarkers = (examId) => {
  if (!examId) {
    return [];
  }

  try {
    const storage = getMarkerStorage();

    if (!storage) {
      return [];
    }

    const rawValue = storage.getItem(getAudioMarkerStorageKey(examId));

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

const writeAudioMarkers = (examId, markers) => {
  if (!examId) {
    return false;
  }

  try {
    const storage = getMarkerStorage();

    if (!storage) {
      return false;
    }

    storage.setItem(getAudioMarkerStorageKey(examId), JSON.stringify(markers));
    return true;
  } catch (error) {
    console.error('Failed to save audio markers:', error);
    return false;
  }
};

const removeAudioMarkersFromStorage = (examId) => {
  if (!examId) {
    return false;
  }

  try {
    const storage = getMarkerStorage();

    if (!storage) {
      return false;
    }

    storage.removeItem(getAudioMarkerStorageKey(examId));
    return true;
  } catch (error) {
    console.error('Failed to remove audio markers:', error);
    return false;
  }
};

const ToeicPractice = () => {
  const { user } = useAuth();
  const { testId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [submitNotice, setSubmitNotice] = useState(null);
  const [isAudioMarkerPanelOpen, setIsAudioMarkerPanelOpen] = useState(false);
  const [isHighlightModeEnabled, setIsHighlightModeEnabled] = useState(false);
  const [highlightToolbar, setHighlightToolbar] = useState(null);
  const [markerStorageWarning, setMarkerStorageWarning] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content:
"Bạn đang vướng câu nào? Hãy copy nguyên câu hỏi hoặc đoạn đáp án bạn muốn hỏi vào đây, mình sẽ hỗ trợ bạn phân tích cách làm nhé",
    },
  ]);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioMarkers, setAudioMarkers] = useState([]);
  const [highlights, setHighlights] = useState({});
  const [activeHighlightColor, setActiveHighlightColor] = useState('yellow');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [reviewQuestionIds, setReviewQuestionIds] = useState(() => new Set());
  const [flashcardModalOpen, setFlashcardModalOpen] = useState(false);
  const [flashcardError, setFlashcardError] = useState('');
  const [flashcardDeckNames, setFlashcardDeckNames] = useState(() =>
    loadFlashcardDeckNames(authAPI.getStoredUser())
  );
  const [flashcardForm, setFlashcardForm] = useState(emptyFlashcardForm);
  const selectedParts = useMemo(() => {
    const rawParts = searchParams.getAll('parts').flatMap((value) => value.split(','));
    const normalizedParts = rawParts
      .map((value) => Number(value))
      .filter((part) => Number.isInteger(part) && part >= 1 && part <= 7);

    return Array.from(new Set(normalizedParts)).sort((a, b) => a - b);
  }, [searchParams]);
  const shouldShowAudioBar =
    selectedParts.length === 0 || selectedParts.some((part) => part >= 1 && part <= 4);

  const fetchPracticeExam = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await toeicAPI.getToeicPractice(testId, selectedParts);

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
  }, [selectedParts, testId]);

  useEffect(() => {
    fetchPracticeExam();
  }, [fetchPracticeExam]);

  useEffect(() => {
    setElapsedSeconds(0);
    setReviewQuestionIds(new Set());
  }, [testId]);

  useEffect(() => {
    if (!examData || loading) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [examData, loading]);

  useEffect(() => {
    setAudioMarkers(readAudioMarkers(testId));
    setAudioDuration(0);
    setAudioCurrentTime(0);
    setIsAudioMarkerPanelOpen(false);
  }, [testId]);

  useEffect(() => {
    if (!testId) {
      setMarkerStorageWarning('');
      return;
    }

    setMarkerStorageWarning(
      getMarkerStorage()
        ? ''
        : 'Trình duyệt đang chặn lưu đánh dấu. Hãy cho phép lưu dữ liệu trang để giữ danh sách mốc thời gian.'
    );
  }, [testId]);

  useEffect(() => {
    setHighlights(readHighlights(testId));
    setIsHighlightModeEnabled(false);
    setHighlightToolbar(null);
  }, [testId]);

  useEffect(() => {
    if (!testId || typeof window === 'undefined') {
      return;
    }

    if (suppressAudioMarkerPersist.current) {
      suppressAudioMarkerPersist.current = false;
      return;
    }

    writeAudioMarkers(testId, audioMarkers);
  }, [audioMarkers, testId]);

  useEffect(() => {
    if (!testId || typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(getHighlightStorageKey(testId), JSON.stringify(highlights));
    } catch (error) {
      console.error('Failed to save highlights:', error);
    }
  }, [highlights, testId]);

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
  const practiceElapsedTime = formatPracticeElapsedTime(elapsedSeconds);

  const handleChooseAnswer = (questionId, optionLabel) => {
    if (submitNotice) {
      setSubmitNotice(null);
    }

    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionLabel,
    }));
  };

  const toggleReviewQuestion = (questionId) => {
    setReviewQuestionIds((prev) => {
      const next = new Set(prev);

      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }

      return next;
    });
  };

  const refreshFlashcardDeckNames = useCallback(() => {
    setFlashcardDeckNames(loadFlashcardDeckNames(user));
  }, [user]);

  useEffect(() => {
    refreshFlashcardDeckNames();
  }, [refreshFlashcardDeckNames]);

  const openFlashcardModal = () => {
    if (!user) {
      setSubmitNotice({
        type: 'warning',
        title: 'Bạn cần đăng nhập để lưu flashcard',
        message: 'Đăng nhập để tạo bộ thẻ và lưu từ vựng riêng của bạn.',
        action: 'login',
      });
      return;
    }

    const selectedTerm = (highlightToolbar?.text || '').trim();

    setFlashcardError('');
    setFlashcardForm((current) => ({
      ...emptyFlashcardForm,
      deckName: flashcardDeckNames[0] || 'TOEIC',
      term: selectedTerm || current.term,
    }));
    setFlashcardModalOpen(true);
    refreshFlashcardDeckNames();
  };

  const closeFlashcardModal = () => {
    setFlashcardModalOpen(false);
    setFlashcardError('');
    setFlashcardForm(emptyFlashcardForm);
  };

  const handleFlashcardFormChange = (event) => {
    const { name, value } = event.target;
    setFlashcardForm((current) => ({ ...current, [name]: value }));
    setFlashcardError('');
  };

  const handleFlashcardDeckModeChange = (mode) => {
    setFlashcardForm((current) => ({
      ...current,
      deckMode: mode,
      deckName: mode === 'existing' ? flashcardDeckNames[0] || 'TOEIC' : current.deckName,
      newDeckName: mode === 'new' ? current.newDeckName : '',
    }));
    setFlashcardError('');
  };

  const saveFlashcardFromPractice = (event) => {
    event.preventDefault();

    if (!user) {
      setFlashcardError('Vui lòng đăng nhập để lưu flashcard của bạn.');
      return;
    }

    const term = flashcardForm.term.trim();
    const meaning = flashcardForm.meaning.trim();
    const deckName =
      flashcardForm.deckMode === 'new'
        ? flashcardForm.newDeckName.trim()
        : flashcardForm.deckName.trim();

    if (!term || !meaning) {
      setFlashcardError('Vui lòng nhập đầy đủ Từ vựng và Nghĩa tiếng Việt.');
      return;
    }

    if (!deckName) {
      setFlashcardError('Vui lòng chọn hoặc nhập tên bộ thẻ.');
      return;
    }

    const storageKey = getFlashcardStorageKey(user);

    if (!storageKey) {
      setFlashcardError('Không xác định được tài khoản để lưu flashcard.');
      return;
    }

    const newCard = {
      id: createFlashcardId(term),
      term,
      pronunciation: flashcardForm.pronunciation.trim(),
      wordType: flashcardForm.wordType.trim(),
      meaning,
      example: flashcardForm.example.trim(),
      topic: deckName,
      level: flashcardForm.level,
    };

    const storedCards = loadStoredJson(storageKey, []);
    const nextCards = [newCard, ...storedCards];

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextCards));
    } catch (storageError) {
      console.error('Failed to save flashcard from practice:', storageError);
      setFlashcardError('Không thể lưu flashcard lúc này. Vui lòng thử lại.');
      return;
    }

    refreshFlashcardDeckNames();
    closeFlashcardModal();
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
    removeAudioMarkersFromStorage(testId);
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

  const handleAddAudioMarker = () => {
    if (!audioDuration) {
      return;
    }

    const markerTime = clampTime(audioCurrentTime, audioDuration);
    const marker = {
      id: `${Date.now()}-${Math.round(markerTime * 1000)}`,
      time: markerTime,
    };

    setAudioMarkers((prev) => {
      const nextMarkers = [...prev, marker].sort((a, b) => a.time - b.time);
      writeAudioMarkers(testId, nextMarkers);

      return nextMarkers;
    });
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
    setAudioMarkers((prev) => {
      const nextMarkers = prev.filter((marker) => marker.id !== markerId);
      writeAudioMarkers(testId, nextMarkers);

      return nextMarkers;
    });
  };

  const removeHighlightsInRange = (blockHighlights, start, end) => {
    return (blockHighlights || []).filter((annotation) => {
      return annotation.end <= start || annotation.start >= end;
    });
  };

  const applyHighlightAnnotation = (kind, colorKey = activeHighlightColor) => {
    if (!highlightToolbar) {
      return;
    }

    const { blockKey, start, end } = highlightToolbar;

    setHighlights((prev) => {
      const nextHighlights = removeHighlightsInRange(prev[blockKey] || [], start, end);

      if (kind !== 'remove') {
        nextHighlights.push({
          start,
          end,
          kind,
          colorKey: kind === 'highlight' ? colorKey : 'yellow',
        });
      }

      return {
        ...prev,
        [blockKey]: normalizeHighlightAnnotations(nextHighlights),
      };
    });

    setHighlightToolbar(null);

    if (typeof window !== 'undefined') {
      window.getSelection?.().removeAllRanges?.();
    }
  };

  const handleHighlightTextMouseUp = (blockKey, text, event) => {
    if (!isHighlightModeEnabled || !text || typeof window === 'undefined') {
      return;
    }

    const selection = window.getSelection?.();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }

    const root = event.currentTarget;
    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;

    if (!root.contains(anchorNode) || !root.contains(focusNode)) {
      return;
    }

    const range = selection.getRangeAt(0);
    const start = getTextOffsetWithinRoot(root, range.startContainer, range.startOffset);
    const end = getTextOffsetWithinRoot(root, range.endContainer, range.endOffset);

    if (start == null || end == null) {
      return;
    }

    const normalizedStart = Math.max(0, Math.min(start, end));
    const normalizedEnd = Math.min(text.length, Math.max(start, end));
    const selectedText = text.slice(normalizedStart, normalizedEnd).trim();

    if (!selectedText) {
      return;
    }

    const rect = range.getBoundingClientRect();
    const toolbarWidth = 320;
    const toolbarHeight = 42;
    const preferredTop = rect.top - toolbarHeight - 10;
    const fallbackTop = rect.bottom + 10;
    const top =
      preferredTop >= 8
        ? preferredTop
        : Math.min(fallbackTop, Math.max(8, window.innerHeight - toolbarHeight - 8));
    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - toolbarWidth / 2, 12),
      Math.max(12, window.innerWidth - toolbarWidth - 12)
    );

    setHighlightToolbar({
      blockKey,
      start: normalizedStart,
      end: normalizedEnd,
      text: selectedText,
      top,
      left,
    });
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
    if ([6, 7].includes(Number(partNo))) {
      return null;
    }

    if (question.imageUrl) {
      return question.imageUrl;
    }

    if (Number(partNo) === 1 && imageMaterials.length > 0) {
      return imageMaterials[0].assetUrl;
    }

    if ([3, 4].includes(Number(partNo))) {
      const matchingMaterial = imageMaterials.find(
        (material) => getMaterialQuestionNo(material) === Number(question.questionNo)
      );

      return matchingMaterial?.assetUrl || null;
    }

    return null;
  };

  const highlightRenderStyles = {
    segment: styles.highlightSegment,
    highlight: styles.textHighlight,
    underline: styles.underlineHighlight,
    strike: styles.strikeHighlight,
  };

  // Nộp bài thi và chuyển đến trang kết quả
  const handleSubmitExam = async () => {
    setSubmitNotice(null);

    const token = typeof window !== 'undefined' ? getStoredToken() : null;

    if (!token) {
      setSubmitNotice({
        type: 'warning',
        title: 'Bạn cần đăng nhập để nộp bài',
        message: 'Đăng nhập giúp hệ thống lưu kết quả TOEIC và lịch sử làm bài của bạn.',
        action: 'login',
      });
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

      const response = await toeicAPI.submitToeicExam(testId, answerPayload, selectedParts);

      if (response.success) {
        const resultWithElapsedTime = {
          ...response.data,
          elapsedSeconds,
        };

        try {
          window.sessionStorage.setItem(
            getElapsedTimeStorageKey(response.data.attemptId),
            String(elapsedSeconds)
          );
        } catch {
          // Result page still receives elapsedSeconds through navigation state.
        }

        navigate(`/practice/toeic/result/${response.data.attemptId}`, {
          state: {
            result: resultWithElapsedTime,
            elapsedSeconds,
            audioMarkers,
          },
        });
      } else {
        setSubmitNotice({
          type: 'error',
          title: 'Nộp bài chưa thành công',
          message: response.message || 'Hệ thống chưa thể ghi nhận bài làm. Vui lòng thử lại.',
        });
      }
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        window.localStorage.removeItem('token');
        window.localStorage.removeItem('user');
        setSubmitNotice({
          type: 'warning',
          title: 'Phiên đăng nhập đã hết hạn',
          message: err.message || 'Vui lòng đăng nhập lại rồi nộp bài để lưu kết quả.',
          action: 'login',
        });
        return;
      }

      setSubmitNotice({
        type: 'error',
        title: 'Không thể nộp bài TOEIC',
        message:
          err.message ||
          'Có lỗi xảy ra khi gửi bài làm lên hệ thống. Kiểm tra kết nối và thử lại.',
      });
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
          <h2>Không thể tải đề thi...</h2>
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
    <main
      className={`${styles.practicePage} ${
        shouldShowAudioBar ? '' : styles.practicePageCompact
      }`}
    >
      <section className={styles.stickyExamBar}>
        <div className={styles.examBarInner}>
          <div
            className={`${styles.examBarControls} ${
              shouldShowAudioBar ? '' : styles.examBarControlsCompact
            }`}
          >
            <button
              type="button"
              className={styles.topBackButton}
              onClick={handleBackToExamList}
            >
              ← Quay lại
            </button>

            {shouldShowAudioBar && (
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
                            {isAudioMarkerPanelOpen ? 'Thu gọn' : 'Mở rộngs'}
                          </strong>
                        </button>

                        {markerStorageWarning && (
                          <p className={styles.audioStorageWarning}>{markerStorageWarning}</p>
                        )}

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
                                    X
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
            )}
            

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

      {submitNotice && (
        <div
          className={`${styles.submitNotice} ${
            submitNotice.type === 'warning' ? styles.submitNoticeWarning : styles.submitNoticeError
          }`}
          role="alert"
          aria-live="assertive"
        >
          <div className={styles.submitNoticeIcon} aria-hidden="true">
            !
          </div>
          <div className={styles.submitNoticeContent}>
            <strong>{submitNotice.title}</strong>
            <p>{submitNotice.message}</p>
          </div>
          <div className={styles.submitNoticeActions}>
            {submitNotice.action === 'login' && (
              <button type="button" onClick={() => navigate('/login')}>
                Đăng nhập
              </button>
            )}
            <button type="button" onClick={() => setSubmitNotice(null)} aria-label="Đóng thông báo">
              Đóng
            </button>
          </div>
        </div>
      )}

      <section className={styles.bodyLayout}>
        <aside className={styles.questionNavigator}>
          <div className={styles.navigatorHeader}>
            <h3>Bảng câu hỏi</h3>
            <div className={styles.navigatorTimer} aria-label={`Thời gian làm bài ${practiceElapsedTime}`}>
              <span className={styles.navigatorTimerLabel}>Thời gian</span>
              <span className={styles.navigatorTimerValue}>{practiceElapsedTime}</span>
            </div>
          </div>

          <div className={styles.highlightTool}>
              <button
                type="button"
                className={`${styles.highlightToggle} ${
                  isHighlightModeEnabled ? styles.highlightToggleActive : ''
                }`}
              onClick={() => {
                setIsHighlightModeEnabled((prev) => {
                  const next = !prev;
                  if (!next) {
                    setHighlightToolbar(null);
                  }
                  return next;
                });
              }}
              aria-pressed={isHighlightModeEnabled}
            >
              <span className={styles.highlightSwitch}>
                <span className={styles.highlightSwitchKnob} />
              </span>
              <span className={styles.highlightToggleLabel}>Highlight nội dung</span>
              {/* <span className={styles.highlightInfoIcon}>i</span> */}
            </button>
          </div>

          <div className={styles.navigatorLegend} aria-label="Chú thích trạng thái câu hỏi">
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendAnswered}`} />
              <span>Câu đã làm</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendUnanswered}`} />
              <span>Câu chưa làm</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendReview}`} />
              <span>Câu cần kiểm tra lại</span>
            </div>
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
                    } ${
                      reviewQuestionIds.has(question.questionId) ? styles.reviewNumber : ''
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

        {highlightToolbar && isHighlightModeEnabled && (
          <div
            className={styles.highlightToolbar}
            style={{ top: `${highlightToolbar.top}px`, left: `${highlightToolbar.left}px` }}
            onMouseDown={(event) => event.preventDefault()}
          >
            <div className={styles.highlightToolbarText}>{highlightToolbar.text}</div>

            <div className={styles.highlightToolbarActions}>
              {HIGHLIGHT_PALETTE.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`${styles.highlightColorButton} ${
                    activeHighlightColor === item.key ? styles.highlightColorButtonActive : ''
                  }`}
                  style={{ backgroundColor: item.color }}
                  aria-label={`Highlight màu${item.key}`}
                  onClick={() => {
                    setActiveHighlightColor(item.key);
                    applyHighlightAnnotation('highlight', item.key);
                  }}
                />
              ))}

              <button
                type="button"
                className={styles.highlightStyleButton}
                onClick={() => applyHighlightAnnotation('underline')}
                aria-label="Gạch dưới"
              >
                U
              </button>

              <button
                type="button"
                className={styles.highlightStyleButton}
                onClick={() => applyHighlightAnnotation('strike')}
                aria-label="Gạch ngang"
              >
                abc
              </button>

              <button
                type="button"
                className={styles.highlightRemoveButton}
                onClick={() => applyHighlightAnnotation('remove')}
                aria-label="Bỏ highlight"
              >
                X
              </button>

              <button
                type="button"
                className={styles.highlightFlashcardButton}
                onMouseDown={(event) => event.preventDefault()}
                onClick={openFlashcardModal}
                aria-label="Thêm vào flashcard"
                title="Thêm vào flashcard"
              >
                +
              </button>
            </div>
          </div>
        )}

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

                  const shouldShowGroupImages =
                    [6, 7].includes(numberPart) && imageMaterials.length > 0;
                  const shouldShowPassage =
                    numberPart >= 6 && (group.sharedText || textMaterials.length > 0);

                  addPassage(group.sharedText);
                  textMaterials.forEach((material) => addPassage(material.content));

                  return (
                    <article key={group.groupId} className={styles.groupCard}>
                      {shouldShowGroupImages && (
                        <div
                          className={`${styles.materialGrid} ${
                            numberPart === 7 ? styles.part7MaterialStack : ''
                          }`}
                        >
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
                            <p
                              key={key}
                              className={styles.highlightTextBlock}
                              data-highlight-target={key}
                              onMouseUp={(event) =>
                                handleHighlightTextMouseUp(`passage-${group.groupId}-${key}`, text, event)
                              }
                            >
                              {renderHighlightedText(
                                text,
                                highlights[`passage-${group.groupId}-${key}`] || [],
                                highlightRenderStyles
                              )}
                            </p>
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
                          const questionTextBlock = shouldShowQuestionText(
                            numberPart,
                            question.questionText
                          ) ? (
                            <p
                              className={`${styles.questionText} ${styles.highlightTextBlock}`}
                              data-highlight-target={`question-${question.questionId}`}
                              onMouseUp={(event) =>
                                handleHighlightTextMouseUp(
                                  `question-${question.questionId}`,
                                  question.questionText,
                                  event
                                )
                              }
                            >
                              {renderHighlightedText(
                                question.questionText,
                                highlights[`question-${question.questionId}`] || [],
                                highlightRenderStyles
                              )}
                            </p>
                          ) : null;

                          return (
                            <div
                              key={question.questionId}
                              id={`question-${question.questionNo}`}
                              className={styles.questionCard}
                            >
                              <div className={styles.questionTop}>
                                <div className={styles.questionTitleRow}>
                                  <button
                                    type="button"
                                    className={`${styles.questionIndex} ${
                                      reviewQuestionIds.has(question.questionId)
                                        ? styles.questionIndexMarked
                                        : ''
                                    }`}
                                    onClick={() => toggleReviewQuestion(question.questionId)}
                                    aria-pressed={reviewQuestionIds.has(question.questionId)}
                                    title="Đánh dấu câu cần kiểm tra lại"
                                  >
                                    Câu {question.questionNo}
                                  </button>

                                  {questionTextBlock}
                                </div>

                                {answers[question.questionId] && (
                                  <strong>Đã chọn {answers[question.questionId]}</strong>
                                )}
                              </div>

                              {questionImage ? (
                                <div
                                  className={`${styles.questionBodyWithImage} ${
                                    numberPart === 1 ? styles.part1QuestionLayout : ''
                                  } ${
                                    [3, 4].includes(numberPart) ? styles.part34QuestionLayout : ''
                                  }`}
                                >
                                  <div
                                    className={`${styles.questionImageColumn} ${
                                      numberPart === 1 ? styles.part1ImageColumn : ''
                                    }`}
                                  >
                                    <div className={styles.questionImageBox}>
                                      <img
                                        src={questionImage}
                                        alt={`Question ${question.questionNo}`}
                                      />
                                    </div>
                                  </div>

                                  <div
                                    className={`${styles.questionContentColumn} ${
                                      numberPart === 1 ? styles.part1OptionColumn : ''
                                    }`}
                                  >
                                    {numberPart === 1 ? (
                                      <div
                                        className={`${styles.optionList} ${styles.part1OptionList}`}
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
                                          </label>
                                        ))}
                                      </div>
                                    ) : (
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
                                              <span
                                                className={`${styles.optionText} ${styles.highlightTextBlock}`}
                                                data-highlight-target={`option-${question.questionId}-${option.optionLabel}`}
                                                onMouseUp={(event) =>
                                                  handleHighlightTextMouseUp(
                                                    `option-${question.questionId}-${option.optionLabel}`,
                                                    option.optionText ||
                                                      `Đáp án ${option.optionLabel}`,
                                                    event
                                                  )
                                                }
                                              >
                                                {renderHighlightedText(
                                                  option.optionText || `Đáp án ${option.optionLabel}`,
                                                  highlights[
                                                    `option-${question.questionId}-${option.optionLabel}`
                                                  ] || [],
                                                  highlightRenderStyles
                                                )}
                                              </span>
                                            )}
                                          </label>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <>
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
                                          <span
                                            className={`${styles.optionText} ${styles.highlightTextBlock}`}
                                            data-highlight-target={`option-${question.questionId}-${option.optionLabel}`}
                                            onMouseUp={(event) =>
                                              handleHighlightTextMouseUp(
                                                `option-${question.questionId}-${option.optionLabel}`,
                                                option.optionText || `Đáp án ${option.optionLabel}`,
                                                event
                                              )
                                            }
                                          >
                                            {renderHighlightedText(
                                              option.optionText || `Đáp án ${option.optionLabel}`,
                                              highlights[
                                                `option-${question.questionId}-${option.optionLabel}`
                                              ] || [],
                                              highlightRenderStyles
                                            )}
                                          </span>
                                        )}
                                      </label>
                                    ))}
                                  </div>
                                </>
                              )}
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

      {flashcardModalOpen && (
        <div className={styles.flashcardModalOverlay} onMouseDown={closeFlashcardModal}>
          <div
            className={styles.flashcardModal}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.flashcardModalClose}
              onClick={closeFlashcardModal}
              aria-label="Đóng"
            >
              X
            </button>

            <h2>Thêm flashcard mới</h2>

            <form className={styles.flashcardForm} onSubmit={saveFlashcardFromPractice}>
              <div className={styles.flashcardDeckMode}>
                <button
                  type="button"
                  className={
                    flashcardForm.deckMode === 'existing' ? styles.activeDeckMode : ''
                  }
                  onClick={() => handleFlashcardDeckModeChange('existing')}
                >
                  Bộ đã có
                </button>
                <button
                  type="button"
                  className={flashcardForm.deckMode === 'new' ? styles.activeDeckMode : ''}
                  onClick={() => handleFlashcardDeckModeChange('new')}
                >
                  + Tạo mới
                </button>
              </div>

              {flashcardForm.deckMode === 'existing' ? (
                <select
                  name="deckName"
                  value={flashcardForm.deckName}
                  onChange={handleFlashcardFormChange}
                >
                  {flashcardDeckNames.map((deckName) => (
                    <option key={deckName} value={deckName}>
                      {deckName}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name="newDeckName"
                  value={flashcardForm.newDeckName}
                  onChange={handleFlashcardFormChange}
                  placeholder="Tên bộ thẻ mới"
                />
              )}

              <label>
                Từ mới
                <input
                  name="term"
                  value={flashcardForm.term}
                  onChange={handleFlashcardFormChange}
                  placeholder="Từ vựng *"
                />
              </label>

              <label>
                Phiên âm
                <input
                  name="pronunciation"
                  value={flashcardForm.pronunciation}
                  onChange={handleFlashcardFormChange}
                  placeholder="Phiên âm"
                />
              </label>

              <label>
                Từ loại
                <input
                  name="wordType"
                  value={flashcardForm.wordType}
                  onChange={handleFlashcardFormChange}
                  placeholder="Từ loại"
                />
              </label>

              <label>
                Định nghĩa
                <textarea
                  name="meaning"
                  value={flashcardForm.meaning}
                  onChange={handleFlashcardFormChange}
                  placeholder="Nghĩa tiếng Việt *"
                  rows={4}
                />
              </label>

              <label>
                Ví dụ
                <textarea
                  name="example"
                  value={flashcardForm.example}
                  onChange={handleFlashcardFormChange}
                  placeholder="Câu ví dụ"
                  rows={3}
                />
              </label>

              <label>
                Độ khó
                <select name="level" value={flashcardForm.level} onChange={handleFlashcardFormChange}>
                  <option>Basic</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </label>

              {flashcardError ? <p className={styles.flashcardError}>{flashcardError}</p> : null}

              <div className={styles.flashcardModalActions}>
                <button type="submit" className={styles.flashcardSaveButton}>
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                Ã—
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

              <button type="submit">Gá»­i</button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
};

export default ToeicPractice;


