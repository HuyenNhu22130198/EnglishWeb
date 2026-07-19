import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ieltsAPI } from '../services/ieltsService';
import styles from './IeltsExamDetail.module.css';

const IELTS_SKILLS = [
  {
    key: 'LISTENING',
    title: 'Listening',
    description: 'Luyện nghe với các câu hỏi và tài liệu âm thanh của đề.',
    questionField: 'listeningQuestions',
    path: (examId) => `/practice/ielts/${examId}?skill=LISTENING`,
  },
  {
    key: 'READING',
    title: 'Reading',
    description: 'Luyện đọc với bài đọc, câu hỏi và đáp án của đề.',
    questionField: 'readingQuestions',
    path: (examId) => `/practice/ielts/${examId}?skill=READING`,
  },
  {
    key: 'WRITING',
    title: 'Writting',
    description: 'Luyện viết theo các dạng bài IELTS Writting Task 1 và Task 2.',
    questionField: null,
    path: (examId) => `/practice/ielts/${examId}/writing`,
  },
  {
    key: 'SPEAKING',
    title: 'Speaking',
    description: 'Luyện nói với các chủ đề và câu hỏi mô phỏng IELTS Speaking.',
    questionField: null,
    path: '',
  },
];

const IeltsExamDetail = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchExam = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await ieltsAPI.getIeltsExams();

        if (!response.success) {
          setError(response.message || 'Không thể tải thông tin đề IELTS');
          return;
        }

        const foundExam = (response.data || []).find((item) => String(item.id) === String(examId));

        if (!foundExam) {
          setError('Không tìm thấy đề IELTS phù hợp');
          return;
        }

        setExam(foundExam);
      } catch (err) {
        setError(err.message || 'Lỗi kết nối đến server');
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId]);

  const availableSkills = useMemo(
    () => new Set((exam?.availableSkills || []).map((skill) => String(skill).toUpperCase())),
    [exam?.availableSkills]
  );

  const startSkill = (skill) => {
    if (!skill.path) {
      return;
    }

    navigate(skill.path(examId));
  };

  if (loading) {
    return (
      <main className={styles.detailPage}>
        <div className={styles.emptyState}>Đang tải thông tin đề IELTS...</div>
      </main>
    );
  }

  if (error || !exam) {
    return (
      <main className={styles.detailPage}>
        <div className={styles.emptyState}>
          <strong>{error || 'Không có dữ liệu đề IELTS'}</strong>
          <button type="button" onClick={() => navigate('/exams/ielts')}>
            Quay lại kho đề
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.detailPage}>
      <section className={styles.header}>
        <button type="button" className={styles.backButton} onClick={() => navigate('/exams/ielts')}>
          Quay lại kho đề
        </button>

        <span className={styles.eyebrow}>{exam.examCode}</span>
        <h1>{exam.title}</h1>
        {exam.description ? <p>{exam.description}</p> : null}
      </section>

      <section className={styles.panel}>
        <div className={styles.summaryGrid}>
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

        <div className={styles.sectionHeader}>
          <h2>Chọn bài test bạn muốn làm</h2>
          <span>{exam.status}</span>
        </div>

        <div className={styles.skillGrid}>
          {IELTS_SKILLS.map((skill) => {
            const isAvailable = skill.key === 'WRITING' || availableSkills.has(skill.key);
            const questionCount = skill.questionField ? exam[skill.questionField] || 0 : null;
            const isRouteReady = Boolean(skill.path);

            return (
              <article key={skill.key} className={styles.skillCard}>
                <div>
                  <strong>{skill.title}</strong>
                  <p>{skill.description}</p>
                </div>

                <span>{questionCount === null ? 'Đang cập nhật' : `${questionCount} câu hỏi`}</span>

                <button
                  type="button"
                  onClick={() => startSkill(skill)}
                  disabled={!isAvailable || !isRouteReady}
                >
                  Làm {skill.title}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
};

export default IeltsExamDetail;
