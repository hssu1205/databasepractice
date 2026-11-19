import React from 'react';

export const ConfigNotice: React.FC = () => {
  return (
    <div className="config-banner">
      <div className="banner-icon">⚠️</div>
      <div className="banner-content">
        <strong>Firebase 환경 설정(.env.local)이 필요해요!</strong>
        <p>
          프로젝트 루트 디렉토리에 <code>.env.local</code> 파일을 생성하고 Firebase 콘솔의
          설정값을 입력해주세요.
        </p>
      </div>
    </div>
  );
};
