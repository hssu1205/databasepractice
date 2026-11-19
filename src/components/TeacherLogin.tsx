import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

interface TeacherLoginProps {
  onSuccess: () => void;
  onBack: () => void;
}

export const TeacherLogin: React.FC<TeacherLoginProps> = ({ onSuccess, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('교사 이메일을 입력해주세요.');
      return;
    }
    if (!password) {
      setErrorMessage('비밀번호를 입력해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onSuccess();
    } catch (err: any) {
      console.error('교사 로그인 오류:', err);
      const code = err?.code;
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        setErrorMessage('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (code === 'auth/invalid-email') {
        setErrorMessage('올바른 이메일 형식이 아닙니다.');
      } else if (code === 'auth/too-many-requests') {
        setErrorMessage('로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setErrorMessage('로그인 중 문제가 발생했습니다: ' + (err?.message || '다시 시도해주세요.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="teacher-login-container">
      <div className="login-box">
        <button type="button" className="back-link-btn" onClick={onBack}>
          ← 처음 화면으로
        </button>

        <div className="login-header">
          <div className="login-icon-badge">👩‍🏫</div>
          <h2 className="login-title">선생님 로그인</h2>
          <p className="login-subtitle">
            Firebase에 등록된 교사 계정(이메일/비밀번호)으로 로그인해주세요.
          </p>
        </div>

        {errorMessage && (
          <div className="login-error-alert">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="teacher-email">교사 이메일</label>
            <input
              id="teacher-email"
              type="email"
              placeholder="teacher@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoComplete="email"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="teacher-password">비밀번호</label>
            <input
              id="teacher-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className={`login-submit-btn ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-small" />
                <span>로그인 확인 중...</span>
              </>
            ) : (
              <span>교사 모드 입장하기 ✨</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
