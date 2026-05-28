import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Auth.module.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('email');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email) return;

    setLoading(true);

    // Hiện tại BE của mình chưa có API forgot password,
    // nên phần này mới giả lập gửi email.
    setTimeout(() => {
      setStep('success');
      setLoading(false);
    }, 700);
  };

  return (
    <div className={styles.authPage}>
      <div className={`${styles.authContainer} ${styles.forgotContainer}`}>
        <div className={`${styles.authCard} ${styles.forgotCard}`}>
          <div className={styles.logo}>
            <div className={styles.logoCircle}>N</div>
            <h2>StudyEnglishWithNhu</h2>
          </div>

          {step === 'email' ? (
            <>
              <div className={styles.authHeading}>
                <h1 className={styles.title}>Quên mật khẩu?</h1>
                <p className={styles.subtitle}>
                  Nhập email đã đăng ký để nhận hướng dẫn đặt lại mật khẩu.
                </p>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Nhập email của bạn"
                    required
                    disabled={loading}
                  />
                </div>

                <button type="submit" className={styles.primaryButton} disabled={loading}>
                  {loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
                </button>
              </form>
            </>
          ) : (
            <div className={styles.successMessage}>
              <div className={styles.successIcon}>✓</div>

              <h2>Đã gửi email!</h2>

              <p>
                Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến{' '}
                <strong>{email}</strong>.
              </p>

              <p className={styles.smallNote}>
                Vui lòng kiểm tra hộp thư đến hoặc mục thư rác.
              </p>

              <Link to="/login" className={styles.primaryButton}>
                Quay về trang đăng nhập
              </Link>
            </div>
          )}

          <p className={styles.switchText}>
            Nhớ mật khẩu?{' '}
            <Link to="/login" className={styles.switchLink}>
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;