import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/authService';
import styles from './Auth.module.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(token ? '' : 'Link đặt lại mật khẩu không hợp lệ.');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.resetPassword(token, password, confirmPassword);
      setSuccess(response.message || 'Đặt lại mật khẩu thành công!');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={`${styles.authContainer} ${styles.forgotContainer}`}>
        <div className={`${styles.authCard} ${styles.forgotCard}`}>
          <div className={styles.logo}>
            <div className={styles.logoCircle}>N</div>
            <h2>StudyEnglishWithNhu</h2>
          </div>

          <div className={styles.authHeading}>
            <h1 className={styles.title}>Đặt lại mật khẩu</h1>
            <p className={styles.subtitle}>Tạo mật khẩu mới có ít nhất 6 ký tự.</p>
          </div>

          {error && <div className={`${styles.authMessage} ${styles.errorMessage}`}>❌ {error}</div>}
          {success && <div className={`${styles.authMessage} ${styles.successAlert}`}>✅ {success}</div>}

          {!success && (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="new-password">Mật khẩu mới</label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength="6"
                  disabled={loading || !token}
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="confirm-password">Xác nhận mật khẩu</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength="6"
                  disabled={loading || !token}
                />
              </div>
              <button type="submit" className={styles.primaryButton} disabled={loading || !token}>
                {loading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
              </button>
            </form>
          )}

          <p className={styles.switchText}>
            <Link to="/login" className={styles.switchLink}>Quay về đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
