import React from 'react';
import { EMOTION_OPTIONS } from '../types/emotion';
import type { EmotionRecord, EmotionType } from '../types/emotion';

interface EmotionChartProps {
  records: EmotionRecord[];
  selectedFilter: EmotionType | 'all';
  onFilterChange: (filter: EmotionType | 'all') => void;
}

export const EmotionChart: React.FC<EmotionChartProps> = ({
  records,
  selectedFilter,
  onFilterChange
}) => {
  const totalCount = records.length;

  // 감정별 카운트 계산
  const countsByEmotion: Record<EmotionType, number> = {
    happy: 0,
    calm: 0,
    anxious: 0,
    sad: 0,
    angry: 0,
    tired: 0
  };

  records.forEach((r) => {
    if (countsByEmotion[r.emotion] !== undefined) {
      countsByEmotion[r.emotion]++;
    }
  });

  // 주의 필요 감정(불안, 슬픔, 화남) 카운트
  const attentionCount = countsByEmotion.anxious + countsByEmotion.sad + countsByEmotion.angry;
  const positiveCount = countsByEmotion.happy + countsByEmotion.calm;

  return (
    <div className="teacher-chart-panel">
      <div className="panel-header">
        <div className="panel-title-wrap">
          <span className="panel-badge">📊 데이터 분석</span>
          <h2 className="panel-title">학급 정서 통계</h2>
        </div>
        <span className="panel-count-pill">
          총 <strong>{totalCount}</strong>명 참여
        </span>
      </div>

      <p className="panel-desc">
        학생들이 제출한 감정 상태를 실시간 막대그래프로 집계한 결과입니다.
      </p>

      {/* 요약 카드 */}
      <div className="chart-summary-cards">
        <div className="summary-stat-card positive">
          <span className="stat-label">긍정·안정 정서 😊🌿</span>
          <span className="stat-val">
            {positiveCount}명{' '}
            <small>({totalCount > 0 ? Math.round((positiveCount / totalCount) * 100) : 0}%)</small>
          </span>
        </div>
        <div className="summary-stat-card attention">
          <span className="stat-label">돌봄·관심 필요 💭😢🔥</span>
          <span className="stat-val">
            {attentionCount}명{' '}
            <small>({totalCount > 0 ? Math.round((attentionCount / totalCount) * 100) : 0}%)</small>
          </span>
        </div>
      </div>

      {/* 막대 그래프 리스트 */}
      <div className="bar-chart-list">
        {EMOTION_OPTIONS.map((opt) => {
          const count = countsByEmotion[opt.id];
          const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
          const isCurrentFilter = selectedFilter === opt.id;

          return (
            <div
              key={opt.id}
              className={`chart-bar-item ${isCurrentFilter ? 'filtered' : ''}`}
              onClick={() => onFilterChange(isCurrentFilter ? 'all' : opt.id)}
              role="button"
              tabIndex={0}
              title={`클릭하여 ${opt.label} 그림만 필터링`}
            >
              <div className="bar-info-row">
                <span className="bar-label">
                  <span className="bar-emoji">{opt.emoji}</span>
                  <span className="bar-name">{opt.label}</span>
                </span>
                <span className="bar-numbers">
                  <strong style={{ color: opt.textColor }}>{count}명</strong>
                  <span className="bar-percentage">({percentage}%)</span>
                </span>
              </div>

              {/* 막대 바 트랙 */}
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: opt.borderColor,
                    boxShadow: count > 0 ? `0 2px 8px ${opt.borderColor}80` : 'none'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {totalCount === 0 && (
        <div className="chart-empty-state">
          <span>🌱</span>
          <p>아직 제출된 학생 정서 데이터가 없습니다.<br />학생들이 마음을 남기면 실시간으로 반영됩니다.</p>
        </div>
      )}

      {selectedFilter !== 'all' && (
        <button
          type="button"
          className="reset-filter-btn"
          onClick={() => onFilterChange('all')}
        >
          필터 해제 (전체 보기) 🔄
        </button>
      )}
    </div>
  );
};
