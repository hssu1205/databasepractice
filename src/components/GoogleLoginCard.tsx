import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

interface GoogleLoginCardProps {
  onLoginSuccess?: () => void;
}

export const GoogleLoginCard: React.FC<GoogleLoginCardProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await signInWithPopup(auth, googleProvider);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error('Google 로그인 오류:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('로그인 창이 닫혔습니다. 다시 시도해주세요.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMessage('브라우저에서 팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');
      } else {
        setErrorMessage(
          'Google 로그인 중 오류가 발생했습니다: ' + (err.message || '네트워크를 확인해주세요.')
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="google-login-card">
      <div className="login-badge">🌱 마음 돌봄 교실</div>
      <h1 className="google-login-title">환영합니다!</h1>
      <p className="google-login-subtitle">
        감정 모니터링 활동을 시작하려면 Google 계정으로 로그인해주세요.
      </p>

      {errorMessage && (
        <div className="login-error-alert">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="google-btn-wrapper">
        <button
          type="button"
          className={`google-signin-btn ${isLoading ? 'loading' : ''}`}
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner-small" />
              <span>Google 로그인 진행 중...</span>
            </>
          ) : (
            <>
              <svg className="google-icon" viewBox="0 0 24 24" width="22" height="22">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google 계정으로 로그인</span>
            </>
          )}
        </button>
      </div>

      <p className="login-footer-hint">
        💡 교사 및 학생 모두 Google 계정으로 간편하게 시작할 수 있습니다.
      </p>
    </div>
  );
};
