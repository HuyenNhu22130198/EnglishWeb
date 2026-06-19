import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getStoredToken } from '../services/authService';
import { toeicAPI } from '../services/toeicService';
import styles from './ToeicPractice.module.css';

const FLASHCARD_STORAGE_KEY = 'english-web-flashcards-v1';
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

const loadFlashcardDeckNames = () => {
  if (typeof window === 'undefined') {
    return ['TOEIC'];
  }

  try {
    const storedCards = loadStoredJson(FLASHCARD_STORAGE_KEY, []);
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
        'Báº¡n Ä‘ang vÆ°á»›ng cÃ¢u nÃ o? HÃ£y copy nguyÃªn cÃ¢u há»i hoáº·c Ä‘oáº¡n Ä‘Ã¡p Ã¡n báº¡n muá»‘n há»i vÃ o Ä‘Ã¢y, mÃ¬nh sáº½ há»— trá»£ báº¡n phÃ¢n tÃ­ch cÃ¡ch lÃ m nhÃ©.',
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
    loadFlashcardDeckNames()
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
        setError(response.message || 'KhÃ´ng thá»ƒ táº£i ná»™i dung Ä‘á» TOEIC');
      }
    } catch (err) {
      setError(err.message || 'Lá»—i káº¿t ná»‘i Ä‘áº¿n server');
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
        : 'TrÃ¬nh duyá»‡t Ä‘ang cháº·n lÆ°u Ä‘Ã¡nh dáº¥u. HÃ£y cho phÃ©p lÆ°u dá»¯ liá»‡u trang Ä‘á»ƒ giá»¯ danh sÃ¡ch má»‘c thá»i gian.'
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
    setFlashcardDeckNames(loadFlashcardDeckNames());
  }, []);

  const openFlashcardModal = () => {
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

    const term = flashcardForm.term.trim();
    const meaning = flashcardForm.meaning.trim();
    const deckName =
      flashcardForm.deckMode === 'new'
        ? flashcardForm.newDeckName.trim()
        : flashcardForm.deckName.trim();

    if (!term || !meaning) {
      setFlashcardError('Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ Tá»« vá»±ng vÃ  NghÄ©a tiáº¿ng Viá»‡t.');
      return;
    }

    if (!deckName) {
      setFlashcardError('Vui lÃ²ng chá»n hoáº·c nháº­p tÃªn bá»™ tháº».');
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

    const storedCards = loadStoredJson(FLASHCARD_STORAGE_KEY, []);
    const nextCards = [newCard, ...storedCards];

    try {
      window.localStorage.setItem(FLASHCARD_STORAGE_KEY, JSON.stringify(nextCards));
    } catch (storageError) {
      console.error('Failed to save flashcard from practice:', storageError);
      setFlashcardError('KhÃ´ng thá»ƒ lÆ°u flashcard lÃºc nÃ y. Vui lÃ²ng thá»­ láº¡i.');
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

  // Ná»™p bÃ i thi vÃ  chuyá»ƒn Ä‘áº¿n trang káº¿t quáº£
  const handleSubmitExam = async () => {
    setSubmitNotice(null);

    const token = typeof window !== 'undefined' ? getStoredToken() : null;

    if (!token) {
      setSubmitNotice({
        type: 'warning',
        title: 'Báº¡n cáº§n Ä‘Äƒng nháº­p Ä‘á»ƒ ná»™p bÃ i',
        message: 'ÄÄƒng nháº­p giÃºp há»‡ thá»‘ng lÆ°u káº¿t quáº£ TOEIC vÃ  lá»‹ch sá»­ lÃ m bÃ i cá»§a báº¡n.',
        action: 'login',
      });
      return;
    }

    const confirmSubmit = window.confirm(
      `Báº¡n Ä‘Ã£ chá»n ${answeredCount}/${totalQuestions} cÃ¢u. Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n ná»™p bÃ i khÃ´ng?`
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
          title: 'Ná»™p bÃ i chÆ°a thÃ nh cÃ´ng',
          message: response.message || 'Há»‡ thá»‘ng chÆ°a thá»ƒ ghi nháº­n bÃ i lÃ m. Vui lÃ²ng thá»­ láº¡i.',
        });
      }
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        window.localStorage.removeItem('token');
        window.localStorage.removeItem('user');
        setSubmitNotice({
          type: 'warning',
          title: 'PhiÃªn Ä‘Äƒng nháº­p Ä‘Ã£ háº¿t háº¡n',
          message: err.message || 'Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i rá»“i ná»™p bÃ i Ä‘á»ƒ lÆ°u káº¿t quáº£.',
          action: 'login',
        });
        return;
      }

      setSubmitNotice({
        type: 'error',
        title: 'KhÃ´ng thá»ƒ ná»™p bÃ i TOEIC',
        message:
          err.message ||
          'CÃ³ lá»—i xáº£y ra khi gá»­i bÃ i lÃ m lÃªn há»‡ thá»‘ng. Kiá»ƒm tra káº¿t ná»‘i vÃ  thá»­ láº¡i.',
      });
      console.error('Submit TOEIC exam error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Xá»­ lÃ½ gá»­i tin nháº¯n chat
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
        content: 'MÃ¬nh Ä‘Ã£ nháº­n cÃ¢u há»i cá»§a báº¡n.',
      },
    ]);

    setChatInput('');
  };

  if (loading) {
    return (
      <main className={styles.practicePage}>
        <div className={styles.emptyState}>
          <h2>Äang táº£i Ä‘á» thi...</h2>
          <p>Vui lÃ²ng chá» trong giÃ¢y lÃ¡t.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.practicePage}>
        <div className={styles.emptyState}>
          <h2>KhÃ´ng thá»ƒ táº£i Ä‘á» thi</h2>
          <p>{error}</p>

          <button type="button" onClick={fetchPracticeExam}>
            Thá»­ láº¡i
          </button>
        </div>
      </main>
    );
  }

  if (!examData) {
    return (
      <main className={styles.practicePage}>
        <div className={styles.emptyState}>
          <h2>KhÃ´ng cÃ³ dá»¯ liá»‡u Ä‘á» thi</h2>
          <p>Vui lÃ²ng kiá»ƒm tra láº¡i database hoáº·c API backend.</p>
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
                        TrÃ¬nh duyá»‡t cá»§a báº¡n khÃ´ng há»— trá»£ audio.
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
                          ÄÃ¡nh dáº¥u
                        </button>
                      </div>

                      <div className={styles.audioMarkerPanelWrap}>
                        <button
                          type="button"
                          className={styles.audioMarkerPanelToggle}
                          onClick={() => setIsAudioMarkerPanelOpen((prev) => !prev)}
                          aria-expanded={isAudioMarkerPanelOpen}
                        >
                          <span>ÄÃ£ Ä‘Ã¡nh dáº¥u {audioMarkers.length}</span>
                          <strong>
                            {isAudioMarkerPanelOpen ? 'Thu gá»n' : 'Má»Ÿ rá»™ng'}
                          </strong>
                        </button>

                        {markerStorageWarning && (
                          <p className={styles.audioStorageWarning}>{markerStorageWarning}</p>
                        )}

                        {isAudioMarkerPanelOpen && (
                          <div className={styles.audioMarkerPanel}>
                            <div className={styles.audioMarkerPanelHeader}>
                              <span>Danh sÃ¡ch má»‘c thá»i gian</span>
                              {audioMarkers.length > 0 && (
                                <button
                                  type="button"
                                  className={styles.audioMarkerPanelClear}
                                  onClick={clearAudioMarkers}
                                >
                                  XÃ³a táº¥t cáº£
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
                                      title="Báº¥m Ä‘á»ƒ chuyá»ƒn Ä‘áº¿n má»‘c"
                                    >
                                      {index + 1}. {formatAudioTime(marker.time)}
                                    </button>

                                    <button
                                      type="button"
                                      className={styles.audioMarkerDelete}
                                      onClick={() => handleRemoveAudioMarker(marker.id)}
                                      aria-label={`XÃ³a má»‘c ${index + 1}`}
                                    >
                                      Ã—
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className={styles.audioMarkersEmpty}>ChÆ°a cÃ³ Ä‘Ã¡nh dáº¥u nÃ o.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <p>ChÆ°a cÃ³ audio cho Ä‘á» nÃ y.</p>
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
              {submitting ? 'Äang ná»™p...' : 'Ná»™p bÃ i'}
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
                ÄÄƒng nháº­p
              </button>
            )}
            <button type="button" onClick={() => setSubmitNotice(null)} aria-label="ÄÃ³ng thÃ´ng bÃ¡o">
              ÄÃ³ng
            </button>
          </div>
        </div>
      )}

      <section className={styles.bodyLayout}>
        <aside className={styles.questionNavigator}>
          <div className={styles.navigatorHeader}>
            <h3>Báº£ng cÃ¢u há»i</h3>
            <div className={styles.navigatorTimer} aria-label={`Thá»i gian lÃ m bÃ i ${practiceElapsedTime}`}>
              <span className={styles.navigatorTimerLabel}>Thá»i gian</span>
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
              <span className={styles.highlightToggleLabel}>Highlight ná»™i dung</span>
              {/* <span className={styles.highlightInfoIcon}>i</span> */}
            </button>
          </div>

          <div className={styles.navigatorLegend} aria-label="ChÃº thÃ­ch tráº¡ng thÃ¡i cÃ¢u há»i">
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendAnswered}`} />
              <span>CÃ¢u Ä‘Ã£ lÃ m</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendUnanswered}`} />
              <span>CÃ¢u chÆ°a lÃ m</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendReview}`} />
              <span>CÃ¢u cáº§n kiá»ƒm tra láº¡i</span>
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
                  aria-label={`Highlight mÃ u ${item.key}`}
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
                aria-label="Gáº¡ch dÆ°á»›i"
              >
                U
              </button>

              <button
                type="button"
                className={styles.highlightStyleButton}
                onClick={() => applyHighlightAnnotation('strike')}
                aria-label="Gáº¡ch ngang"
              >
                abc
              </button>

              <button
                type="button"
                className={styles.highlightRemoveButton}
                onClick={() => applyHighlightAnnotation('remove')}
                aria-label="Bá» highlight"
              >
                Ã—
              </button>

              <button
                type="button"
                className={styles.highlightFlashcardButton}
                onMouseDown={(event) => event.preventDefault()}
                onClick={openFlashcardModal}
                aria-label="ThÃªm vÃ o flashcard"
                title="ThÃªm vÃ o flashcard"
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
                                    title="ÄÃ¡nh dáº¥u cÃ¢u cáº§n kiá»ƒm tra láº¡i"
                                  >
                                    CÃ¢u {question.questionNo}
                                  </button>

                                  {questionTextBlock}
                                </div>

                                {answers[question.questionId] && (
                                  <strong>ÄÃ£ chá»n {answers[question.questionId]}</strong>
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
                                                      `ÄÃ¡p Ã¡n ${option.optionLabel}`,
                                                    event
                                                  )
                                                }
                                              >
                                                {renderHighlightedText(
                                                  option.optionText || `ÄÃ¡p Ã¡n ${option.optionLabel}`,
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
                                                option.optionText || `ÄÃ¡p Ã¡n ${option.optionLabel}`,
                                                event
                                              )
                                            }
                                          >
                                            {renderHighlightedText(
                                              option.optionText || `ÄÃ¡p Ã¡n ${option.optionLabel}`,
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
              aria-label="ÄÃ³ng"
            >
              Ã—
            </button>

            <h2>ThÃªm flashcard má»›i</h2>

            <form className={styles.flashcardForm} onSubmit={saveFlashcardFromPractice}>
              <div className={styles.flashcardDeckMode}>
                <button
                  type="button"
                  className={
                    flashcardForm.deckMode === 'existing' ? styles.activeDeckMode : ''
                  }
                  onClick={() => handleFlashcardDeckModeChange('existing')}
                >
                  Bá»™ Ä‘Ã£ cÃ³
                </button>
                <button
                  type="button"
                  className={flashcardForm.deckMode === 'new' ? styles.activeDeckMode : ''}
                  onClick={() => handleFlashcardDeckModeChange('new')}
                >
                  + Táº¡o má»›i
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
                  placeholder="TÃªn bá»™ tháº» má»›i"
                />
              )}

              <label>
                Tá»« má»›i
                <input
                  name="term"
                  value={flashcardForm.term}
                  onChange={handleFlashcardFormChange}
                  placeholder="Tá»« vá»±ng *"
                />
              </label>

              <label>
                PhiÃªn Ã¢m
                <input
                  name="pronunciation"
                  value={flashcardForm.pronunciation}
                  onChange={handleFlashcardFormChange}
                  placeholder="PhiÃªn Ã¢m"
                />
              </label>

              <label>
                Tá»« loáº¡i
                <input
                  name="wordType"
                  value={flashcardForm.wordType}
                  onChange={handleFlashcardFormChange}
                  placeholder="Tá»« loáº¡i"
                />
              </label>

              <label>
                Äá»‹nh nghÄ©a
                <textarea
                  name="meaning"
                  value={flashcardForm.meaning}
                  onChange={handleFlashcardFormChange}
                  placeholder="NghÄ©a tiáº¿ng Viá»‡t *"
                  rows={4}
                />
              </label>

              <label>
                VÃ­ dá»¥
                <textarea
                  name="example"
                  value={flashcardForm.example}
                  onChange={handleFlashcardFormChange}
                  placeholder="CÃ¢u vÃ­ dá»¥"
                  rows={3}
                />
              </label>

              <label>
                Äá»™ khÃ³
                <select name="level" value={flashcardForm.level} onChange={handleFlashcardFormChange}>
                  <option>Basic</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </label>

              {flashcardError ? <p className={styles.flashcardError}>{flashcardError}</p> : null}

              <div className={styles.flashcardModalActions}>
                <button type="submit" className={styles.flashcardSaveButton}>
                  LÆ°u
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
            aria-label="Má»Ÿ trá»£ lÃ½ luyá»‡n Ä‘á»"
          >
            <strong>Chat bot</strong>
          </button>
        ) : (
          <div className={styles.chatWindow}>
            <div className={styles.chatHeader}>
              <div>
                <strong>Trá»£ lÃ½ luyá»‡n Ä‘á» TOEIC</strong>
                <span>Há»— trá»£ phÃ¢n tÃ­ch cÃ¢u há»i</span>
              </div>

              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                aria-label="ÄÃ³ng chatbot"
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
                placeholder="Copy cÃ¢u há»i báº¡n muá»‘n há»i vÃ o Ä‘Ã¢y..."
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


