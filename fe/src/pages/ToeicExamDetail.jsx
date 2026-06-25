import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toeicAPI } from '../services/toeicService';
import styles from './ToeicExamDetail.module.css';

const TOEIC_PARTS = [
  { partNo: 1, count: 6 },
  { partNo: 2, count: 25 },
  { partNo: 3, count: 39 },
  { partNo: 4, count: 30 },
  { partNo: 5, count: 30 },
  { partNo: 6, count: 16 },
  { partNo: 7, count: 54 },
];

const ToeicExamDetail = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('practice');
  const [selectedParts, setSelectedParts] = useState([1]);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await toeicAPI.getToeicExams();

        if (!response.success) {
          setError(response.message || 'Không thể tải thông tin đề TOEIC');
          return;
        }

        const foundExam = (response.data || []).find((item) => String(item.id) === String(examId));

        if (!foundExam) {
          setError('Không tìm thấy đề TOEIC phù hợp');
          return;
        }

        setExam(foundExam);
      } catch (err) {
        setError(err.message || 'Lỗi kết nối đến server');
        console.error('Fetch TOEIC exam detail error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId]);

  const selectedQuestionCount = useMemo(() => {
    return TOEIC_PARTS.filter((part) => selectedParts.includes(part.partNo)).reduce(
      (total, part) => total + part.count,
      0
    );
  }, [selectedParts]);

  const togglePart = (partNo) => {
    setSelectedParts((prev) => {
      if (prev.includes(partNo)) {
        return prev.length === 1 ? prev : prev.filter((part) => part !== partNo);
      }

      return [...prev, partNo].sort((a, b) => a - b);
    });
  };

  const startPractice = () => {
    const queryString = selectedParts.map((part) => `parts=${part}`).join('&');
    navigate(`/practice/toeic/${examId}?${queryString}`);
  };

  const startFullTest = () => {
    navigate(`/practice/toeic/${examId}`);
  };

  if (loading) {
    return (
      <main className={styles.detailPage}>
        <div className={styles.emptyState}>Đang tải thông tin đề thi...</div>
      </main>
    );
  }

  if (error || !exam) {
    return (
      <main className={styles.detailPage}>
        <div className={styles.emptyState}>
          <strong>{error || 'Không có dữ liệu đề thi'}</strong>
          <button type="button" onClick={() => navigate('/exams/toeic')}>
            Quay lại kho đề
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.detailPage}>
      <section className={styles.header}>
        <button type="button" className={styles.backButton} onClick={() => navigate('/exams/toeic')}>
          Quay lại kho đề
        </button>

        <h1>{exam.title}</h1>
      </section>

      <section className={styles.panel}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={activeTab === 'practice' ? styles.activeTab : ''}
            onClick={() => setActiveTab('practice')}
          >
            Luyện tập
          </button>
          <button
            type="button"
            className={activeTab === 'full' ? styles.activeTab : ''}
            onClick={() => setActiveTab('full')}
          >
            Làm full test
          </button>
        </div>

        {activeTab === 'practice' ? (
          <div className={styles.practiceArea}>
            <div className={styles.sectionHeader}>
              <h2>Chọn phần thi bạn muốn làm</h2>
              <span>{selectedQuestionCount} câu hỏi</span>
            </div>

            <div className={styles.partList}>
              {TOEIC_PARTS.map((part) => (
                <label key={part.partNo} className={styles.partRow}>
                  <input
                    type="checkbox"
                    checked={selectedParts.includes(part.partNo)}
                    onChange={() => togglePart(part.partNo)}
                  />

                  <div>
                    <strong>
                      Part {part.partNo} ({part.count} câu hỏi)
                    </strong>
                  </div>
                </label>
              ))}
            </div>

            <button type="button" className={styles.primaryButton} onClick={startPractice}>
              Bắt đầu luyện tập
            </button>
          </div>
        ) : (
          <div className={styles.fullTestArea}>
            <div className={styles.fullTestGrid}>
              <div>
                <span>Số câu</span>
                <strong>{exam.questions || 200}</strong>
              </div>
              <div>
                <span>Thời gian</span>
                <strong>{exam.duration || 120} phút</strong>
              </div>
              <div>
                <span>Phạm vi</span>
                <strong>Part 1 - Part 7</strong>
              </div>
            </div>

            <button type="button" className={styles.primaryButton} onClick={startFullTest}>
              Làm full test
            </button>
          </div>
        )}
      </section>
    </main>
  );
};

export default ToeicExamDetail;
