import React, { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { subscribeToEmotionRecords } from '../services/emotionService';
import { EmotionChart } from './EmotionChart';
import { DrawingGallery } from './DrawingGallery';
import type { EmotionRecord, EmotionType } from '../types/emotion';

interface TeacherDashboardProps {
  onBackToHome: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onBackToHome }) => {
  const [records, setRecords] = useState<EmotionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<EmotionType | 'all'>('all');
  const [syncError, setSyncError] = useState<string | null>(null);

  const teacherEmail = auth.currentUser?.email || '선생님';

  // Firestore 실시간 데이터 구독
  useEffect(() => {
    const unsubscribe = subscribeToEmotionRecords(
      (data) => {
        setRecords(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('Firestore 구독 오류:', err);
        setSyncError('데이터를 실시간으로 불러오는 중 문제가 발생했습니다: ' + err.message);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onBackToHome();
    } catch (err) {
      console.error('로그아웃 실패:', err);
    }
  };

  return (
    <div className="teacher-dashboard-container">
      {/* 교사 대시보드 상단 네비게이션 */}
      <header className="dashboard-nav">
        <div className="nav-left">
          <div className="nav-title-group">
            <span className="nav-logo">🏫</span>
            <div>
              <h1 className="nav-title">학급 정서 모니터링 교사 대시보드</h1>
              <div className="nav-status-row">
                <span className="live-dot" />
                <span className="live-text">실시간 연동 중</span>
                <span className="nav-divider">·</span>
                <span className="teacher-user-pill">👩‍🏫 {teacherEmail}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="nav-actions">
          <button
            type="button"
            className="nav-btn secondary-btn"
            onClick={onBackToHome}
          >
            🎒 학생 화면 보기
          </button>
          <button
            type="button"
            className="nav-btn logout-btn"
            onClick={handleLogout}
          >
            로그아웃 🚪
          </button>
        </div>
      </header>

      {syncError && (
        <div className="sync-error-banner">
          <span>⚠️ {syncError}</span>
        </div>
      )}

      {isLoading ? (
        <div className="dashboard-loading-state">
          <span className="spinner" />
          <p>학생들의 정서 데이터를 안전하게 불러오는 중입니다...</p>
        </div>
      ) : (
        /* 좌우 2분할 메인 그리드 */
        <div className="dashboard-grid">
          {/* 왼쪽: 막대그래프 통계 */}
          <section className="dashboard-col left-col">
            <EmotionChart
              records={records}
              selectedFilter={selectedFilter}
              onFilterChange={setSelectedFilter}
            />
          </section>

          {/* 오른쪽: 그림 갤러리 */}
          <section className="dashboard-col right-col">
            <DrawingGallery
              records={records}
              selectedFilter={selectedFilter}
              onFilterChange={setSelectedFilter}
            />
          </section>
        </div>
      )}
    </div>
  );
};
