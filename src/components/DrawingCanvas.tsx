import React, {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback
} from 'react';

export interface DrawingCanvasHandle {
  getJpgBlob: () => Promise<Blob | null>;
  hasDrawn: () => boolean;
  clear: () => void;
}

interface DrawingCanvasProps {
  emotionPrompt?: string;
}

const COLOR_PALETTE = [
  { name: '검정', hex: '#2C3E50' },
  { name: '빨강', hex: '#E74C3C' },
  { name: '분홍', hex: '#FF6B8B' },
  { name: '주황', hex: '#E67E22' },
  { name: '노랑', hex: '#F1C40F' },
  { name: '연두', hex: '#2ECC71' },
  { name: '하늘', hex: '#3498DB' },
  { name: '파랑', hex: '#2980B9' },
  { name: '보라', hex: '#9B59B6' },
  { name: '갈색', hex: '#795548' }
];

const LINE_WIDTHS = [
  { size: 3, label: '얇게' },
  { size: 8, label: '보통' },
  { size: 16, label: '두껍게' }
];

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  ({ emotionPrompt }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentColor, setCurrentColor] = useState<string>('#2C3E50');
    const [currentWidth, setCurrentWidth] = useState<number>(8);
    const [isEraser, setIsEraser] = useState(false);
    const [history, setHistory] = useState<ImageData[]>([]);
    const [strokeCount, setStrokeCount] = useState(0);

    // 캔버스 기본 흰색 배경 초기화
    const initCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 고화질 대응: CSS 크기와 실제 캔버스 해상도 맞춤
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 600;
      const height = 360;

      // 내부 해상도 설정
      canvas.width = width;
      canvas.height = height;

      // 기본 흰색 배경으로 칠하기 (JPG 변환 시 검은 배경 방지)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // 초기 상태를 히스토리에 저장
      const initialState = ctx.getImageData(0, 0, width, height);
      setHistory([initialState]);
      setStrokeCount(0);
    }, []);

    useEffect(() => {
      initCanvas();

      // 창 크기 변경 시 리사이즈 대응 (단, 기존 그림 보존 고려)
      const handleResize = () => {
        // 이미 그린 상태면 보존
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [initCanvas]);

    // 히스토리 스냅샷 저장
    const saveSnapshot = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev.slice(-15), snapshot]); // 최대 15개 상태 유지
      setStrokeCount((prev) => prev + 1);
    }, []);

    // 그리기 좌표 계산
    const getCoordinates = (
      e: React.PointerEvent<HTMLCanvasElement>
    ): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const coords = getCoordinates(e);
      if (!coords) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.setPointerCapture(e.pointerId);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = isEraser ? currentWidth * 2 : currentWidth;
      ctx.strokeStyle = isEraser ? '#FFFFFF' : currentColor;

      setIsDrawing(true);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const coords = getCoordinates(e);
      if (!coords) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      setIsDrawing(false);
      saveSnapshot();
    };

    // 실행 취소 (Undo)
    const handleUndo = () => {
      if (history.length <= 1) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const newHistory = [...history];
      newHistory.pop(); // 현재 상태 제거
      const previousState = newHistory[newHistory.length - 1];

      ctx.putImageData(previousState, 0, 0);
      setHistory(newHistory);
      setStrokeCount((prev) => Math.max(0, prev - 1));
    };

    // 전체 지우기
    const handleClearAll = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveSnapshot();
    };

    // 외부 노출 메서드
    useImperativeHandle(ref, () => ({
      getJpgBlob: (): Promise<Blob | null> => {
        return new Promise((resolve) => {
          const canvas = canvasRef.current;
          if (!canvas) {
            resolve(null);
            return;
          }

          // 확실하게 흰색 배경 위에 합성된 새 캔버스 생성하여 JPG 추출
          const exportCanvas = document.createElement('canvas');
          exportCanvas.width = canvas.width;
          exportCanvas.height = canvas.height;
          const exportCtx = exportCanvas.getContext('2d');
          if (!exportCtx) {
            resolve(null);
            return;
          }

          // 1) 흰색 배경 채우기
          exportCtx.fillStyle = '#FFFFFF';
          exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
          // 2) 현재 캔버스 내용 그리기
          exportCtx.drawImage(canvas, 0, 0);

          // 3) image/jpeg 형식으로 변환
          exportCanvas.toBlob(
            (blob) => {
              resolve(blob);
            },
            'image/jpeg',
            0.92
          );
        });
      },
      hasDrawn: () => strokeCount > 0,
      clear: handleClearAll
    }));

    return (
      <div className="drawing-section">
        <div className="section-title-wrap">
          <span className="step-tag">3단계</span>
          <h2 className="section-title">내 마음을 그림으로 그려봐요 🎨</h2>
        </div>
        <p className="section-desc">
          {emotionPrompt || '지금 기분이나 떠오르는 생각, 느낌을 자유롭게 도화지에 표현해봐요!'}
        </p>

        {/* 캔버스 툴바 */}
        <div className="canvas-toolbar">
          {/* 색상 선택 팔레트 */}
          <div className="toolbar-group">
            <span className="tool-label">색상</span>
            <div className="color-palette">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  title={color.name}
                  className={`color-btn ${
                    !isEraser && currentColor === color.hex ? 'active' : ''
                  }`}
                  style={{ backgroundColor: color.hex }}
                  onClick={() => {
                    setCurrentColor(color.hex);
                    setIsEraser(false);
                  }}
                />
              ))}
            </div>
          </div>

          {/* 선 굵기 선택 */}
          <div className="toolbar-group">
            <span className="tool-label">굵기</span>
            <div className="width-palette">
              {LINE_WIDTHS.map((w) => (
                <button
                  key={w.size}
                  type="button"
                  className={`width-btn ${currentWidth === w.size ? 'active' : ''}`}
                  onClick={() => setCurrentWidth(w.size)}
                >
                  <span
                    className="width-preview"
                    style={{
                      width: `${Math.min(w.size + 4, 18)}px`,
                      height: `${Math.min(w.size + 4, 18)}px`
                    }}
                  />
                  <span>{w.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 도구 (지우개, 뒤로가기, 전체 지우기) */}
          <div className="toolbar-group action-tools">
            <button
              type="button"
              className={`tool-action-btn ${isEraser ? 'active-eraser' : ''}`}
              onClick={() => setIsEraser((prev) => !prev)}
            >
              🧹 지우개
            </button>
            <button
              type="button"
              className="tool-action-btn"
              onClick={handleUndo}
              disabled={history.length <= 1}
              title="한 단계 되돌리기"
            >
              ↩️ 되돌리기
            </button>
            <button
              type="button"
              className="tool-action-btn danger"
              onClick={handleClearAll}
              title="도화지 전체 지우기"
            >
              🗑️ 새로 그리기
            </button>
          </div>
        </div>

        {/* 도화지 캔버스 영역 */}
        <div className="canvas-wrapper">
          <canvas
            ref={canvasRef}
            className="drawing-board"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          {strokeCount === 0 && (
            <div className="canvas-placeholder">
              <span>✏️ 이곳을 누르고 마음껏 그림을 그려보세요!</span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

DrawingCanvas.displayName = 'DrawingCanvas';
