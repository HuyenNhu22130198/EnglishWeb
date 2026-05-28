import styles from './CourseCard.module.css';

const CourseCard = ({ title, level, duration, isHot = false }) => {
  return (
    <div className={`${styles.courseCard} ${isHot ? styles.hotCard : ''}`}>
      <div className={`${styles.imageContainer} ${isHot ? styles.hotImage : styles.imagePlaceholder}`}>
        {isHot && <div style={{position: 'absolute', top: '20px', right: '20px', background: '#fff', color: '#904d00', padding: '4px 12px', borderRadius: '9999px', fontSize: '14px', fontWeight: '700'}}>HOT</div>}
      </div>
      
      <div className={styles.cardContent}>
        <div className={styles.level}>{level}</div>
        <h3 className={styles.title}>{title}</h3>
        
        <div className={styles.infoRow}>
          <div className={styles.rating}>4.9</div>
          <div className={styles.duration}>{duration}</div>
        </div>

        <button className={`${styles.btn} ${isHot ? styles.btnHot : styles.btnPrimary}`}>
          {isHot ? 'Đăng ký khóa HOT' : 'Đăng ký ngay'}
        </button>
      </div>
    </div>
  );
};

export default CourseCard;