import styles from './Hero.module.css';

const Hero = () => {
  return (
    <section id="home" className={styles.hero}>
      <div className={styles.heroContent}>
        <div>
          <div className={styles.badge}>Phương pháp học tiếng Anh hiệu quả nhất</div>
          
          <h1 className={styles.title}>
            Nâng tầm tiếng Anh<br />
            <span className="text-primary">cùng Huyền Như</span>
          </h1>

          <p className={styles.subtitle}>
           Học linh hoạt, thực chiến, kết quả rõ rệt chỉ sau 3 tháng.
          </p>

          <div className={styles.ctaButtons}>
            <button className={styles.btnPrimary}>Bắt đầu luyện đề miễn phí</button>
            <button className={styles.btnSecondary}>Tham khảo lộ trình</button>
          </div>

          <div className={styles.stats}>
            <div>
              <div style={{fontSize: '32px', fontWeight: '700', color: '#0e3377'}}>5000+</div>
              <div style={{color: '#444650'}}>Học viên tin tưởng</div>
            </div>
            <div>
              <div style={{fontSize: '32px', fontWeight: '700', color: '#0e3377'}}>4.9/5</div>
              <div style={{color: '#444650'}}>Đánh giá từ học viên</div>
            </div>
          </div>
        </div>

        <div className={styles.heroImageContainer}>
          <img 
            src="/assets/hero.png" 
            alt="Học tiếng Anh cùng Huyền Như" 
            className={styles.heroImage}
          />
          <div className={styles.floatingCard}>
            <p style={{fontWeight: '600'}}>85% học viên đạt mục tiêu chỉ sau 3 tháng</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;