import React from 'react';
import type { EmotionOption } from '../types/emotion';

interface SubmissionSuccessProps {
  studentName: string;
  emotion: EmotionOption;
  imageUrl: string;
  onReset: () => void;
}

export const SubmissionSuccess: React.FC<SubmissionSuccessProps> = ({
  studentName,
  emotion,
  imageUrl,
  onReset
}) => {
  return (
    <div className="success-card">
      <div className="success-confetti">🎉 💖 🌟 🎈 🌈</div>

      <div className="success-icon-wrap">
        <span className="success-icon">{emotion.emoji}</span>
      </div>

      <h2 className="success-title">
        {studentName} 학생의 소중한 마음이 전송되었어요!
      </h2>

      <p className="success-subtitle">
        선생님께 마음이 잘 도착했어요. 오늘 하루도 정말 수고 많았어요!
      </p>

      {/* 방금 그린 그림 & 감정 카드 미리보기 */}
      <div className="summary-box" style={{ borderColor: emotion.borderColor }}>
        <div className="summary-header" style={{ backgroundColor: emotion.pastelBg }}>
          <span className="summary-tag">내가 고른 마음</span>
          <span className="summary-emotion" style={{ color: emotion.textColor }}>
            {emotion.emoji} {emotion.label}
          </span>
        </div>

        {imageUrl && (
          <div className="summary-drawing">
            <p className="drawing-caption">내가 그린 그림 🎨</p>
            <div className="summary-img-wrap">
              <img src={imageUrl} alt="내가 그린 마음 그림" className="summary-img" />
            </div>
          </div>
        )}
      </div>

      <div className="success-actions">
        <button type="button" className="reset-btn" onClick={onReset}>
          ✨ 다시 작성하기
        </button>
      </div>
    </div>
  );
};
