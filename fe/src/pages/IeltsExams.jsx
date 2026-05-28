import styles from './IeltsExams.module.css';
import Header from '../components/Header';
import Footer from '../components/Footer';

const IeltsExams = () => {
  return (
    <>
      <div className={styles.page}>
        <div className="container" style={{ paddingTop: '100px', paddingBottom: '100px' }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{ 
              color: '#904d00', 
              fontWeight: '600', 
              letterSpacing: '2px', 
              fontSize: '15px',
              marginBottom: '12px'
            }}>
              KHO ĐỀ THI
            </div>
            <h1 style={{ 
              fontSize: '42px', 
              fontWeight: '700', 
              color: '#1b1c1c',
              marginBottom: '16px'
            }}>
              Kho Đề IELTS
            </h1>
            <p style={{ 
              fontSize: '20px', 
              color: '#444650', 
              maxWidth: '720px', 
              margin: '0 auto' 
            }}>
              Bộ đề IELTS Academic & General Training đầy đủ 4 kỹ năng Listening, Reading, Writing, Speaking
            </p>
          </div>

          {/* Search & Filters */}
          <div className={styles.filters}>
            <input 
              type="text" 
              placeholder="Tìm kiếm theo số đề, chủ đề..." 
              className={styles.searchInput}
            />
            
            <div className={styles.filterGroup}>
              <select className={styles.filterSelect}>
                <option value="">Tất cả band score</option>
                <option value="5.5">5.5 - 6.5</option>
                <option value="6.5">6.5 - 7.5</option>
                <option value="7.5">7.5+</option>
              </select>

              <select className={styles.filterSelect}>
                <option value="">Tất cả kỹ năng</option>
                <option value="full">Đề Full Test</option>
                <option value="listening">Listening</option>
                <option value="reading">Reading</option>
                <option value="writing">Writing</option>
                <option value="speaking">Speaking</option>
              </select>

              <select className={styles.filterSelect}>
                <option value="">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="popular">Phổ biến nhất</option>
              </select>
            </div>
          </div>

          {/* Exam Grid */}
          <div className={styles.examGrid}>
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className={styles.examCard}>
                <div className={styles.cardTop}>
                  <div className={styles.examNumber}>
                    ĐỀ CAMBRIDGE #{10 + index}
                  </div>
                  <div className={styles.difficulty}>
                    {index % 3 === 0 ? '6.5 - 7.0' : index % 3 === 1 ? '7.0 - 7.5' : '7.5+'}
                  </div>
                </div>

                <div className={styles.cardInfo}>
                  <div className={styles.infoItem}>
                    <span>Full 4 kỹ năng</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span>2 giờ 45 phút</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span>Có đáp án chi tiết</span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <button className={styles.btnPrimary}>
                    Làm đề thi ngay
                  </button>
                  <button className={styles.btnSecondary}>
                    Xem chi tiết
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Load more */}
          <div style={{ textAlign: 'center', marginTop: '60px' }}>
            <button className={styles.loadMore}>Xem thêm đề thi IELTS</button>
          </div>
        </div>
      </div>

    </>
  );
};

export default IeltsExams;