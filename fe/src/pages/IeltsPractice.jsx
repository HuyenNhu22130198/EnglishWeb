import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmDialog } from '../contexts/useConfirmDialog';
import { getStoredToken } from '../services/authService';
import { ieltsAPI } from '../services/ieltsService';
import { getFlashcardStorageKey } from '../utils/flashcardStorage';
import styles from './IeltsPractice.module.css';

const isAudioAsset = (asset) => String(asset?.assetType || '').toLowerCase().includes('audio');

const isVisualAsset = (asset) => {
  const assetType = String(asset?.assetType || '').toLowerCase();

  return ['image', 'map', 'table', 'diagram', 'photo', 'picture'].some((type) => assetType.includes(type));
};

const HIGHLIGHT_STORAGE_PREFIX = 'ielts-practice-highlights';
const HIGHLIGHT_PALETTE = [
  { key: 'cyan', color: '#a5f3fc' },
  { key: 'pink', color: '#fbcfe8' },
  { key: 'green', color: '#bbf7d0' },
  { key: 'yellow', color: '#fef08a' },
];

const emptyFlashcardForm = {
  deckMode: 'existing',
  deckName: 'IELTS',
  newDeckName: '',
  term: '',
  pronunciation: '',
  wordType: '',
  meaning: '',
  example: '',
  level: 'Basic',
};

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
const getHighlightStorageKey = (examId, skill) => `${HIGHLIGHT_STORAGE_PREFIX}:${examId}:${skill}`;
const getHighlightColor = (colorKey) =>
  HIGHLIGHT_PALETTE.find((item) => item.key === colorKey)?.color || '#fef08a';

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
    return ['IELTS'];
  }

  try {
    const storageKey = getFlashcardStorageKey(user);

    if (!storageKey) {
      return ['IELTS'];
    }

    const storedCards = loadStoredJson(storageKey, []);
    const deckNames = new Set(['IELTS']);

    storedCards.forEach((card) => {
      if (card?.topic) {
        deckNames.add(card.topic);
      }
    });

    return Array.from(deckNames);
  } catch {
    return ['IELTS'];
  }
};

const clearTextSelection = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.getSelection?.().removeAllRanges?.();
};

const clearStoredHighlights = (examId, skill) => {
  if (!examId || typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(getHighlightStorageKey(examId, skill));
  } catch (error) {
    console.error('Failed to clear IELTS highlights:', error);
  }
};

const createFlashcardId = (fallbackSeed = '') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `custom-${fallbackSeed || Date.now()}`;
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

const getPartLabel = (partNo, skill) =>
  String(skill || '').toUpperCase() === 'READING' ? `READING PASSAGE ${partNo}` : `SECTION ${partNo}`;

const formatElapsedTime = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const formatBand = (value) => (value == null || value === '' ? '0.0' : Number(value).toFixed(1));

const getCorrectAnswerText = (questionResult) =>
  (questionResult?.correctAnswers || [])
    .map((answer) => answer.answerText || answer.answerKey)
    .filter(Boolean)
    .join(', ');

const getReviewStatus = (questionResult) => {
  if (!questionResult?.isAnswered) return 'unanswered';
  return questionResult.isCorrect ? 'correct' : 'wrong';
};

const SPEAKER_LABEL_PATTERN =
  "(?:MAN|WOMAN|MALE|FEMALE|STUDENT|TUTOR|PRESENTER|SPEAKER|INTERVIEWER|INTERVIEWEE|LECTURER|PROFESSOR|TEACHER|CUSTOMER|RECEPTIONIST|ASSISTANT|HOST|GUEST|NARRATOR|BOY|GIRL|OFFICER|ADVISER|ADVISOR|[A-Z][A-Z0-9 '&/.-]{1,24})";

const formatListeningScript = (sharedText) => {
  const originalText = String(sharedText || '').replace(/\r\n?/g, '\n');
  const meaningfulLines = originalText.split('\n').filter((line) => line.trim()).length;

  if (meaningfulLines > 1) return originalText;

  return originalText.replace(
    new RegExp(`\\s+(?=(${SPEAKER_LABEL_PATTERN}):\\s*)`, 'g'),
    '\n'
  );
};

const renderListeningScript = (sharedText, stylesMap) =>
  formatListeningScript(sharedText).split('\n').map((line, index) => {
    const speakerMatch = line.match(new RegExp(`^(\\s*${SPEAKER_LABEL_PATTERN}:)(.*)$`));

    if (!line) return <br key={`script-gap-${index}`} />;
    if (!speakerMatch) return <p key={`script-line-${index}`}>{line}</p>;

    return (
      <p key={`script-line-${index}`}>
        <strong className={stylesMap.scriptSpeaker}>{speakerMatch[1]}</strong>
        {speakerMatch[2]}
      </p>
    );
  });

const normalizeAnswerValue = (answer) => answer?.selectedOptionKey || answer?.answerText || '';

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

const SECTION_ONE_HIDDEN_ANSWER_TEXT =
  /The Food Studio:\s*Focus:\s*how to\s*(?:_+|\.{3,}|…+)?\s*and cook with seasonal products\.?/gi;
const DUPLICATED_PART_QUESTION_LABEL =
  /\b(?:Listening|Reading)\s+Part\s+\d+\s*\/\s*Questions?\s+\d+(?:\s*[-–]\s*\d+)?\b\.?/gi;

const DUPLICATED_QUESTION_RANGE_PREFIX = /^Questions?\s+\d+(?:\s*[-–]\s*\d+)?\s*:\s*/i;
const INLINE_OPTIONS_LINE = /(?:^|\n)\s*Options:\s*[^\n]*/gi;
const DUPLICATED_MAP_LABEL_LIST = /(?:Map label\s+[A-Z]\s*){2,}/gi;
const IMAGE_ASSET_REQUIRED_MARKER = /\s*\[IMAGE_ASSET_REQUIRED:\s*[^\]]+\]/gi;

