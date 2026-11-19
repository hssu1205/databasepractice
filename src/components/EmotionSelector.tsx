import React from 'react';
import { EMOTION_OPTIONS } from '../types/emotion';
import type { EmotionType } from '../types/emotion';

interface EmotionSelectorProps {
  selectedEmotion: EmotionType | null;
  onSelect: (emotion: EmotionType) => void;
}

export const EmotionSelector: React.FC<EmotionSelectorProps> = ({
  selectedEmotion,
  onSelect
}) => {
  return (
    <div className="emotion-section">
      <div className="section-title-wrap">
        <span className="step-tag">2단계</span>
        <h2 className="section-title">지금 내 기분은 어떤가요?</h2>
      </div>
      <p className="section-desc">가장 마음에 와닿는 감정 카드를 하나 골라보세요!</p>

      <div className="emotion-grid">
        {EMOTION_OPTIONS.map((item) => {
          const isSelected = selectedEmotion === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`emotion-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(item.id)}
              style={{
                backgroundColor: item.pastelBg,
                borderColor: isSelected ? item.textColor : item.borderColor,
                color: item.textColor
              }}
            >
              <div className="card-emoji-wrap">
                <span className="emotion-emoji">{item.emoji}</span>
              </div>
              <span className="emotion-label">{item.label}</span>
              <span className="emotion-subtext">{item.description}</span>

              {isSelected && (
                <div className="check-badge" style={{ backgroundColor: item.textColor }}>
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
