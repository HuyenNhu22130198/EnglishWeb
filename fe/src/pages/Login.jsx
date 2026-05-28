import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import styles from './Auth.module.css';

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M3 3l18 18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.88 5.18A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a17.7 17.7 0 0 1-2.62 3.55"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.61 6.61C3.67 8.6 2 12 2 12s3.5 7 10 7a9.5 9.5 0 0 0 4.39-1.08"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Login = () => {
  const navigate = useNavigate();
  const { login: loginContext } = useAuth();

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!emailOrUsername || !password) {
        setError('Vui lòng nhập đầy đủ email/username và mật khẩu');
        return;
      }

      const response = await authAPI.login(emailOrUsername, password);

      if (response.success) {
        setSuccess(response.message || 'Đăng nhập thành công!');

        if (response.data) {
          loginContext(response.data);
        }

        if (remember) {
          localStorage.setItem('rememberMe', emailOrUsername);
        } else {
          localStorage.removeItem('rememberMe');
        }

        setTimeout(() => {
          navigate('/');
        }, 900);
      } else {
        setError(response.message || 'Đăng nhập thất bại');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi kết nối đến server');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={`${styles.authContainer} ${styles.loginContainer}`}>
        <div className={`${styles.authCard} ${styles.loginCard}`}>
          <div className={styles.logo}>
            <div className={styles.logoCircle}>N</div>
            <h2>StudyEnglishWithNhu</h2>
          </div>

          <div className={styles.authHeading}>
            <h1 className={styles.title}>Đăng nhập</h1>
            <p className={styles.subtitle}>
              Tiếp tục hành trình luyện TOEIC/IELTS cùng Như
            </p>
          </div>

          {error && (
            <div className={`${styles.authMessage} ${styles.errorMessage}`}>
              ❌ {error}
            </div>
          )}

          {success && (
            <div className={`${styles.authMessage} ${styles.successAlert}`}>
              ✅ {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>Email hoặc Username</label>
              <input
                type="text"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="Nhập email hoặc username"
                required
                disabled={loading}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Mật khẩu</label>

              <div className={styles.passwordInputWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                  disabled={loading}
                />

                <button
                  type="button"
                  className={styles.togglePasswordButton}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className={styles.options}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={loading}
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>

              <Link to="/forgot-password" className={styles.forgotLink}>
                Quên mật khẩu?
              </Link>
            </div>

            <button type="submit" className={styles.primaryButton} disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <p className={styles.switchText}>
            Chưa có tài khoản?{' '}
            <Link to="/register" className={styles.switchLink}>
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;