const cleanHiddenAnswerText = (value) => {
  if (!value) {
    return value;
  }

  return String(value)
    .replace(SECTION_ONE_HIDDEN_ANSWER_TEXT, '')
    .replace(DUPLICATED_PART_QUESTION_LABEL, '')
    .replace(DUPLICATED_QUESTION_RANGE_PREFIX, '')
    .replace(INLINE_OPTIONS_LINE, '')
    .replace(IMAGE_ASSET_REQUIRED_MARKER, '')
    .trim();
};

const cleanBlockInstructionText = (value, partNo, questionType) => {
  const cleanedValue = cleanHiddenAnswerText(value);

  if (
    !cleanedValue ||
    Number(partNo) !== 2 ||
    String(questionType || '').toUpperCase() !== 'PLAN_MAP_LABEL'
  ) {
    return cleanedValue;
  }

  return cleanedValue.replace(DUPLICATED_MAP_LABEL_LIST, '').trim();
};

const isTableCompletionBlock = (block) => {
  const questionType = String(block.questionType || '').toUpperCase();
  const instructionText = String(block.instructionText || '');

  return questionType.includes('TABLE') || /complete\s+the\s+table/i.test(instructionText);
};

const isFlowchartCompletionBlock = (block) =>
  String(block.questionType || '').toUpperCase() === 'FLOWCHART_COMPLETION';

const isListeningInputOnlyBlock = (block, skill) => {
  if (String(skill || '').toUpperCase() !== 'LISTENING') {
    return false;
  }

  const questionType = String(block.questionType || '').toUpperCase();
  const instructionText = String(block.instructionText || '');

  return (
    questionType.includes('TABLE') ||
    questionType.includes('FLOW') ||
    questionType.includes('NOTE') ||
    questionType === 'PLAN_MAP_LABEL' ||
    /complete\s+the\s+table\s+below/i.test(instructionText) ||
    /label\s+the\s+map\s+below/i.test(instructionText) ||
    /complete\s+the\s+flow[-\s]?chart\s+below/i.test(instructionText) ||
    /complete\s+the\s+notes\s+below/i.test(instructionText)
  );
};

const isReadingSummaryCompletionBlock = (block, skill) => {
  if (String(skill || '').toUpperCase() !== 'READING') {
    return false;
  }

  const questionType = String(block.questionType || '').toUpperCase();
  const instructionText = String(block.instructionText || '');

  return questionType.includes('SUMMARY') || /complete\s+the\s+summary\s+below/i.test(instructionText);
};

const getBlockPromptText = (block, skill) => {
  if (!isReadingSummaryCompletionBlock(block, skill)) {
    return '';
  }

  const uniquePrompts = Array.from(
    new Set(
      (block.questions || [])
        .map((question) => cleanHiddenAnswerText(question.promptText))
        .filter(Boolean)
    )
  );

  return uniquePrompts.join('\n\n');
};

const cleanQuestionPromptText = (question, block, skill) => {
  const promptText = cleanHiddenAnswerText(question.promptText);

  if (!promptText) {
    return '';
  }

  if (isReadingSummaryCompletionBlock(block, skill)) {
    return '';
  }

  if (String(block.questionType || '').toUpperCase() === 'PLAN_MAP_LABEL') {
    return promptText;
  }

  if (isListeningInputOnlyBlock(block, skill)) {
    return '';
  }

  if (String(skill || '').toUpperCase() === 'READING' && isTableCompletionBlock(block)) {
    return '';
  }

  return promptText;
};

const shouldShowQuestionOptions = (question, questionType) => {
  if (String(questionType || '').toUpperCase() === 'PLAN_MAP_LABEL') {
    return false;
  }

  return question.options?.length > 0;
};

const normalizeOptionText = (value) =>
  String(value || '')
    .trim()
    .replace(/[\s_-]+/g, ' ')
    .toUpperCase();

const isReadingTrueFalseNotGivenOptions = (options = []) => {
  const optionValues = options
    .map((option) => normalizeOptionText(option.optionText || option.optionKey))
    .filter(Boolean);

  if (optionValues.length < 3) {
    return false;
  }

  const valueSet = new Set(optionValues);
  const hasNotGiven = valueSet.has('NOT GIVEN') || valueSet.has('NG');
  const hasTrueFalse = valueSet.has('TRUE') && valueSet.has('FALSE');
  const hasYesNo = valueSet.has('YES') && valueSet.has('NO');

  return hasNotGiven && (hasTrueFalse || hasYesNo);
};

const isReadingTrueFalseNotGivenBlock = (block, skill) => {
  if (String(skill || '').toUpperCase() !== 'READING') {
    return false;
  }

  const questionType = normalizeOptionText(block.questionType);
  const instructionText = normalizeOptionText(block.instructionText);
  const blockOptions = (block.questions || []).flatMap((question) => question.options || []);

  return (
    isReadingTrueFalseNotGivenOptions(blockOptions) ||
    /TRUE.*FALSE.*NOT GIVEN|YES.*NO.*NOT GIVEN/.test(instructionText) ||
    /TRUE.*FALSE.*NOT GIVEN|YES.*NO.*NOT GIVEN/.test(questionType)
  );
};

