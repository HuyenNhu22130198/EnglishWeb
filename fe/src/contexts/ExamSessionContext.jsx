import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ExamSessionContext = createContext(null);

/**
 * Ghi nhận ngữ cảnh đề người dùng đang làm (examId, loại đề, part/skill)
 * để chatbot có thể tra nhanh theo số câu thay vì phải dán nguyên câu hỏi.
 */
export const ExamSessionProvider = ({ children }) => {
  const [examContext, setExamContextState] = useState(null);

  const setExamContext = useCallback((context) => {
    setExamContextState(context ? { ...context } : null);
  }, []);

  const clearExamContext = useCallback(() => {
    setExamContextState(null);
  }, []);

  const value = useMemo(
    () => ({ examContext, setExamContext, clearExamContext }),
    [examContext, setExamContext, clearExamContext],
  );

  return <ExamSessionContext.Provider value={value}>{children}</ExamSessionContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useExamSession = () => {
  const context = useContext(ExamSessionContext);
  if (!context) {
    return { examContext: null, setExamContext: () => {}, clearExamContext: () => {} };
  }
  return context;
};

export default ExamSessionContext;
