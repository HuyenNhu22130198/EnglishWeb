import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bannerAPI } from '../services/bannerService';
import { toeicAPI } from '../services/toeicService';
import styles from './Home.module.css';

const platformBenefits = [
  {
    icon: 'Đ',
    label: 'Kho đề',
    title: 'Đề bám sát cấu trúc thi',
    description: 'Luyện Listening, Reading theo đúng format quen thuộc, vào bài nhanh và tập trung đúng trọng tâm.',
  },
  {
    icon: 'T',
    label: 'Tiến độ',
    title: 'Theo dõi kết quả rõ ràng',
    description: 'Xem lại quá trình luyện tập, giữ nhịp ôn ổn định và nhận ra phần cần cải thiện sau mỗi lần làm bài.',
  },
  {
    icon: 'Ô',
    label: 'Ôn tập',
    title: 'Ôn từ vựng liền mạch',
    description: 'Kết hợp flashcard ngay trong hệ thống để biến lỗi sai và từ mới thành tài liệu ôn tập hằng ngày.',
  },
];

const practiceSteps = [
  'Chọn đề phù hợp',
  'Làm bài trực tiếp trên web',
  'Xem kết quả và ôn lại',
];

const featuredIeltsExams = [
  {
    id: 'ielts-reading-18-1',
    badge: 'IELTS Reading',
    title: 'Cambridge IELTS 18 - Test 1 Reading',
    questions: 40,
    duration: 60,
    attempts: '2.3k',
  },
  {
    id: 'ielts-listening-18-1',
    badge: 'IELTS Listening',
    title: 'Cambridge IELTS 18 - Test 1 Listening',
    questions: 40,
    duration: 40,
    attempts: '1.8k',
  },
];

const fallbackToeicExams = [
  {
    id: 'toeic-fallback-1',
    examCode: 'ETS 2024',
    title: 'Test 01 - ETS 2024',
    questions: 200,
    duration: 120,
    attempts: 1200,
  },
  {
    id: 'toeic-fallback-2',
    examCode: 'ETS 2024',
    title: 'Test 02 - ETS 2024',
    questions: 200,
    duration: 120,
    attempts: 856,
  },
];

