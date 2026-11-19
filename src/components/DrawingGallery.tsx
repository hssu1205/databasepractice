import React, { useState } from 'react';
import { EMOTION_OPTIONS } from '../types/emotion';
import type { EmotionRecord, EmotionType } from '../types/emotion';

interface DrawingGalleryProps {
  records: EmotionRecord[];
  selectedFilter: EmotionType | 'all';
  onFilterChange: (filter: EmotionType | 'all') => void;
}

export const DrawingGallery: React.FC<DrawingGalleryProps> = ({
  records,
  selectedFilter,
  onFilterChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecordForModal, setSelectedRecordForModal] = useState<EmotionRecord | null>(null);

  // 필터링 적용 (감정 선택 + 학생 이름 검색)
  const filteredRecords = records.filter((r) => {
    const matchFilter = selectedFilter === 'all' || r.emotion === selectedFilter;
    const matchSearch =
      !searchQuery.trim() ||
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchFilter && matchSearch;
  });

  // 날짜/시간 포맷팅 헬퍼
  const formatTime = (createdAt: any): string => {
    if (!createdAt) return '방금 전';
    try {
      let date: Date;
      if (typeof createdAt.toDate === 'function') {
        date = createdAt.toDate();
      } else if (createdAt instanceof Date) {
        date = createdAt;
      } else if (typeof createdAt === 'number') {
        date = new Date(createdAt);
      } else if (createdAt.seconds) {
        date = new Date(createdAt.seconds * 1000);
      } else {
        return '최근';
      }

      return new Intl.DateTimeFormat('ko-KR', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch {
      return '최근';
    }
  };

  const getOptionMeta = (emotion: EmotionType) => {
    return EMOTION_OPTIONS.find((o) => o.id === emotion);
  };

  return (
    <div className="teacher-gallery-panel">
      <div className="gallery-header">
        <div className="panel-title-wrap">
          <span className="panel-badge green">🎨 그림 갤러리</span>
          <h2 className="panel-title">학생 마음 도화지</h2>
        </div>
        <span className="gallery-count-tag">
          {filteredRecords.length}개의 그림
        </span>
      </div>

      {/* 필터 및 검색 바 */}
      <div className="gallery-controls">
        <div className="gallery-filter-chips">
          <button
            type="button"
            className={`filter-chip ${selectedFilter === 'all' ? 'active' : ''}`}
            onClick={() => onFilterChange('all')}
          >
            전체 보기
          </button>
          {EMOTION_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`filter-chip ${selectedFilter === opt.id ? 'active' : ''}`}
              onClick={() => onFilterChange(opt.id)}
              style={
                selectedFilter === opt.id
                  ? { backgroundColor: opt.pastelBg, borderColor: opt.borderColor, color: opt.textColor }
                  : undefined
              }
            >
              <span>{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        <div className="gallery-search-wrap">
          <input
            type="text"
            className="gallery-search-input"
            placeholder="학생 이름 검색 (예: 김하늘)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 갤러리 그리드 */}
      {filteredRecords.length === 0 ? (
        <div className="gallery-empty-state">
          <span className="empty-icon">🖼️</span>
          <p className="empty-title">표시할 그림이 없습니다.</p>
          <p className="empty-sub">
            {records.length === 0
              ? '학생들이 아직 그림을 제출하지 않았어요.'
              : '선택한 조건에 맞는 학생 그림이 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="drawing-grid">
          {filteredRecords.map((item) => {
            const meta = getOptionMeta(item.emotion);
            return (
              <div
                key={item.id}
                className="drawing-card"
                onClick={() => setSelectedRecordForModal(item)}
                role="button"
                tabIndex={0}
              >
                <div className="card-thumb-wrap">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={`${item.studentName} 학생이 그린 그림`}
                      className="card-thumb-img"
                      loading="lazy"
                    />
                  ) : (
                    <div className="no-image-placeholder">그림 없음</div>
                  )}
                  <span
                    className="card-emotion-badge"
                    style={{
                      backgroundColor: meta?.pastelBg || '#fff',
                      color: meta?.textColor || '#333',
                      borderColor: meta?.borderColor || '#eee'
                    }}
                  >
                    {item.emotionEmoji} {item.emotionLabel}
                  </span>
                </div>

                <div className="card-meta-row">
                  <span className="card-student-name">🎒 {item.studentName}</span>
                  <span className="card-time">{formatTime(item.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 그림 확대 보기 모달 */}
      {selectedRecordForModal && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedRecordForModal(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setSelectedRecordForModal(null)}
            >
              ✕
            </button>

            <div className="modal-header">
              <div className="modal-student-info">
                <span className="modal-emoji">{selectedRecordForModal.emotionEmoji}</span>
                <div>
                  <h3 className="modal-student-name">{selectedRecordForModal.studentName} 학생의 도화지</h3>
                  <span className="modal-emotion-label">
                    기분: <strong>{selectedRecordForModal.emotionLabel}</strong> · {formatTime(selectedRecordForModal.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-img-wrap">
              <img
                src={selectedRecordForModal.imageUrl}
                alt={`${selectedRecordForModal.studentName} 학생의 그림`}
                className="modal-img"
              />
            </div>

            <div className="modal-footer">
              <a
                href={selectedRecordForModal.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="modal-download-link"
              >
                새 탭에서 원본 보기 ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
