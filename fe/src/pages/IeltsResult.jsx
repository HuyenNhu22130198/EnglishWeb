import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ieltsAPI } from '../services/ieltsService';
import IeltsPractice from './IeltsPractice';
import styles from './IeltsResult.module.css';

const IeltsResult = () => {
  const navigate = useNavigate();
  const { attemptId } = useParams();
  const [result, setResult] = useState(null);
  const [practice, setPractice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReview = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setResult(null);
      setPractice(null);

      const resultResponse = await ieltsAPI.getIeltsResult(attemptId);
      if (!resultResponse.success || !resultResponse.data?.examId || !resultResponse.data?.skill) {
        throw new Error('INVALID_RESULT');
      }

      const loadedResult = resultResponse.data;
      const practiceResponse = await ieltsAPI.getIeltsPractice(loadedResult.examId, loadedResult.skill);
      if (!practiceResponse.success || !practiceResponse.data) {
        throw new Error('INVALID_EXAM');
      }

      setResult(loadedResult);
      setPractice(practiceResponse.data);
    } catch (requestError) {
      console.error('Fetch IELTS review error:', requestError);
      setError('Không thể tải đầy đủ bài làm này. Vui lòng kiểm tra kết nối và thử lại.');
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  if (loading) {
    return (
      <main className={styles.resultPage}>
        <section className={styles.emptyState} aria-live="polite">
          <h2>Đang tải bài làm IELTS...</h2>
          <p>Hệ thống đang lấy kết quả và nội dung đề.</p>
        </section>
      </main>
    );
  }

  if (error || !result || !practice) {
    return (
      <main className={styles.resultPage}>
        <section className={styles.emptyState} role="alert">
          <h2>Không thể tải kết quả IELTS</h2>
          <p>{error || 'Bài làm không tồn tại hoặc bạn không có quyền truy cập.'}</p>
          <div className={styles.errorActions}>
            <button type="button" onClick={fetchReview}>Thử lại</button>
            <button type="button" onClick={() => navigate('/exams/ielts')}>Quay lại kho đề</button>
          </div>
        </section>
      </main>
    );
  }

  return <IeltsPractice mode="review" initialPractice={practice} reviewResult={result} />;
};

export default IeltsResult;
