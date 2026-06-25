import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ieltsAPI } from '../services/ieltsService';
import styles from './IeltsExams.module.css';

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

  const handleStartSkill = (examId, skill) => {
    navigate(`/practice/ielts/${examId}?skill=${skill}`);
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>Kho de IELTS</span>
        <h1>Danh sach de IELTS</h1>
        <p>
          Luyen de IELTS theo du lieu that trong database. Hien tai he thong ho tro flow lam bai va
          cham diem cho Listening, Reading.
        </p>
      </section>

      <section className={styles.filters}>
        <div className={styles.searchWrap}>
          <input
            type="text"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tim kiem theo ma de hoac ten de..."
            className={styles.searchInput}
          />
          <span className={styles.resultMeta}>
            Tim thay <strong>{exams.length}</strong> de
          </span>
        </div>
      </section>

      <section className={styles.examGrid}>
        {loading ? (
          <article className={styles.emptyState}>
            <h2>Dang tai du lieu IELTS...</h2>
            <p>He thong dang doc danh sach de tu database.</p>
          </article>
        ) : error ? (
          <article className={styles.emptyState}>
            <h2>Khong the tai du lieu</h2>
            <p>{error}</p>
          </article>
        ) : exams.length === 0 ? (
          <article className={styles.emptyState}>
            <h2>Chua co de IELTS</h2>
            <p>Khi ban insert du lieu vao bang IELTS, danh sach de se xuat hien tai day.</p>
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
                  <span>Tong cau</span>
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
                  <span>Luot lam</span>
                  <strong>{Number(exam.attempts || 0).toLocaleString('vi-VN')}</strong>
                </div>
              </div>

              <div className={styles.skills}>
                {(exam.availableSkills || []).map((skill) => (
                  <span key={skill} className={styles.skillBadge}>
                    {skill}
                  </span>
                ))}
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => handleStartSkill(exam.id, 'LISTENING')}
                  disabled={!exam.availableSkills?.includes('LISTENING')}
                >
                  Lam Listening
                </button>

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => handleStartSkill(exam.id, 'READING')}
                  disabled={!exam.availableSkills?.includes('READING')}
                >
                  Lam Reading
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
