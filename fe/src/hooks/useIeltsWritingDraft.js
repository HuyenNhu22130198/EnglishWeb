import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const IELTS_WRITING_DRAFT_DEBOUNCE_MS = 750;

export const getIeltsWritingDraftKey = (userId, examId) => {
  if (userId === null || userId === undefined || examId === null || examId === undefined) {
    return '';
  }

  return `ielts-writing-draft-${userId}-${examId}`;
};

const normalizeDraft = (value, userId, examId) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  if (String(value.userId) !== String(userId) || String(value.examId) !== String(examId)) {
    return null;
  }

  const elapsed = Number(value.elapsedSeconds);

  return {
    examId,
    userId,
    task1Answer: typeof value.task1Answer === 'string' ? value.task1Answer : '',
    task2Answer: typeof value.task2Answer === 'string' ? value.task2Answer : '',
    task1Note: typeof value.task1Note === 'string' ? value.task1Note : '',
    task2Note: typeof value.task2Note === 'string' ? value.task2Note : '',
    activeTask: Number(value.activeTask) === 2 ? 2 : 1,
    elapsedSeconds: Number.isFinite(elapsed) && elapsed >= 0 ? Math.floor(elapsed) : 0,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
  };
};

export const loadIeltsWritingDraft = (userId, examId) => {
  const key = getIeltsWritingDraftKey(userId, examId);
  if (!key) return null;

  try {
    const rawDraft = localStorage.getItem(key);
    if (!rawDraft) return null;

    const draft = normalizeDraft(JSON.parse(rawDraft), userId, examId);
    if (!draft) {
      localStorage.removeItem(key);
    }
    return draft;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

export const removeIeltsWritingDraft = (userId, examId) => {
  const key = getIeltsWritingDraftKey(userId, examId);
  if (key) localStorage.removeItem(key);
};

const persistDraft = (key, draft) => {
  if (!key || !draft) return false;

  try {
    localStorage.setItem(key, JSON.stringify({
      ...draft,
      updatedAt: new Date().toISOString(),
    }));
    return true;
  } catch {
    return false;
  }
};

export const useIeltsWritingDraft = ({ userId, examId, ready, draft }) => {
  const draftKey = useMemo(() => getIeltsWritingDraftKey(userId, examId), [examId, userId]);
  const [saveStatus, setSaveStatus] = useState('idle');
  const dirtyRef = useRef(false);
  const suppressFlushRef = useRef(false);
  const latestDraftRef = useRef(draft);
  const readyRef = useRef(ready);

  useEffect(() => {
    latestDraftRef.current = draft;
    readyRef.current = ready;
  }, [draft, ready]);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    suppressFlushRef.current = false;
    setSaveStatus('saving');
  }, []);

  const clearDraft = useCallback(() => {
    if (draftKey) localStorage.removeItem(draftKey);
    dirtyRef.current = false;
    suppressFlushRef.current = true;
    setSaveStatus('idle');
  }, [draftKey]);

  useEffect(() => {
    if (!ready || !draftKey || !dirtyRef.current) return undefined;

    const timeoutId = window.setTimeout(() => {
      const saved = persistDraft(draftKey, latestDraftRef.current);
      dirtyRef.current = false;
      setSaveStatus(saved ? 'saved' : 'error');
    }, IELTS_WRITING_DRAFT_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [draft, draftKey, ready]);

  useEffect(() => {
    const flushDraft = () => {
      if (readyRef.current && draftKey && !suppressFlushRef.current) {
        persistDraft(draftKey, latestDraftRef.current);
      }
    };

    window.addEventListener('pagehide', flushDraft);
    window.addEventListener('beforeunload', flushDraft);
    return () => {
      window.removeEventListener('pagehide', flushDraft);
      window.removeEventListener('beforeunload', flushDraft);
      flushDraft();
    };
  }, [draftKey]);

  return {
    draftKey,
    saveStatus,
    markDirty,
    clearDraft,
  };
};