const Home = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [sliderImages, setSliderImages] = useState([]);
  const [toeicExams, setToeicExams] = useState([]);

  useEffect(() => {
    bannerAPI
      .getPublicBanners()
      .then((banners) => {
        setSliderImages(banners);
        setActiveSlide(0);
      })
      .catch(() => setSliderImages([]));
  }, []);

  useEffect(() => {
    toeicAPI
      .getToeicExams()
      .then((response) => {
        if (response?.success) {
          setToeicExams((response.data || []).slice(0, 2));
        }
      })
      .catch(() => setToeicExams([]));
  }, []);

  useEffect(() => {
    if (sliderImages.length < 2) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveSlide((currentSlide) => (currentSlide + 1) % sliderImages.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [sliderImages.length]);

  const showSlide = (slideIndex) => {
    setActiveSlide((slideIndex + sliderImages.length) % sliderImages.length);
  };

  const visibleToeicExams = toeicExams.length > 0 ? toeicExams : fallbackToeicExams;

  return (
    <main className={styles.home}>
      <section className={styles.hero}>
        {sliderImages.length > 0 && (
          <div className={styles.heroBannerLayer} aria-hidden="true">
            {sliderImages.map((banner, index) => (
              <img
                key={banner.id}
                src={banner.imageUrl}
                alt=""
                className={index === activeSlide ? styles.activeHeroBanner : styles.heroBanner}
              />
            ))}
          </div>
        )}
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <div className={styles.heroActions}>
              <Link to="/exams/toeic" className={styles.primaryAction}>
                Luyện đề TOEIC
              </Link>
              <Link to="/exams/ielts" className={styles.primaryAction}>
                Luyện đề IELTS
              </Link>
              <Link to="/flashcard" className={styles.secondaryAction}>
                Ôn flashcard
              </Link>
            </div>
          </div>
        </div>
        {sliderImages.length > 1 && (
          <div className={styles.heroNavigation}>
            <button
              type="button"
              className={`${styles.heroNavButton} ${styles.heroPreviousButton}`}
              onClick={() => showSlide(activeSlide - 1)}
              aria-label="Banner trước"
            >
              ‹
            </button>
            <button
              type="button"
              className={`${styles.heroNavButton} ${styles.heroNextButton}`}
              onClick={() => showSlide(activeSlide + 1)}
              aria-label="Banner tiếp theo"
            >
              ›
            </button>
          </div>
        )}
      </section>

      <section className={styles.examSection} id="courses">
        <div className={styles.sectionHeader}>
          <span>Tại sao chọn EngWise?</span>
          <h2>Nền tảng luyện đề gọn gàng, đủ công cụ để học và theo dõi tiến bộ</h2>
          <p>
            Tập trung vào trải nghiệm làm đề trực tiếp, xem lại kết quả và ôn tập ngay sau mỗi lần luyện để việc học
            không bị đứt quãng.
          </p>
        </div>

        <div className={styles.featureGrid}>
          {platformBenefits.map((benefit) => (
            <article className={styles.featureCard} key={benefit.title}>
              <div className={styles.featureIcon}>{benefit.icon}</div>
              <span className={styles.featureLabel}>{benefit.label}</span>
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.featuredExamSection}>
        <div className={styles.featuredExamBlock}>
          <div className={styles.featuredExamHeader}>
            <div>
              <h2>Luyện thi TOEIC</h2>
              <p>Chọn nhanh các bộ đề TOEIC quen thuộc để vào bài gọn và luyện đúng trọng tâm.</p>
            </div>
            <Link to="/exams/toeic" className={styles.featuredExamLink}>
              Xem tất cả
            </Link>
          </div>

          <div className={styles.featuredExamGrid}>
            {visibleToeicExams.map((exam) => (
              <article className={styles.examPreviewCard} key={exam.id}>
                <div className={styles.examPreviewBody}>
                  <span className={styles.examPreviewBadge}>
                    {exam.year ? `TOEIC ETS ${exam.year}` : exam.examCode || 'TOEIC'}
                  </span>
                  <h3>{exam.title}</h3>
                  <div className={styles.examPreviewMeta}>
                    <span>{exam.questions || 200} câu</span>
                    <span>{exam.duration || 120} phút</span>
                  </div>
                </div>
                <div className={styles.examPreviewFooter}>
                  <small>Đã làm: {Number(exam.attempts || 0).toLocaleString('vi-VN')}</small>
                  <Link to={String(exam.id).startsWith('toeic-fallback-') ? '/exams/toeic' : `/exams/toeic/${exam.id}`}>Làm bài</Link>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className={styles.featuredExamBlock}>
          <div className={styles.featuredExamHeader}>
            <div>
              <h2>Luyện thi IELTS</h2>
              <p>Làm quen với bộ Cambridge phổ biến để luyện từng kỹ năng IELTS theo lộ trình dễ theo dõi.</p>
            </div>
            <Link to="/exams/ielts" className={styles.featuredExamLink}>
              Xem tất cả
            </Link>
          </div>

          <div className={styles.featuredExamGrid}>
            {featuredIeltsExams.map((exam) => (
              <article className={styles.examPreviewCard} key={exam.id}>
                <div className={styles.examPreviewBody}>
                  <span className={`${styles.examPreviewBadge} ${styles.ieltsBadge}`}>{exam.badge}</span>
                  <h3>{exam.title}</h3>
                  <div className={styles.examPreviewMeta}>
                    <span>{exam.questions} câu</span>
                    <span>{exam.duration} phút</span>
                  </div>
                </div>
                <div className={styles.examPreviewFooter}>
                  <small>Đã làm: {exam.attempts}</small>
                  <Link to="/exams/ielts">Làm bài</Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.workflowSection}>
        <div className={styles.workflowCopy}>
          <span>Quy trình ôn luyện</span>
          <h2>3 bước để bắt đầu luyện đề dễ hơn</h2>
          <p>Chỉ cần chọn đề, làm bài và xem lại kết quả. Mọi thứ được giữ gọn trong một luồng học dễ theo dõi.</p>
        </div>

        <div className={styles.stepList}>
          {practiceSteps.map((step, index) => (
            <div className={styles.stepItem} key={step}>
              <strong>{String(index + 1).padStart(2, '0')}</strong>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Home;
