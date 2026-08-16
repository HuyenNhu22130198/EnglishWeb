import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import SocialLoginButtons from '../components/SocialLoginButtons';
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
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resending, setResending] = useState(false);

  const showLoginError = (message) => {
    const isUnverified = message.includes('EMAIL_NOT_VERIFIED');
    setNeedsVerification(isUnverified);
    setVerificationEmail(emailOrUsername.includes('@') ? emailOrUsername.trim() : '');
    setError(message.replace(/^EMAIL_NOT_VERIFIED:\s*/, ''));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (!emailOrUsername.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ email/username và mật khẩu');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login(emailOrUsername, password);

      if (!response.success) {
        showLoginError(response.message || 'Đăng nhập thất bại');
        return;
      }

      const loginData = response.data;

      if (!loginData?.token) {
        setError('Đăng nhập thất bại: server không trả về token.');
        return;
      }

      setSuccess(response.message || 'Đăng nhập thành công!');

      loginContext(loginData);

      if (remember) {
        localStorage.setItem('rememberMe', emailOrUsername);
      } else {
        localStorage.removeItem('rememberMe');
      }

      const role = String(loginData.role || '').toUpperCase();

      setTimeout(() => {
        if (role === 'ADMIN') {
          navigate('/admin/dictionary');
        } else {
          navigate('/');
        }
      }, 700);
    } catch (err) {
      showLoginError(err.response?.data?.message || 'Lỗi kết nối đến server');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verificationEmail.trim()) {
      setError('Vui lòng nhập email tài khoản để gửi lại liên kết xác thực.');
      return;
    }

    setResending(true);
    setSuccess('');
    try {
      const response = await authAPI.resendVerification(verificationEmail.trim());
      setSuccess(response.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi lại email xác thực.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={`${styles.authContainer} ${styles.loginContainer}`}>
        <div className={`${styles.authCard} ${styles.loginCard}`}>
          <div className={styles.logo}>
            <div className={styles.logoCircle}>
              <svg viewBox="0 0 640 512" fill="currentColor" aria-hidden="true">
                <path d="M320 32c-8.1 0-16.1 1.4-23.7 4.1L15.8 137.4C6.3 140.9 0 149.9 0 160s6.3 19.1 15.8 22.6l57.9 20.9C57.3 229.3 48 259.8 48 291.9l0 28.1c0 28.4-10.8 57.7-22.3 80.8c-6.5 13-13.9 25.8-22.5 37.6C0 442.7-.9 448.3 .9 453.4s6 8.9 11.2 10.2l64 16c4.2 1.1 8.7 .3 12.4-2s6.3-6.1 7.1-10.4c8.6-42.8 4.3-81.2-2.1-108.7C90.3 344.3 86 329.8 80 316.5l0-24.6c0-30.2 10.2-58.7 27.9-81.5c12.9-15.5 29.6-28 49.2-35.7l157-61.7c8.2-3.2 17.5 .8 20.7 9s-.8 17.5-9 20.7l-157 61.7c-12.4 4.9-23.3 12.4-32.2 21.6l159.6 57.6c7.6 2.7 15.6 4.1 23.7 4.1s16.1-1.4 23.7-4.1L624.2 182.6c9.5-3.4 15.8-12.5 15.8-22.6s-6.3-19.1-15.8-22.6L343.7 36.1C336.1 33.4 328.1 32 320 32zM128 408c0 35.3 86 72 192 72s192-36.7 192-72L496.7 262.6 354.5 314c-11.1 4-22.8 6-34.5 6s-23.5-2-34.5-6L143.3 262.6 128 408z" />
              </svg>
            </div>
            <h2>EngWise</h2>
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

          {needsVerification && (
            <div className={styles.resendBox}>
              <input
                type="email"
                value={verificationEmail}
                onChange={(e) => setVerificationEmail(e.target.value)}
                placeholder="Email tài khoản"
                aria-label="Email nhận lại liên kết xác thực"
              />
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleResendVerification}
                disabled={resending}
              >
                {resending ? 'Đang gửi...' : 'Gửi lại email xác thực'}
              </button>
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

          <SocialLoginButtons
            onError={(message) => {
              setNeedsVerification(false);
              setError(message);
            }}
            onSuccess={setSuccess}
          />

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
