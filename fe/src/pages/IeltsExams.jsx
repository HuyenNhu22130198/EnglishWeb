import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ieltsAPI } from '../services/ieltsService';
import styles from './IeltsExams.module.css';

const IELTS_SKILLS = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'];

const IeltsExams = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError('');
        const response = await ieltsAPI.getIeltsExams(keyword);

        if (response.success) {
          setExams(response.data || []);
        } else {
          setError(response.message || 'Không thể tải danh sách đề IELTS');
        }
      } catch (err) {
        setError(err.message || 'Lỗi kết nối đến server');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword]);

  const handleViewDetail = (examId) => {
    navigate(`/exams/ielts/${examId}`);
  };

  return (
    <main className={styles.page}>
      <section className={styles.filters}>
        <div className={styles.searchWrap}>
          <input
            type="text"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm kiếm theo mã đề hoặc tên đề..."
            className={styles.searchInput}
          />
          <span className={styles.resultMeta}>
            Tìm thấy <strong>{exams.length}</strong> đề
          </span>
        </div>
      </section>

      <section className={styles.examGrid}>
        {loading ? (
          <article className={styles.emptyState}>
            <h2>Đang tải dữ liệu IELTS...</h2>
            <p>Hệ thống đang đọc danh sách đề.</p>
          </article>
        ) : error ? (
          <article className={styles.emptyState}>
            <h2>Không thể tải dữ liệu</h2>
            <p>{error}</p>
          </article>
        ) : exams.length === 0 ? (
          <article className={styles.emptyState}>
            <h2>Chưa có đề IELTS</h2>
            <p>Khi bạn thêm dữ liệu IELTS, danh sách đề sẽ xuất hiện tại đây.</p>
          </article>
        ) : (
          exams.map((exam) => (
            <article key={exam.id} className={styles.examCard}>
              <div className={styles.cardTop}>
                <span className={styles.examCode}>{exam.examCode}</span>
                <span className={styles.status}>{exam.status}</span>
              </div>

              <h2>{exam.title}</h2>
              <p className={styles.description}>{exam.description}</p>

              <div className={styles.stats}>
                <div>
                  <span>Tổng câu</span>
                  <strong>{exam.totalQuestions}</strong>
                </div>
                <div>
                  <span>Listening</span>
                  <strong>{exam.listeningQuestions}</strong>
                </div>
                <div>
                  <span>Reading</span>
                  <strong>{exam.readingQuestions}</strong>
                </div>
                <div>
                  <span>Lượt làm</span>
                  <strong>{Number(exam.attempts || 0).toLocaleString('vi-VN')}</strong>
                </div>
              </div>

              <div className={styles.skills}>
                {IELTS_SKILLS.map((skill) => (
                  <span key={skill} className={styles.skillBadge}>
                    {skill}
                  </span>
                ))}
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => handleViewDetail(exam.id)}
                >
                  Chi tiết
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
};

export default IeltsExams;
