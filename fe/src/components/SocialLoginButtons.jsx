import { useEffect, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/authService';
import styles from '../pages/Auth.module.css';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const facebookAppId = import.meta.env.VITE_FACEBOOK_APP_ID;

const SocialLoginButtons = ({ onError, onSuccess }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [facebookReady, setFacebookReady] = useState(Boolean(window.FB));
  const [facebookLoading, setFacebookLoading] = useState(false);

  useEffect(() => {
    if (!facebookAppId) return undefined;

    const initializeFacebook = () => {
      window.FB.init({
        appId: facebookAppId,
        cookie: true,
        xfbml: false,
        version: 'v23.0',
      });
      setFacebookReady(true);
    };

    if (window.FB) {
      initializeFacebook();
      return undefined;
    }

    window.fbAsyncInit = initializeFacebook;
    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/vi_VN/sdk.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    return undefined;
  }, []);

  const completeLogin = (response) => {
    if (!response?.success || !response.data?.token) {
      throw new Error(response?.message || 'Đăng nhập mạng xã hội thất bại.');
    }

    login(response.data);
    onSuccess?.(response.message || 'Đăng nhập thành công!');
    const role = String(response.data.role || '').toUpperCase();
    navigate(role === 'ADMIN' ? '/admin/dictionary' : '/');
  };

  const reportError = (error) => {
    const message = error.response?.data?.message || error.message || 'Không thể đăng nhập mạng xã hội.';
    onError?.(message);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await authAPI.oauthGoogle(credentialResponse.credential);
      completeLogin(response);
    } catch (error) {
      reportError(error);
    }
  };

  const handleFacebookLogin = () => {
    if (!window.FB || !facebookReady) {
      onError?.('Facebook SDK chưa sẵn sàng. Vui lòng thử lại.');
      return;
    }

    setFacebookLoading(true);
    window.FB.login(async (sdkResponse) => {
      const credential = sdkResponse.authResponse?.accessToken;
      if (!credential) {
        setFacebookLoading(false);
        onError?.('Bạn chưa cấp quyền đăng nhập bằng Facebook.');
        return;
      }

      try {
        const response = await authAPI.oauthFacebook(credential);
        completeLogin(response);
      } catch (error) {
        reportError(error);
      } finally {
        setFacebookLoading(false);
      }
    }, { scope: 'public_profile,email' });
  };

  return (
    <div className={styles.socialLogin}>
      <div className={styles.divider}><span>Hoặc</span></div>

      {googleClientId ? (
        <div className={styles.googleButton}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => onError?.('Không thể đăng nhập bằng Google.')}
            text="continue_with"
            locale="vi"
            shape="pill"
            size="large"
            width="360"
          />
        </div>
      ) : (
        <button type="button" className={styles.googleButton} disabled>
          Tiếp tục bằng Google
        </button>
      )}

      <button
        type="button"
        className={styles.facebookButton}
        onClick={handleFacebookLogin}
        disabled={!facebookAppId || !facebookReady || facebookLoading}
      >
        {facebookLoading ? 'Đang kết nối Facebook...' : 'Tiếp tục bằng Facebook'}
      </button>
    </div>
  );
};

export default SocialLoginButtons;
