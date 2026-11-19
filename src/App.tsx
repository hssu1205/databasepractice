import { useState, useRef, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, isFirebaseConfigured, checkIsTeacher } from './firebase';
import { Header } from './components/Header';
import { StudentNameInput } from './components/StudentNameInput';
import { EmotionSelector } from './components/EmotionSelector';
import { DrawingCanvas } from './components/DrawingCanvas';
import type { DrawingCanvasHandle } from './components/DrawingCanvas';
import { SubmissionSuccess } from './components/SubmissionSuccess';
import { ConfigNotice } from './components/ConfigNotice';
import { GoogleLoginCard } from './components/GoogleLoginCard';
import { RoleSelectScreen } from './components/RoleSelectScreen';
import { TeacherDashboard } from './components/TeacherDashboard';
import { saveEmotionRecord } from './services/emotionService';
import { EMOTION_OPTIONS } from './types/emotion';
import type { EmotionType, EmotionOption } from './types/emotion';
import './App.css';

type AppViewMode = 'role-select' | 'student' | 'teacher-dashboard';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isTeacher, setIsTeacher] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<AppViewMode>('role-select');

  // 학생 모드 입력 상태 (기존 코드 그대로 유지)
  const [studentName, setStudentName] = useState<string>('');
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    studentName: string;
    emotion: EmotionOption;
    imageUrl: string;
  } | null>(null);

  const canvasRef = useRef<DrawingCanvasHandle | null>(null);
  const isConfigured = isFirebaseConfigured();

  // Firebase Auth 인증 상태 및 교사 UID 판단
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        const teacherStatus = checkIsTeacher(user.uid);
        setIsTeacher(teacherStatus);
      } else {
        setIsTeacher(false);
        setViewMode('role-select');
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const selectedEmotionOption = EMOTION_OPTIONS.find(
    (item) => item.id === selectedEmotion
  );

  // 로그아웃 핸들러
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setViewMode('role-select');
    } catch (err) {
      console.error('로그아웃 에러:', err);
    }
  };

  // 학생 화면에서 제출 로직 (기존 로직 100% 유지)
  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!studentName.trim()) {
      setErrorMessage('✏️ 이름을 먼저 입력해주세요!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!selectedEmotion || !selectedEmotionOption) {
      setErrorMessage('🌈 지금 느끼는 감정을 하나 선택해주세요!');
      return;
    }

    if (!canvasRef.current || !canvasRef.current.hasDrawn()) {
      const confirmProceed = window.confirm(
        '도화지에 아직 그림이 그려지지 않았어요! 그래도 제출할까요?'
      );
      if (!confirmProceed) return;
    }

    if (!isConfigured) {
      setErrorMessage(
        '⚠️ Firebase 설정(.env.local)이 완료되지 않았습니다. 관리자 안내를 확인해주세요.'
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const imageBlob = await canvasRef.current?.getJpgBlob();
      if (!imageBlob) {
        throw new Error('그림 이미지를 생성하지 못했습니다. 다시 시도해주세요.');
      }

      const result = await saveEmotionRecord({
        studentName: studentName.trim(),
        emotion: selectedEmotion,
        emotionLabel: selectedEmotionOption.label,
        emotionEmoji: selectedEmotionOption.emoji,
        imageBlob
      });

      setSubmittedData({
        studentName: studentName.trim(),
        emotion: selectedEmotionOption,
        imageUrl: result.imageUrl
      });
    } catch (error: any) {
      console.error('제출 중 오류 발생:', error);
      setErrorMessage(
        `저장 중 문제가 생겼어요: ${error?.message || '네트워크 상태를 확인해주세요.'}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStudentName('');
    setSelectedEmotion(null);
    setSubmittedData(null);
    setErrorMessage(null);
    canvasRef.current?.clear();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`app-container ${viewMode === 'teacher-dashboard' ? 'dashboard-mode' : ''}`}>
      {/* 장식용 파스텔 구름 & 배경 요소 */}
      <div className="bg-decor cloud-1" aria-hidden="true">☁️</div>
      <div className="bg-decor cloud-2" aria-hidden="true">☁️</div>
      <div className="bg-decor star-1" aria-hidden="true">✨</div>
      <div className="bg-decor star-2" aria-hidden="true">⭐</div>

      {isAuthLoading ? (
        <div className="auth-loading-card">
          <span className="spinner" />
          <p>사용자 정보를 확인하는 중입니다...</p>
        </div>
      ) : !currentUser ? (
        /* 1. 처음 접속 시: Google 로그인 화면 */
        <main className="main-card">
          {!isConfigured && <ConfigNotice />}
          <GoogleLoginCard />
        </main>
      ) : viewMode === 'teacher-dashboard' ? (
        /* 2. 교사 모드 대시보드 (기존 교사 모니터링 화면 유지) */
        <TeacherDashboard onBackToHome={() => setViewMode('role-select')} />
      ) : viewMode === 'student' ? (
        /* 3. 학생 화면 (기존 학생 제출 화면 유지) */
        <main className="main-card">
          {/* 상단 모드선택/홈으로 돌아가기 바 */}
          <div className="student-top-nav">
            <button
              type="button"
              className="back-to-roles-btn"
              onClick={() => setViewMode('role-select')}
            >
              ← 모드 선택으로
            </button>
            <div className="student-nav-right">
              <span className="current-mode-tag">🎒 학생 모드</span>
              <button
                type="button"
                className="nav-logout-mini"
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </div>
          </div>

          <Header />

          {!isConfigured && <ConfigNotice />}

          {submittedData ? (
            <SubmissionSuccess
              studentName={submittedData.studentName}
              emotion={submittedData.emotion}
              imageUrl={submittedData.imageUrl}
              onReset={handleReset}
            />
          ) : (
            <div className="form-content">
              {/* 1단계: 이름 입력 */}
              <StudentNameInput name={studentName} onChange={setStudentName} />

              {/* 2단계: 감정 선택 */}
              <EmotionSelector
                selectedEmotion={selectedEmotion}
                onSelect={setSelectedEmotion}
              />

              {/* 3단계: 그림 그리기 */}
              <DrawingCanvas
                ref={canvasRef}
                emotionPrompt={
                  selectedEmotionOption
                    ? `"${selectedEmotionOption.label} (${selectedEmotionOption.emoji})" 마음이 드는 이유나 떠오르는 장면을 도화지에 그려봐요!`
                    : undefined
                }
              />

              {/* 에러 메시지 안내 */}
              {errorMessage && (
                <div className="error-alert">
                  <span className="error-icon">💡</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 제출 버튼 */}
              <div className="submit-section">
                <button
                  type="button"
                  className={`submit-button ${isSubmitting ? 'loading' : ''}`}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner" />
                      <span>선생님께 마음을 전송하는 중... 🚀</span>
                    </>
                  ) : (
                    <>
                      <span>선생님께 마음 보내기</span>
                      <span className="button-emoji">💌</span>
                    </>
                  )}
                </button>
                <p className="submit-hint">
                  소중한 내 마음이 선생님의 정서 모니터링 게시판에 안전하게 전달돼요!
                </p>
              </div>
            </div>
          )}
        </main>
      ) : (
        /* 4. 로그인 완료 후: 입장 버튼 선택 화면 */
        <main className="main-card role-card-wrapper">
          {!isConfigured && <ConfigNotice />}
          <RoleSelectScreen
            isTeacher={isTeacher}
            userName={currentUser.displayName}
            userEmail={currentUser.email}
            userPhoto={currentUser.photoURL}
            onSelectStudent={() => setViewMode('student')}
            onSelectTeacher={() => setViewMode('teacher-dashboard')}
            onLogout={handleLogout}
          />
        </main>
      )}

      <footer className="app-footer">
        <p>따뜻한 학교 생활을 응원합니다 🏫</p>
      </footer>
    </div>
  );
}

export default App;