const parseInlineOptions = (instructionText) => {
  const match = String(instructionText || '').match(/(?:^|\n)\s*Options:\s*([^\n]*)/i);

  if (!match?.[1]) {
    return [];
  }

  return match[1]
    .split(';')
    .map((item, index) => {
      const optionMatch = item.trim().match(/^([A-Z])[).:-]?\s+(.+)$/);

      if (!optionMatch) {
        return null;
      }

      return {
        optionKey: optionMatch[1],
        optionText: optionMatch[2].trim(),
        displayOrder: index + 1,
      };
    })
    .filter(Boolean);
};

const shouldUseBlockOptions = (block, skill) => {
  if (isFlowchartCompletionBlock(block)) {
    return true;
  }

  if (isListeningInputOnlyBlock(block, skill)) {
    return false;
  }

  if (String(block.questionType || '').toUpperCase() === 'PLAN_MAP_LABEL') {
    return false;
  }

  if (isReadingTrueFalseNotGivenBlock(block, skill)) {
    return false;
  }

  return (
    /(?:^|\n)\s*Options:\s*[^\n]*/i.test(String(block.instructionText || '')) ||
    /answers?\s+from\s+the\s+box/i.test(String(block.instructionText || ''))
  );
};

const shouldShowInlineQuestionOptions = (question, block, skill) => {
  if (getBlockOptionList(block, skill).length > 0) {
    return false;
  }

  if (isListeningInputOnlyBlock(block, skill)) {
    return false;
  }

  if (isReadingTrueFalseNotGivenBlock(block, skill) || isReadingTrueFalseNotGivenOptions(question.options)) {
    return false;
  }

  return shouldShowQuestionOptions(question, block.questionType);
};

const normalizeBlockOptions = (options = []) => {
  const seenKeys = new Set();

  return options
    .filter((option) => option?.optionKey && option?.optionText)
    .filter((option) => {
      const key = String(option.optionKey).toUpperCase();

      if (seenKeys.has(key)) {
        return false;
      }

      seenKeys.add(key);
      return true;
    })
    .sort((first, second) => {
      const firstOrder = Number(first.displayOrder ?? Number.MAX_SAFE_INTEGER);
      const secondOrder = Number(second.displayOrder ?? Number.MAX_SAFE_INTEGER);

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      return String(first.optionKey).localeCompare(String(second.optionKey));
    });
};

const getBlockOptionList = (block, skill) => {
  if (!shouldUseBlockOptions(block, skill)) {
    return [];
  }

  const databaseOptions = normalizeBlockOptions(
    (block.questions || []).flatMap((question) => question.options || [])
  );

  if (databaseOptions.length > 0) {
    return databaseOptions;
  }

  if (isFlowchartCompletionBlock(block)) {
    return [];
  }

  return normalizeBlockOptions(parseInlineOptions(block.instructionText));
};

const usesSelectedOptionKey = (question, block, skill) => {
  const questionType = normalizeOptionText(block.questionType);
  const hasOptionMetadata = (question.options || []).some((option) =>
    String(option?.optionKey || '').trim()
  );

  return (
    hasOptionMetadata ||
    getBlockOptionList(block, skill).length > 0 ||
    /MULTIPLE CHOICE|TRUE FALSE|YES NO|MATCH|PLAN MAP LABEL/.test(questionType)
  );
};

