import React from 'react';

interface RoleSelectScreenProps {
  isTeacher: boolean;
  userName?: string | null;
  userEmail?: string | null;
  userPhoto?: string | null;
  onSelectStudent: () => void;
  onSelectTeacher: () => void;
  onLogout: () => void;
}

export const RoleSelectScreen: React.FC<RoleSelectScreenProps> = ({
  isTeacher,
  userName,
  userEmail,
  userPhoto,
  onSelectStudent,
  onSelectTeacher,
  onLogout
}) => {
  return (
    <div className="role-select-container">
      {/* 사용자 프로필 및 로그아웃 상단 바 */}
      <div className="user-profile-bar">
        <div className="user-profile-info">
          {userPhoto ? (
            <img src={userPhoto} alt="프로필" className="user-avatar-img" />
          ) : (
            <span className="user-avatar-placeholder">👤</span>
          )}
          <div className="user-text-info">
            <div className="user-name-row">
              <span className="user-display-name">{userName || userEmail || '사용자'}</span>
              <span className={`user-role-badge ${isTeacher ? 'teacher' : 'student'}`}>
                {isTeacher ? '👩‍🏫 선생님 계정' : '🎒 학생 계정'}
              </span>
            </div>
            {userEmail && <span className="user-email-text">{userEmail}</span>}
          </div>
        </div>

        <button
          type="button"
          className="logout-action-btn"
          onClick={onLogout}
          title="로그아웃"
        >
          로그아웃 🚪
        </button>
      </div>

      <div className="role-header">
        <h1 className="role-title">환영합니다! 모드를 선택해주세요</h1>
        <p className="role-subtitle">
          {isTeacher
            ? '선생님 계정으로 인증되었습니다. 학생 화면 또는 교사 모니터링 화면을 선택해주세요.'
            : '학생 계정으로 로그인되었습니다. 아래 버튼을 눌러 마음 표현을 시작해보세요!'}
        </p>
      </div>

      <div className={`role-cards-grid ${!isTeacher ? 'single-student-card' : ''}`}>
        {/* 학생 입장 카드: 교사와 학생 모두에게 항상 표시됨 */}
        <button
          type="button"
          className="role-card student-card"
          onClick={onSelectStudent}
        >
          <div className="role-icon-wrap student-icon-wrap">
            <span className="role-icon">🎒</span>
          </div>
          <h2 className="role-card-title">학생 입장</h2>
          <p className="role-card-desc">
            오늘 내 마음 상태를 선택하고<br />
            알록달록 그림 도화지에 마음을 표현해요!
          </p>
          <div className="role-btn-fake student-btn-fake">
            <span>그림 그리러 가기</span>
            <span className="arrow">→</span>
          </div>
        </button>

        {/* 교사 입장 카드: 교사 계정일 때만 표시됨 */}
        {isTeacher && (
          <button
            type="button"
            className="role-card teacher-card"
            onClick={onSelectTeacher}
          >
            <div className="role-icon-wrap teacher-icon-wrap">
              <span className="role-icon">👩‍🏫</span>
            </div>
            <h2 className="role-card-title">교사 입장</h2>
            <p className="role-card-desc">
              학생들의 정서 통계 막대그래프와<br />
              제출된 그림 갤러리를 실시간으로 확인해요.
            </p>
            <div className="role-btn-fake teacher-btn-fake">
              <span>교사 모니터링 열기</span>
              <span className="arrow">→</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
