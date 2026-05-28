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

        <div className={styles.footerLinks}>
          <h4>Khóa học</h4>
          <ul>
            <li>English Communication</li>
            <li>IELTS Intensive</li>
            <li>TOEIC Mastery</li>
            <li>Business English</li>
          </ul>
        </div>

        <div className={styles.footerLinks}>
          <h4>Thông tin</h4>
          <ul>
            <li>Về Cô Nhữ</li>
            <li>Đội ngũ giảng viên</li>
            <li>Tuyển dụng</li>
            <li>Liên hệ</li>
          </ul>
        </div>

        <div>
          <h4>Liên hệ</h4>
          <p>contact@studyenglishwithnhu.edu.vn</p>
          <p>Hotline: 0123 456 789</p>
        </div>
      </div>

      <div className={styles.copyright}>
        © 2026 StudyEnglishWithNhu. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;