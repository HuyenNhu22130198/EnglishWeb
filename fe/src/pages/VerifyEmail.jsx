import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/authService';
import styles from './Auth.module.css';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const requested = useRef(false);
  const [status, setStatus] = useState(token ? 'loading' : 'error');
  const [message, setMessage] = useState(
    token ? 'Đang xác thực email...' : 'Link xác thực email không hợp lệ.',
  );

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;

    authAPI.verifyEmail(token)
      .then((response) => {
        setStatus('success');
        setMessage(response.message || 'Xác thực email thành công!');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Không thể xác thực email.');
      });
  }, [token]);

  return (
    <div className={styles.authPage}>
      <div className={`${styles.authContainer} ${styles.forgotContainer}`}>
        <div className={`${styles.authCard} ${styles.forgotCard}`}>
          <div className={styles.logo}>
            <div className={styles.logoCircle}>N</div>
            <h2>StudyEnglishWithNhu</h2>
          </div>

          <div className={styles.authHeading}>
            <h1 className={styles.title}>Xác thực email</h1>
          </div>

          <div className={status === 'success' ? styles.successMessage : undefined}>
            {status === 'success' && <div className={styles.successIcon}>✓</div>}
            <div className={`${styles.authMessage} ${status === 'error' ? styles.errorMessage : styles.successAlert}`}>
              {message}
            </div>
          </div>

          {status !== 'loading' && (
            <Link to="/login" className={styles.primaryButton}>Đến trang đăng nhập</Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
