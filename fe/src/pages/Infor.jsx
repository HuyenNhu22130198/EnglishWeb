import Header from '../components/Header';
import Footer from '../components/Footer';
import styles from './Infor.module.css';

const Infor = () => {
  return (
    <>
     
      <div className={styles.inforPage}>
        <div className="container" style={{ paddingTop: '100px', paddingBottom: '80px' }}>
          
          <div className={styles.header}>
            <h1>Trang Cá Nhân</h1>
            <p>Quản lý thông tin cá nhân và theo dõi tiến độ học tập của bạn</p>
          </div>

          <div className={styles.content}>
            
            {/* Thông tin cá nhân */}
            <div className={styles.profileCard}>
              <div className={styles.avatarSection}>
                <div className={styles.avatar}>
                  <span>N</span>
                </div>
                <div>
                  <h2>Huyền Như Đặng</h2>
                  <p>Level: Intermediate • Đang học IELTS Intensive</p>
                </div>
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <strong>Email:</strong>
                  <span>huyen.nguyen@gmail.com</span>
                </div>
                <div className={styles.infoItem}>
                  <strong>Số điện thoại:</strong>
                  <span>0123 456 789</span>
                </div>
                <div className={styles.infoItem}>
                  <strong>Ngày tham gia:</strong>
                  <span>15/01/2025</span>
                </div>
                <div className={styles.infoItem}>
                  <strong>Mục tiêu hiện tại:</strong>
                  <span>IELTS 7.0+</span>
                </div>
              </div>

              <button className={styles.editButton}>Chỉnh sửa thông tin</button>
            </div>

            {/* Tiến độ học tập */}
            <div className={styles.progressSection}>
              <h3>Tiến độ học tập</h3>
              
              <div className={styles.progressCards}>
                <div className={styles.progressCard}>
                  <div className={styles.progressTitle}>IELTS Intensive</div>
                  <div className={styles.progressBarContainer}>
                    <div className={styles.progressBar} style={{ width: '68%' }}></div>
                  </div>
                  <div className={styles.progressText}>68% hoàn thành • 11/16 tuần</div>
                </div>

                <div className={styles.progressCard}>
                  <div className={styles.progressTitle}>English Communication</div>
                  <div className={styles.progressBarContainer}>
                    <div className={styles.progressBar} style={{ width: '92%' }}></div>
                  </div>
                  <div className={styles.progressText}>92% hoàn thành • 11/12 tuần</div>
                </div>
              </div>
            </div>

            {/* Lịch sử học tập */}
            <div className={styles.historySection}>
              <h3>Lịch sử hoạt động gần đây</h3>
              <div className={styles.historyList}>
                <div className={styles.historyItem}>
                  <div>Hoàn thành Test TOEIC #102</div>
                  <div className={styles.historyDate}>Hôm nay, 15:30</div>
                </div>
                <div className={styles.historyItem}>
                  <div>Làm bài tập Writing Task 2</div>
                  <div className={styles.historyDate}>Hôm qua, 20:45</div>
                </div>
                <div className={styles.historyItem}>
                  <div>Đạt 7.5 trong bài kiểm tra thử IELTS</div>
                  <div className={styles.historyDate}>2 ngày trước</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </>
  );
};

export default Infor;