const IeltsPractice = ({ mode = 'practice', initialPractice = null, reviewResult = null }) => {
  const confirm = useConfirmDialog();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { examId: routeExamId } = useParams();
  const [searchParams] = useSearchParams();
  const isReviewMode = mode === 'review';
  const examId = initialPractice?.examId || reviewResult?.examId || routeExamId;
  const skill = String(reviewResult?.skill || initialPractice?.skill || searchParams.get('skill') || 'LISTENING').toUpperCase();
  const isReadingPractice = skill === 'READING';

  const [practice, setPractice] = useState(initialPractice);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(!initialPractice);
  const [submitting, setSubmitting] = useState(false);
  const [submitNotice, setSubmitNotice] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isHighlightModeEnabled, setIsHighlightModeEnabled] = useState(false);
  const [highlightToolbar, setHighlightToolbar] = useState(null);
  const [highlights, setHighlights] = useState({});
  const [activeHighlightColor, setActiveHighlightColor] = useState('yellow');
  const [flashcardModalOpen, setFlashcardModalOpen] = useState(false);
  const [flashcardError, setFlashcardError] = useState('');
  const [flashcardDeckNames, setFlashcardDeckNames] = useState(() => loadFlashcardDeckNames(user));
  const [flashcardForm, setFlashcardForm] = useState(emptyFlashcardForm);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [expandedExplanations, setExpandedExplanations] = useState(() => new Set());
  const [expandedScripts, setExpandedScripts] = useState(
    () => new Set(
      isReviewMode && !isReadingPractice
        ? (initialPractice?.groups || [])
            .filter((group) => String(group.sharedText || '').trim())
            .map((group) => group.groupId)
        : []
    )
  );
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [sourcePanePercent, setSourcePanePercent] = useState(52);
  const [resizingGroupId, setResizingGroupId] = useState(null);

  const resultByQuestionId = useMemo(
    () => new Map((reviewResult?.questionResults || []).map((item) => [Number(item.questionId), item])),
    [reviewResult]
  );

  useEffect(() => {
    let mounted = true;

    const fetchPractice = async () => {
      if (initialPractice) {
        setPractice(initialPractice);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setLoadError('');
        const response = await ieltsAPI.getIeltsPractice(examId, skill);

        if (!mounted) {
          return;
        }

        if (response.success) {
          setPractice(response.data);
          if (!isReviewMode) setAnswers({});
        } else {
          setLoadError(response.message || 'Không thể tải nội dung đề IELTS');
        }
      } catch (err) {
        if (mounted) {
          setLoadError(err.message || 'Lỗi kết nối đến server');
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
  }, [examId, initialPractice, isReviewMode, skill]);

  useEffect(() => {
    if (!isReviewMode || !reviewResult) return;

    setAnswers(
      Object.fromEntries(
        (reviewResult.questionResults || []).map((item) => [
          item.questionId,
          { selectedOptionKey: item.selectedOptionKey || null, answerText: item.selectedAnswerText || null },
        ])
      )
    );
    setExpandedExplanations(new Set());
  }, [isReviewMode, reviewResult]);

  useEffect(() => {
    if (isReviewMode || loading || !practice) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isReviewMode, loading, practice]);

  useEffect(() => {
    if (isReadingPractice) {
      clearStoredHighlights(examId, skill);
    }

    setHighlights({});
    setIsHighlightModeEnabled(false);
    setHighlightToolbar(null);
    setFlashcardModalOpen(false);
    clearTextSelection();
  }, [examId, isReadingPractice, skill]);

  useEffect(() => {
    return () => {
      clearTextSelection();
    };
  }, []);

  useEffect(() => {
    setFlashcardDeckNames(loadFlashcardDeckNames(user));
  }, [user]);

  const groups = useMemo(() => practice?.groups || [], [practice]);
  const visibleHighlights = isReadingPractice ? highlights : {};
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
  const totalQuestions = useMemo(
    () => questionGroups.reduce((count, group) => count + group.questions.length, 0),
    [questionGroups]
  );
  const answeredCount = useMemo(
    () =>
      Object.values(answers).filter((answer) =>
        String(answer?.selectedOptionKey || answer?.answerText || '').trim()
      ).length,
    [answers]
  );

  const handleAnswerChange = (question, block, value) => {
    if (isReviewMode) return;
    const normalizedValue = String(value || '');
    const isOptionKeyAnswer = usesSelectedOptionKey(question, block, skill);

    setAnswers((current) => ({
      ...current,
      [question.questionId]: {
        selectedOptionKey: isOptionKeyAnswer ? normalizedValue : null,
        answerText: isOptionKeyAnswer ? null : normalizedValue,
      },
    }));
  };

  const updatePaneWidth = (event) => {
    const layout = event.currentTarget.parentElement;

    if (!layout) return;

    const bounds = layout.getBoundingClientRect();
    const dividerWidth = event.currentTarget.offsetWidth;
    const minimumPaneWidth = 280;
    const availableWidth = Math.max(bounds.width - dividerWidth, minimumPaneWidth * 2);
    const minimumPercent = (minimumPaneWidth / availableWidth) * 100;
    const maximumPercent = 100 - minimumPercent;
    const pointerPercent = ((event.clientX - bounds.left) / availableWidth) * 100;
    const nextPercent = Math.min(maximumPercent, Math.max(minimumPercent, pointerPercent));

    setSourcePanePercent(nextPercent);
  };

  const handleResizePointerDown = (event, groupId) => {
    if (event.button !== 0) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizingGroupId(groupId);
    updatePaneWidth(event);
  };

  const handleResizePointerMove = (event) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

    updatePaneWidth(event);
  };

  const finishPaneResize = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setResizingGroupId(null);
  };

  const handleResizeKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;

    event.preventDefault();

    if (event.key === 'Home') {
      setSourcePanePercent(52);
      return;
    }

    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    setSourcePanePercent((current) => Math.min(70, Math.max(30, current + direction * 2)));
  };

  const renderPaneResizeHandle = (groupId) => (
    <button
      type="button"
      className={`${styles.paneResizeHandle} ${
        resizingGroupId === groupId ? styles.paneResizeHandleActive : ''
      }`}
      onPointerDown={(event) => handleResizePointerDown(event, groupId)}
      onPointerMove={handleResizePointerMove}
      onPointerUp={finishPaneResize}
      onPointerCancel={finishPaneResize}
      onLostPointerCapture={() => setResizingGroupId(null)}
      onKeyDown={handleResizeKeyDown}
      onDoubleClick={() => setSourcePanePercent(52)}
      role="separator"
      aria-label="Điều chỉnh độ rộng giữa nội dung đề và câu hỏi"
      aria-orientation="vertical"
      aria-valuemin={30}
      aria-valuemax={70}
      aria-valuenow={Math.round(sourcePanePercent)}
      title="Kéo để thay đổi độ rộng hai khung; nhấp đúp để đặt lại"
    />
  );

  const scrollToQuestion = (questionId) => {
    setActiveQuestionId(Number(questionId));
    document.getElementById(`ielts-question-${questionId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  useEffect(() => {
    if (!practice || typeof IntersectionObserver === 'undefined') return undefined;

    const questionIds = questionGroups.flatMap((group) => group.questions.map((question) => question.questionId));
    if (questionIds.length) setActiveQuestionId(Number(questionIds[0]));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveQuestionId(Number(visible.target.dataset.questionId));
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: [0.1, 0.5] }
    );
    questionIds.forEach((questionId) => {
      const element = document.getElementById(`ielts-question-${questionId}`);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [practice, questionGroups]);

  const toggleExplanation = (questionId) => {
    setExpandedExplanations((current) => {
      const next = new Set(current);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const renderReviewFeedback = (question) => {
    if (!isReviewMode) return null;
    const result = resultByQuestionId.get(Number(question.questionId));
    const status = getReviewStatus(result);
    const correctAnswer = getCorrectAnswerText(result);
    const isExplanationOpen = expandedExplanations.has(question.questionId);

    return (
      <div className={styles.reviewFeedback}>
        <strong className={`${styles.reviewStatus} ${styles[`reviewStatus${status}`]}`}>
          {status === 'correct' ? 'Chính xác' : status === 'wrong' ? 'Bạn trả lời sai' : 'Chưa trả lời'}
        </strong>
        {status !== 'correct' && correctAnswer ? (
          <p className={styles.correctAnswer}>Đáp án đúng: <strong>{correctAnswer}</strong></p>
        ) : null}
        {isReadingPractice && result?.explanationText ? (
          <>
            <button type="button" className={styles.explanationToggle} onClick={() => toggleExplanation(question.questionId)}>
              {isExplanationOpen ? 'Ẩn giải thích' : 'Xem giải thích'}
            </button>
            {isExplanationOpen ? (
              <div className={styles.explanationPanel}>
                <strong>Giải thích chi tiết</strong>
                <p>{result.explanationText}</p>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    );
  };

  const scrollToPart = (partNo) => {
    const firstQuestion = questionGroups.find((group) => Number(group.partNo) === Number(partNo))?.questions[0];
    if (firstQuestion) setActiveQuestionId(Number(firstQuestion.questionId));
    document.getElementById(`ielts-part-${partNo}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const toggleListeningScript = (groupId) => {
    setExpandedScripts((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const removeHighlightsInRange = (blockHighlights, start, end) => {
    return (blockHighlights || []).filter((annotation) => annotation.end <= start || annotation.start >= end);
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
    clearTextSelection();
  };

  const handleHighlightTextMouseUp = (blockKey, text, event) => {
    if (!isReadingPractice || !isHighlightModeEnabled || !text || typeof window === 'undefined') {
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
    const toolbarWidth = 280;
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

  const highlightRenderStyles = {
    segment: styles.highlightSegment,
    highlight: styles.textHighlight,
    underline: styles.underlineHighlight,
    strike: styles.strikeHighlight,
  };

  const refreshFlashcardDeckNames = () => {
    setFlashcardDeckNames(loadFlashcardDeckNames(user));
  };

  const openFlashcardModal = () => {
    if (!user) {
      setFlashcardError('Vui lòng đăng nhập để lưu flashcard của bạn.');
      setFlashcardForm((current) => ({
        ...emptyFlashcardForm,
        term: (highlightToolbar?.text || current.term || '').trim(),
      }));
      setFlashcardModalOpen(true);
      return;
    }

    const selectedTerm = (highlightToolbar?.text || '').trim();

    setFlashcardError('');
    setFlashcardForm((current) => ({
      ...emptyFlashcardForm,
      deckName: flashcardDeckNames[0] || 'IELTS',
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
      deckName: mode === 'existing' ? flashcardDeckNames[0] || 'IELTS' : current.deckName,
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
      console.error('Failed to save IELTS flashcard from practice:', storageError);
      setFlashcardError('Không thể lưu flashcard lúc này. Vui lòng thử lại.');
      return;
    }

    refreshFlashcardDeckNames();
    closeFlashcardModal();
  };

  const handleSubmit = async () => {
    setSubmitNotice(null);
    setSubmitError('');

    const token = typeof window !== 'undefined' ? getStoredToken() : null;

    if (!token) {
      setSubmitNotice({
        type: 'warning',
        title: 'Bạn cần đăng nhập để nộp bài',
        message: 'Đăng nhập giúp hệ thống lưu kết quả IELTS và lịch sử làm bài của bạn.',
        action: 'login',
      });
      return;
    }

    const confirmSubmit = await confirm({
      title: 'Nộp bài IELTS?',
      message: `Bạn đã trả lời ${answeredCount}/${totalQuestions} câu. Sau khi nộp, bạn sẽ không thể thay đổi đáp án.`,
      confirmLabel: 'Nộp bài',
    });

    if (!confirmSubmit) {
      return;
    }

    try {
      setSubmitting(true);

      const payload = Object.entries(answers).map(([questionId, answer]) => ({
        questionId: Number(questionId),
        selectedOptionKey: answer.selectedOptionKey?.trim() || null,
        answerText: answer.answerText?.trim() || null,
      }));

      const response = await ieltsAPI.submitIeltsExam(examId, skill, payload, elapsedSeconds);

      if (response.success && response.data?.attemptId) {
        navigate(`/practice/ielts/result/${response.data.attemptId}`);
        return;
      }

      setSubmitError('Không thể lưu bài làm IELTS. Vui lòng thử lại.');
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

      setSubmitError('Không thể lưu bài làm IELTS. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderListeningSections = () =>
    groups.map((group) => {
      const partAssets = assetsByPart.get(group.partNo) || [];
      const audioAssets = partAssets.filter(isAudioAsset);
      const visualAssets = partAssets.filter(isVisualAsset);
      const groupInstruction = cleanHiddenAnswerText(group.instructionText);

      return (
        <section key={group.groupId} id={`ielts-part-${group.partNo}`} className={styles.partSection}>
          <div className={styles.partHeader}>
            <div>
              <h2>{getPartLabel(group.partNo, 'LISTENING')}</h2>
            </div>
          </div>

          <article className={styles.groupCard}>
            {groupInstruction ? <p className={styles.groupInstruction}>{groupInstruction}</p> : null}

            {audioAssets.length > 0 && (
              <div className={styles.audioStack}>
                {audioAssets.map((asset) => (
                  <audio key={asset.id} controls src={asset.assetUrl} className={styles.audioPlayer} />
                ))}
              </div>
            )}

            <div
              className={`${styles.ieltsExamLayout} ${!isReviewMode ? styles.resizableExamLayout : ''}`}
              style={!isReviewMode ? { '--source-pane-width': `${sourcePanePercent}%` } : undefined}
            >
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

                {isReviewMode && String(group.sharedText || '').trim() ? (
                  <div className={styles.sectionListeningScript}>
                    <div className={styles.scriptAccordion}>
                      <button
                        type="button"
                        className={styles.scriptAccordionButton}
                        onClick={() => toggleListeningScript(group.groupId)}
                        aria-expanded={expandedScripts.has(group.groupId)}
                        aria-controls={`listening-script-${group.groupId}`}
                      >
                        <span>Listening Script</span>
                        <small>Section {group.partNo}</small>
                        <i aria-hidden="true">{expandedScripts.has(group.groupId) ? '−' : '+'}</i>
                      </button>
                      {expandedScripts.has(group.groupId) ? (
                        <div id={`listening-script-${group.groupId}`} className={styles.scriptAccordionContent}>
                          {renderListeningScript(group.sharedText, styles)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              {!isReviewMode ? renderPaneResizeHandle(group.groupId) : null}

              <div className={styles.answerPane}>
                {group.blocks.map((block) => {
                  const blockInstruction = cleanBlockInstructionText(
                    block.instructionText,
                    group.partNo,
                    block.questionType
                  );
                  const blockOptions = getBlockOptionList(block, 'LISTENING');

                  return (
                    <section key={block.blockId} className={styles.questionBlock}>
                      <div className={styles.blockHeader}>
                        <div className={styles.blockHeaderTop}>
                          <span>{getQuestionRange(block.questions)}</span>
                        </div>
                        {blockInstruction ? <p>{blockInstruction}</p> : null}
                      </div>

                      {blockOptions.length > 0 ? (
                        <div className={styles.blockOptionBox}>
                          {blockOptions.map((option) => (
                            <div key={`${block.blockId}-${option.optionKey}`} className={styles.blockOptionItem}>
                              <strong>{option.optionKey}</strong>
                              <span>{option.optionText}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className={styles.questionList}>
                        {block.questions.map((question) => {
                          const answerValue = normalizeAnswerValue(answers[question.questionId]);
                          const promptText = cleanQuestionPromptText(question, block, 'LISTENING');
                          const reviewStatus = getReviewStatus(resultByQuestionId.get(Number(question.questionId)));

                          return (
                            <div
                              key={question.questionId}
                              id={`ielts-question-${question.questionId}`}
                              data-question-id={question.questionId}
                              className={`${styles.questionCard} ${isReviewMode ? styles.reviewQuestionCard : ''} ${
                                isReviewMode ? styles[`reviewQuestion${reviewStatus}`] : ''
                              }`}
                            >
                              <div className={styles.questionTop}>
                                <button type="button" className={styles.questionIndex}>
                                  {question.questionNo}
                                </button>
                                {promptText ? <p className={styles.questionText}>{promptText}</p> : null}
                                <input
                                  type="text"
                                  value={answerValue}
                                  onChange={(event) => handleAnswerChange(question, block, event.target.value)}
                                  className={styles.answerInput}
                                  placeholder="Nhập đáp án"
                                  aria-label={`Answer for question ${question.questionNo}`}
                                  disabled={isReviewMode}
                                />
                              </div>

                              {shouldShowInlineQuestionOptions(question, block, 'LISTENING') && (
                                <div className={styles.optionReference}>
                                  {question.options.map((option) => (
                                    <div key={option.optionId} className={styles.optionReferenceItem}>
                                      <strong>{option.optionKey}</strong>
                                      <span>{option.optionText}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {renderReviewFeedback(question)}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </article>
        </section>
      );
    });

  const renderReadingSections = () =>
    groups.map((group) => {
      const partAssets = assetsByPart.get(group.partNo) || [];
      const visualAssets = partAssets.filter(isVisualAsset);
      const groupInstruction = cleanHiddenAnswerText(group.instructionText);
      const showOnlyPassageText = [2, 3].includes(Number(group.partNo));

      return (
        <section key={group.groupId} id={`ielts-part-${group.partNo}`} className={styles.partSection}>
          <div className={styles.partHeader}>
            <div>
              <h2>{getPartLabel(group.partNo, 'READING')}</h2>
            </div>
          </div>

          <article className={styles.groupCard}>
            {groupInstruction ? (
              <p
                className={`${styles.groupInstruction} ${styles.highlightTextBlock}`}
                data-highlight-target={`group-instruction-${group.groupId}`}
                onMouseUp={(event) =>
                  handleHighlightTextMouseUp(`group-instruction-${group.groupId}`, groupInstruction, event)
                }
              >
                {renderHighlightedText(
                  groupInstruction,
                  visibleHighlights[`group-instruction-${group.groupId}`] || [],
                  highlightRenderStyles
                )}
              </p>
            ) : null}

            <div
              className={`${styles.ieltsExamLayout} ${!isReviewMode ? styles.resizableExamLayout : ''}`}
              style={!isReviewMode ? { '--source-pane-width': `${sourcePanePercent}%` } : undefined}
            >
              <div className={styles.sourcePane}>
                {!showOnlyPassageText && visualAssets.length > 0 && (
                  <div className={styles.materialGrid}>
                    {visualAssets.map((asset) => (
                      <div key={asset.id} className={styles.materialImageCard}>
                        <img src={asset.assetUrl} alt={`${asset.assetType || 'IELTS'} part ${asset.partNo}`} />
                      </div>
                    ))}
                  </div>
                )}

                {group.sharedText ? (
                  <div className={styles.passageBox}>
                    {group.title ? <h3 className={styles.passageTitle}>{group.title}</h3> : null}
                    {group.sharedText.split(/\n{2,}/).map((paragraph, index) => {
                      const paragraphText = paragraph.trim();
                      const blockKey = `passage-${group.groupId}-${index}`;

                      return (
                        <p
                          key={`${group.groupId}-paragraph-${index}`}
                          className={styles.highlightTextBlock}
                          data-highlight-target={blockKey}
                          onMouseUp={(event) => handleHighlightTextMouseUp(blockKey, paragraphText, event)}
                        >
                          {renderHighlightedText(
                            paragraphText,
                            visibleHighlights[blockKey] || [],
                            highlightRenderStyles
                          )}
                        </p>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              {!isReviewMode ? renderPaneResizeHandle(group.groupId) : null}

              <div className={styles.answerPane}>
                {group.blocks.map((block) => {
                  const blockInstruction = cleanBlockInstructionText(
                    block.instructionText,
                    group.partNo,
                    block.questionType
                  );
                  const blockOptions = getBlockOptionList(block, 'READING');
                  const blockPromptText = getBlockPromptText(block, 'READING');

                  return (
                    <section key={block.blockId} className={styles.questionBlock}>
                      <div className={styles.blockHeader}>
                        <div className={styles.blockHeaderTop}>
                          <span>{getQuestionRange(block.questions)}</span>
                        </div>
                        {blockInstruction ? (
                          <p
                            className={styles.highlightTextBlock}
                            data-highlight-target={`block-instruction-${block.blockId}`}
                            onMouseUp={(event) =>
                              handleHighlightTextMouseUp(
                                `block-instruction-${block.blockId}`,
                                blockInstruction,
                                event
                              )
                            }
                          >
                            {renderHighlightedText(
                              blockInstruction,
                              visibleHighlights[`block-instruction-${block.blockId}`] || [],
                              highlightRenderStyles
                            )}
                          </p>
                        ) : null}
                      </div>

                      {blockPromptText ? (
                        <div
                          className={`${styles.blockPromptText} ${styles.highlightTextBlock}`}
                          data-highlight-target={`block-prompt-${block.blockId}`}
                          onMouseUp={(event) =>
                            handleHighlightTextMouseUp(`block-prompt-${block.blockId}`, blockPromptText, event)
                          }
                        >
                          {renderHighlightedText(
                            blockPromptText,
                            visibleHighlights[`block-prompt-${block.blockId}`] || [],
                            highlightRenderStyles
                          )}
                        </div>
                      ) : null}

                      {blockOptions.length > 0 ? (
                        <div className={styles.blockOptionBox}>
                          {blockOptions.map((option) => (
                            <div key={`${block.blockId}-${option.optionKey}`} className={styles.blockOptionItem}>
                              <strong>{option.optionKey}</strong>
                              <span>{option.optionText}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className={styles.questionList}>
                        {block.questions.map((question) => {
                          const answerValue = normalizeAnswerValue(answers[question.questionId]);
                          const promptText = cleanQuestionPromptText(question, block, 'READING');
                          const reviewStatus = getReviewStatus(resultByQuestionId.get(Number(question.questionId)));

                          return (
                            <div
                              key={question.questionId}
                              id={`ielts-question-${question.questionId}`}
                              data-question-id={question.questionId}
                              className={`${styles.questionCard} ${isReviewMode ? styles.reviewQuestionCard : ''} ${
                                isReviewMode ? styles[`reviewQuestion${reviewStatus}`] : ''
                              }`}
                            >
                              <div className={styles.questionTop}>
                                <button type="button" className={styles.questionIndex}>
                                  {question.questionNo}
                                </button>
                                {promptText ? (
                                  <p
                                    className={`${styles.questionText} ${styles.highlightTextBlock}`}
                                    data-highlight-target={`question-${question.questionId}`}
                                    onMouseUp={(event) =>
                                      handleHighlightTextMouseUp(`question-${question.questionId}`, promptText, event)
                                    }
                                  >
                                    {renderHighlightedText(
                                      promptText,
                                      visibleHighlights[`question-${question.questionId}`] || [],
                                      highlightRenderStyles
                                    )}
                                  </p>
                                ) : null}
                                <input
                                  type="text"
                                  value={answerValue}
                                  onChange={(event) => handleAnswerChange(question, block, event.target.value)}
                                  className={styles.answerInput}
                                  placeholder="Nhập đáp án"
                                  aria-label={`Answer for question ${question.questionNo}`}
                                  disabled={isReviewMode}
                                />
                              </div>

                              {shouldShowInlineQuestionOptions(question, block, 'READING') && (
                                <div className={styles.optionReference}>
                                  {question.options.map((option) => (
                                    <div key={option.optionId} className={styles.optionReferenceItem}>
                                      <strong>{option.optionKey}</strong>
                                      <span>{option.optionText}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {renderReviewFeedback(question)}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </article>
        </section>
      );
    });

  if (loading) {
    return (
      <main className={styles.practicePage}>
        <section className={styles.emptyState}>
          <h2>Đang tải đề IELTS...</h2>
          <p>Hệ thống đang lấy nội dung đề.</p>
        </section>
      </main>
    );
  }

  if (loadError || !practice) {
    return (
      <main className={styles.practicePage}>
        <section className={styles.emptyState}>
          <h2>Không thể tải đề IELTS</h2>
          <p>{loadError || 'Dữ liệu đề thi không hợp lệ.'}</p>
          <button type="button" onClick={() => navigate('/exams/ielts')}>
            Quay lại kho đề
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={`${styles.practicePage} ${isReviewMode ? styles.reviewPage : ''}`}>
      <header className={styles.stickyExamBar}>
        <div className={styles.examBarInner}>
          <div className={styles.examBarControls}>
            <button type="button" className={styles.topBackButton} onClick={() => navigate(`/exams/ielts/${examId}`)}>
              ← Quay lại
            </button>

            <div className={styles.examBarTitle}>
              <strong>{practice.examName}</strong>
            </div>

            <button
              type="button"
              className={styles.submitButton}
              onClick={isReviewMode ? () => navigate(`/practice/ielts/${examId}?skill=${skill}`) : handleSubmit}
              disabled={submitting}
            >
              {isReviewMode ? 'Làm lại đề này' : submitting ? 'Đang nộp' : 'Nộp bài'}
            </button>
          </div>
          {isReviewMode && reviewResult ? (
            <div className={styles.reviewScoreBar} aria-label="Kết quả bài làm">
              <span><small>Kỹ năng</small><strong>{isReadingPractice ? 'Reading' : 'Listening'}</strong></span>
              <span><small>Band</small><strong>{formatBand(reviewResult.bandScore)}</strong></span>
              <span><small>Chính xác</small><strong>{reviewResult.correctCount}/{reviewResult.totalQuestions}</strong></span>
              <span><small>Đã trả lời</small><strong>{reviewResult.answeredCount}/{reviewResult.totalQuestions}</strong></span>
              <span><small>Thời gian</small><strong>{formatElapsedTime(reviewResult.elapsedSeconds || 0)}</strong></span>
            </div>
          ) : null}
        </div>
      </header>

      {submitError && (
        <div className={`${styles.submitNotice} ${styles.submitNoticeError}`} role="alert" aria-live="assertive">
          <div className={styles.submitNoticeIcon} aria-hidden="true">
            !
          </div>
          <div className={styles.submitNoticeContent}>
            <strong>Không thể nộp bài IELTS</strong>
            <p>{submitError}</p>
          </div>
          <div className={styles.submitNoticeActions}>
            <button type="button" onClick={() => setSubmitError('')} aria-label="Đóng thông báo lỗi">
              Đóng
            </button>
          </div>
        </div>
      )}

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

      <div className={styles.bodyLayout}>
        <aside className={styles.questionNavigator}>
          <div className={styles.navigatorHeader}>
            <h3>Bảng câu hỏi</h3>
            <div className={styles.navigatorTimer} aria-label={`Thời gian làm bài ${formatElapsedTime(isReviewMode ? reviewResult?.elapsedSeconds || 0 : elapsedSeconds)}`}>
              <span className={styles.navigatorTimerLabel}>Thời gian</span>
              <span className={styles.navigatorTimerValue}>{formatElapsedTime(isReviewMode ? reviewResult?.elapsedSeconds || 0 : elapsedSeconds)}</span>
            </div>
          </div>

          {isReadingPractice && !isReviewMode ? (
            <div className={styles.highlightTool}>
            <button
              type="button"
              className={`${styles.highlightToggle} ${isHighlightModeEnabled ? styles.highlightToggleActive : ''}`}
              onClick={() => {
                setIsHighlightModeEnabled((prev) => {
                  const next = !prev;
                  if (!next) {
                    setHighlightToolbar(null);
                    clearTextSelection();
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
            </button>
            </div>
          ) : null}

          <div className={styles.navigatorLegend}>
            <span className={styles.legendItem}>
              <i className={`${styles.legendDot} ${isReviewMode ? styles.legendCorrect : styles.legendAnswered}`} /> {isReviewMode ? 'Trả lời đúng' : 'Câu đã làm'}
            </span>
            <span className={styles.legendItem}>
              <i className={`${styles.legendDot} ${isReviewMode ? styles.legendWrong : styles.legendUnanswered}`} /> {isReviewMode ? 'Trả lời sai' : 'Câu chưa làm'}
            </span>
            {isReviewMode ? <span className={styles.legendItem}><i className={`${styles.legendDot} ${styles.legendSkipped}`} /> Chưa trả lời</span> : null}
          </div>

          {questionGroups.map((group) => (
            <div key={group.groupId} className={styles.partNavBlock}>
              <button type="button" className={styles.partNavTitle} onClick={() => scrollToPart(group.partNo)}>
                {getPartLabel(group.partNo, skill)}
                {isReviewMode ? ` · ${group.questions.filter((question) => resultByQuestionId.get(Number(question.questionId))?.isCorrect).length}/${group.questions.length}` : ''}
              </button>
              <div className={styles.numberGrid}>
                {group.questions.map((question) => {
                  const isAnswered = Boolean(
                    String(
                      answers[question.questionId]?.selectedOptionKey ||
                        answers[question.questionId]?.answerText ||
                        ''
                    ).trim()
                  );
                  const reviewStatus = getReviewStatus(resultByQuestionId.get(Number(question.questionId)));

                  return (
                    <button
                      key={question.questionId}
                      type="button"
                      className={`${styles.numberButton} ${isReviewMode ? styles[`reviewNumber${reviewStatus}`] : isAnswered ? styles.answeredNumber : ''} ${
                        Number(activeQuestionId) === Number(question.questionId) ? styles.activeNumber : ''
                      }`}
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

        {isReadingPractice && highlightToolbar && isHighlightModeEnabled && (
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
                  aria-label={`Highlight màu ${item.key}`}
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
          {isReadingPractice ? renderReadingSections() : renderListeningSections()}

        </section>
      </div>

      {isReadingPractice && flashcardModalOpen && (
        <div className={styles.flashcardModalOverlay} onMouseDown={closeFlashcardModal}>
          <div className={styles.flashcardModal} onMouseDown={(event) => event.stopPropagation()}>
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
                  className={flashcardForm.deckMode === 'existing' ? styles.activeDeckMode : ''}
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
                <select name="deckName" value={flashcardForm.deckName} onChange={handleFlashcardFormChange}>
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
    </main>
  );
};

export default IeltsPractice;
