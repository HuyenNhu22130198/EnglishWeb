import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/authService';
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

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (
        !formData.fullName ||
        !formData.email ||
        !formData.username ||
        !formData.password ||
        !formData.confirmPassword
      ) {
        setError('Vui lòng điền đầy đủ thông tin');
        return;
      }

      if (formData.username.length < 3) {
        setError('Username phải có ít nhất 3 ký tự');
        return;
      }

      if (formData.password.length < 6) {
        setError('Mật khẩu phải có ít nhất 6 ký tự');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Mật khẩu không khớp');
        return;
      }

      const response = await authAPI.register(formData);

      if (response.success) {
        setSuccess(response.message);

        setFormData({
          fullName: '',
          email: '',
          username: '',
          password: '',
          confirmPassword: '',
        });

        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(response.message || 'Đăng ký thất bại');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi kết nối đến server');
      console.error('Register error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={`${styles.authContainer} ${styles.registerContainer}`}>
        <div className={`${styles.authCard} ${styles.registerCard}`}>
          <div className={styles.logo}>
            <div className={styles.logoCircle}>N</div>
            <h2>StudyEnglishWithNhu</h2>
          </div>

          <div className={styles.authHeading}>
            <h1 className={styles.title}>Tạo tài khoản mới</h1>
            <p className={styles.subtitle}>
              Bắt đầu hành trình luyện TOEIC/IELTS cùng Như
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

          <form onSubmit={handleSubmit} className={`${styles.form} ${styles.registerFormGrid}`}>
            <div className={styles.inputGroup}>
              <label>Họ và tên</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Nhập họ và tên"
                required
                disabled={loading}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Nhập email"
                required
                disabled={loading}
              />
            </div>

            <div className={`${styles.inputGroup} ${styles.spanTwo}`}>
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Nhập username"
                required
                disabled={loading}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Mật khẩu</label>

              <div className={styles.passwordInputWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Tối thiểu 6 ký tự"
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

            <div className={styles.inputGroup}>
              <label>Xác nhận mật khẩu</label>

              <div className={styles.passwordInputWrapper}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Nhập lại mật khẩu"
                  required
                  disabled={loading}
                />

                <button
                  type="button"
                  className={styles.togglePasswordButton}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                  aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className={`${styles.submitRow} ${styles.spanTwo}`}>
              <button type="submit" className={styles.primaryButton} disabled={loading}>
                {loading ? 'Đang đăng ký...' : 'Đăng ký'}
              </button>
            </div>
          </form>

          <p className={styles.switchText}>
            Đã có tài khoản?{' '}
            <Link to="/login" className={styles.switchLink}>
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;