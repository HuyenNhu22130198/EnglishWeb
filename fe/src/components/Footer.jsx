import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div>
          <div className={styles.logoFooter}>
            <div className={styles.logoCircleFooter}>N</div>
            <div className={styles.footerTitle}>StudyEnglishWithNhu</div>
          </div>
          <p>Học tiếng Anh một cách thông minh, hiệu quả và thực tế nhất.</p>
        </div>

        <div className={styles.footerColumn}>
          <h4>Luyện tập</h4>
          <ul className={styles.footerLinks}>
            <li><Link to="/exams/toeic">Kho đề TOEIC</Link></li>
            <li><Link to="/exams/ielts">Kho đề IELTS</Link></li>
            <li><Link to="/flashcard">Flashcard</Link></li>
            <li><Link to="/forum">Diễn đàn</Link></li>
          </ul>
        </div>

        <div className={styles.footerColumn}>
          <h4>Hỗ trợ</h4>
          <ul className={styles.footerLinks}>
            <li><Link to="/">Trang chủ</Link></li>
            <li><Link to="/guide">Hướng dẫn sử dụng</Link></li>
            <li><Link to="/contact">Liên hệ</Link></li>
          </ul>
        </div>

        <div className={styles.footerColumn}>
          <h4>Liên hệ</h4>
          <ul className={styles.footerLinks}>
            <li>
              Email:{' '}
              <a href="mailto:contact@studyenglishwithnhu.edu.vn">
                contact@studyenglishwithnhu.edu.vn
              </a>
            </li>
            <li>Hotline: 0123 456 789</li>
          </ul>
          <div className={styles.socialLinks} aria-label="Liên kết mạng xã hội">
            <a href="#" aria-label="Facebook">
              <span aria-hidden="true">●</span> Facebook
            </a>
            <a href="#" aria-label="YouTube">
              <span aria-hidden="true">▶</span> YouTube
            </a>
          </div>
        </div>
      </div>

      <div className={styles.copyright}>
        © 2026 StudyEnglishWithNhu · Đồ án tốt nghiệp. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
