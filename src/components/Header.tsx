import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="app-header">
      <div className="header-badge">
        <span>🌱</span> 마음 돌봄 교실
      </div>
      <h1 className="header-title">
        오늘 내 마음의 날씨는 어떤가요? 🌤️
      </h1>
      <p className="header-subtitle">
        반가워요! 오늘 하루 동안 느낀 마음을 솔직하게 표현해봐요.
      </p>
    </header>
  );
};
