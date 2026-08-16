import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div>
          <div className={styles.logoFooter}>
            <div className={styles.logoCircleFooter}>
              <svg viewBox="0 0 640 512" fill="currentColor" aria-hidden="true">
                <path d="M320 32c-8.1 0-16.1 1.4-23.7 4.1L15.8 137.4C6.3 140.9 0 149.9 0 160s6.3 19.1 15.8 22.6l57.9 20.9C57.3 229.3 48 259.8 48 291.9l0 28.1c0 28.4-10.8 57.7-22.3 80.8c-6.5 13-13.9 25.8-22.5 37.6C0 442.7-.9 448.3 .9 453.4s6 8.9 11.2 10.2l64 16c4.2 1.1 8.7 .3 12.4-2s6.3-6.1 7.1-10.4c8.6-42.8 4.3-81.2-2.1-108.7C90.3 344.3 86 329.8 80 316.5l0-24.6c0-30.2 10.2-58.7 27.9-81.5c12.9-15.5 29.6-28 49.2-35.7l157-61.7c8.2-3.2 17.5 .8 20.7 9s-.8 17.5-9 20.7l-157 61.7c-12.4 4.9-23.3 12.4-32.2 21.6l159.6 57.6c7.6 2.7 15.6 4.1 23.7 4.1s16.1-1.4 23.7-4.1L624.2 182.6c9.5-3.4 15.8-12.5 15.8-22.6s-6.3-19.1-15.8-22.6L343.7 36.1C336.1 33.4 328.1 32 320 32zM128 408c0 35.3 86 72 192 72s192-36.7 192-72L496.7 262.6 354.5 314c-11.1 4-22.8 6-34.5 6s-23.5-2-34.5-6L143.3 262.6 128 408z" />
              </svg>
            </div>
            <div className={styles.footerTitle}>EngWise</div>
          </div>
          <p>Ôn thi TOEIC, IELTS thông minh với chatbot hỗ trợ giải đáp 24/7.</p>
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
              <a href="mailto:contact@engwise.id.vn">
                contact@engwise.id.vn
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
        © 2026 EngWise · Đồ án tốt nghiệp. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
