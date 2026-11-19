import { useState, useRef } from 'react';
import { Header } from './components/Header';
import { StudentNameInput } from './components/StudentNameInput';
import { EmotionSelector } from './components/EmotionSelector';
import { DrawingCanvas } from './components/DrawingCanvas';
import type { DrawingCanvasHandle } from './components/DrawingCanvas';
import { SubmissionSuccess } from './components/SubmissionSuccess';
import { ConfigNotice } from './components/ConfigNotice';
import { isFirebaseConfigured } from './firebase';
import { saveEmotionRecord } from './services/emotionService';
import { EMOTION_OPTIONS } from './types/emotion';
import type { EmotionType, EmotionOption } from './types/emotion';
import './App.css';

export function App() {
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

  const selectedEmotionOption = EMOTION_OPTIONS.find(
    (item) => item.id === selectedEmotion
  );

  const handleSubmit = async () => {
    setErrorMessage(null);

    // 1. 유효성 검사
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

      // 2. 캔버스로부터 JPG Blob 추출
      const imageBlob = await canvasRef.current?.getJpgBlob();
      if (!imageBlob) {
        throw new Error('그림 이미지를 생성하지 못했습니다. 다시 시도해주세요.');
      }

      // 3. Storage에 JPG 업로드 & Firestore에 데이터 저장
      const result = await saveEmotionRecord({
        studentName: studentName.trim(),
        emotion: selectedEmotion,
        emotionLabel: selectedEmotionOption.label,
        emotionEmoji: selectedEmotionOption.emoji,
        imageBlob
      });

      // 4. 완료 상태로 전환
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
    <div className="app-container">
      {/* 장식용 파스텔 구름 & 배경 요소 */}
      <div className="bg-decor cloud-1" aria-hidden="true">☁️</div>
      <div className="bg-decor cloud-2" aria-hidden="true">☁️</div>
      <div className="bg-decor star-1" aria-hidden="true">✨</div>
      <div className="bg-decor star-2" aria-hidden="true">⭐</div>

      <main className="main-card">
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

      <footer className="app-footer">
        <p>따뜻한 학교 생활을 응원합니다 🏫</p>
      </footer>
    </div>
  );
}

export default App;
