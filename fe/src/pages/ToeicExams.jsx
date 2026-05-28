import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toeicAPI } from '../services/toeicService';
import styles from './ToeicExams.module.css';

const ToeicExams = () => {
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState('');
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchToeicExams = async (searchKeyword = '') => {
    try {
      setLoading(true);
      setError('');

      const response = await toeicAPI.getToeicExams(searchKeyword);

      if (response.success) {
        setExams(response.data || []);
      } else {
        setError(response.message || 'Không thể tải danh sách đề TOEIC');
      }
    } catch (err) {
      setError(err.message || 'Lỗi kết nối đến server');
      console.error('Fetch TOEIC exams error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchToeicExams(keyword);
    }, 350);

    return () => clearTimeout(timer);
  }, [keyword]);

  const handleStartExam = (examId) => {
    navigate(`/practice/toeic/${examId}`);
  };

  return (
    <main className={styles.toeicPage}>
      <section className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>Kho đề TOEIC</span>

          <h1>Danh sách đề thi TOEIC</h1>

          <p>
            Luyện tập với các đề ETS full test gồm đầy đủ Listening và Reading.
          </p>
        </div>
      </section>

      <section className={styles.searchSection}>
        <div className={styles.searchCard}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>⌕</span>

            <input
              type="text"
              value={keyword}
              placeholder="Tìm kiếm đề thi TOEIC..."
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          <div className={styles.resultCount}>
            Tìm thấy <strong>{exams.length}</strong> đề thi
          </div>
        </div>
      </section>

      <section className={styles.examSection}>
        {loading ? (
          <div className={styles.emptyState}>
            <h2>Đang tải danh sách đề thi...</h2>
            <p>Vui lòng chờ trong giây lát.</p>
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <h2>Không thể tải dữ liệu</h2>
            <p>{error}</p>

            <button
              type="button"
              className={styles.reloadButton}
              onClick={() => fetchToeicExams(keyword)}
            >
              Thử lại
            </button>
          </div>
        ) : exams.length > 0 ? (
          <div className={styles.examGrid}>
            {exams.map((exam) => (
              <article key={exam.id} className={styles.examCard}>
                <div className={styles.examCardHeader}>
                  <span className={styles.statusBadge}>{exam.status}</span>

                  <span className={styles.yearBadge}>
                    {exam.year ? `ETS ${exam.year}` : exam.examCode}
                  </span>
                </div>

                <h2>{exam.title}</h2>

                <p className={styles.examDescription}>{exam.description}</p>

                <div className={styles.examInfoGrid}>
                  <div>
                    <span>Số câu</span>
                    <strong>{exam.questions}</strong>
                  </div>

                  <div>
                    <span>Thời gian</span>
                    <strong>{exam.duration} phút</strong>
                  </div>

                  <div>
                    <span>Phạm vi</span>
                    <strong>{exam.parts}</strong>
                  </div>

                  <div>
                    <span>Điểm tối đa</span>
                    <strong>{exam.score}</strong>
                  </div>
                </div>

                <div className={styles.examFooter}>
                  <span>{Number(exam.attempts || 0).toLocaleString('vi-VN')} lượt luyện</span>

                  <button type="button" onClick={() => handleStartExam(exam.id)}>
                    Làm bài
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <h2>Không tìm thấy đề thi phù hợp</h2>
            <p>Thử nhập từ khóa khác, ví dụ: ETS, 2021, Test 01.</p>
          </div>
        )}
      </section>
    </main>
  );
};

export default ToeicExams;