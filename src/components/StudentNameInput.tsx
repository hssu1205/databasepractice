import React from 'react';

interface StudentNameInputProps {
  name: string;
  onChange: (name: string) => void;
}

export const StudentNameInput: React.FC<StudentNameInputProps> = ({
  name,
  onChange
}) => {
  return (
    <div className="name-section">
      <div className="section-title-wrap">
        <span className="step-tag">1단계</span>
        <h2 className="section-title">내 이름을 알려주세요 🎒</h2>
      </div>
      <p className="section-desc">선생님이 알아볼 수 있도록 이름을 적어주세요.</p>

      <div className="name-input-wrapper">
        <span className="name-input-icon">✏️</span>
        <input
          type="text"
          className="name-input"
          placeholder="예: 김하늘 (또는 3반 이바다)"
          value={name}
          maxLength={20}
          onChange={(e) => onChange(e.target.value)}
        />
        {name.trim().length > 0 && (
          <span className="name-input-check">멋진 이름이에요! 👍</span>
        )}
      </div>
    </div>
  );
};
