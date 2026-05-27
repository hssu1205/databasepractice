import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  ArrowLeft, 
  ArrowRight, 
  Trash2, 
  Palette, 
  Brush, 
  Sparkles, 
  RefreshCw, 
  AlertCircle,
  Smile
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, storage } from './firebase';

// Emotion metadata matching the cute pastel styles in index.css
const EMOTIONS = {
  happy: {
    emoji: '😊',
    label: '행복해요',
    class: 'happy',
    defaultColor: '#FFE066', // Warm pastel yellow
    colors: ['#FFE066', '#FF922B', '#FF6B6B', '#FCC419', '#4DABF7', '#51CF66', '#000000']
  },
  calm: {
    emoji: '😌',
    label: '평온해요',
    class: 'calm',
    defaultColor: '#8CE99A', // Pastel mint green
    colors: ['#8CE99A', '#37B24D', '#20C997', '#94D82D', '#74C0FC', '#D0BFFF', '#000000']
  },
  anxious: {
    emoji: '😰',
    label: '불안해요',
    class: 'anxious',
    defaultColor: '#D0BFFF', // Pastel purple
    colors: ['#D0BFFF', '#845EF7', '#AE3EC9', '#E64980', '#74C0FC', '#CED4DA', '#000000']
  },
  sad: {
    emoji: '😢',
    label: '슬퍼요',
    class: 'sad',
    defaultColor: '#74C0FC', // Pastel blue
    colors: ['#74C0FC', '#228BE6', '#15AABF', '#AE3EC9', '#A3E9B9', '#868E96', '#000000']
  },
  angry: {
    emoji: '😡',
    label: '화나요',
    class: 'angry',
    defaultColor: '#FFA8A8', // Pastel coral red
    colors: ['#FFA8A8', '#FA5252', '#F03E3E', '#FD7E14', '#FCC419', '#495057', '#000000']
  },
  tired: {
    emoji: '😴',
    label: '피곤해요',
    class: 'tired',
    defaultColor: '#ADB5BD', // Cozy gray
    colors: ['#ADB5BD', '#868E96', '#CED4DA', '#F1F3F5', '#E5A900', '#7048E8', '#000000']
  }
} as const;

type EmotionKey = keyof typeof EMOTIONS;

interface Submission {
  id: string;
  name: string;
  emotion: EmotionKey;
  imageUrl: string;
  createdAt: any;
}

function App() {
  // Wizard Steps: 1 = Name, 2 = Emotion, 3 = Canvas, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [studentName, setStudentName] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionKey | null>(null);
  
  // Drawing Canvas States
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState<4 | 8 | 14>(8); // thin, medium, thick
  const [mode, setMode] = useState<'draw' | 'erase'>('draw');
  
  // Submit & Firebase states
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);

  // Fetch submissions from Firestore in real-time
  useEffect(() => {
    const q = query(
      collection(db, 'emotions'),
      orderBy('createdAt', 'desc'),
      limit(6)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Submission[] = [];
      snapshot.forEach((doc) => {
        const docData = doc.data();
        data.push({ 
          id: doc.id, 
          name: docData.name || '무명 학생',
          emotion: (docData.emotion as EmotionKey) || 'happy',
          imageUrl: docData.imageUrl || '',
          createdAt: docData.createdAt
        });
      });
      setSubmissions(data);
    }, (error) => {
      console.error("Firestore Loading Error:", error);
    });

    return () => unsubscribe();
  }, []);

  // Initialize Canvas when Step 3 mounts
  useEffect(() => {
    if (step === 3 && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Set canvas coordinate space (High-Res 800x600 for clean images)
        canvas.width = 800;
        canvas.height = 600;
        
        // Fill canvas background as white (crucial for JPG compression, otherwise it defaults to black transparent pixels)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Auto-select crayon color matching selected emotion
        if (selectedEmotion) {
          setBrushColor(EMOTIONS[selectedEmotion].defaultColor);
        }
        setMode('draw');
      }
    }
  }, [step, selectedEmotion]);

  // Translate mouse/touch client coordinates into high-res canvas scale coordinates
  const getCoordinates = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // Drawing event handlers
  const handleStartDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCoordinates(e.nativeEvent);
    if (!coords) return;

    isDrawingRef.current = true;
    lastXRef.current = coords.x;
    lastYRef.current = coords.y;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = mode === 'erase' ? '#FFFFFF' : brushColor;
      ctx.fill();
    }
  };

  const handleDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const coords = getCoordinates(e.nativeEvent);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(lastXRef.current, lastYRef.current);
      ctx.lineTo(coords.x, coords.y);
      ctx.strokeStyle = mode === 'erase' ? '#FFFFFF' : brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      lastXRef.current = coords.x;
      lastYRef.current = coords.y;
    }
  };

  const handleStopDrawing = () => {
    isDrawingRef.current = false;
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Upload JPG to Cloud Storage & document to Firestore
  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (!canvas || !studentName.trim() || !selectedEmotion) return;

    setSubmitting(true);
    setSubmitError(null);

    // Export canvas as JPEG (95% quality)
    canvas.toBlob((blob) => {
      if (!blob) {
        setSubmitError('그림을 파일로 만드는데 실패했어요.');
        setSubmitting(false);
        return;
      }

      const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const filename = `drawings/${fileId}.jpg`;
      const storageRef = ref(storage, filename);

      uploadBytes(storageRef, blob, { contentType: 'image/jpeg' })
        .then((snapshot) => getDownloadURL(snapshot.ref))
        .then((downloadUrl) => {
          return addDoc(collection(db, 'emotions'), {
            name: studentName.trim(),
            emotion: selectedEmotion,
            imageUrl: downloadUrl,
            createdAt: serverTimestamp(),
          });
        })
        .then(() => {
          setStep(4);
          setSubmitting(false);
        })
        .catch((error) => {
          console.error("Submission error:", error);
          setSubmitError('서버에 저장하는 중에 오류가 났어요. 인터넷이나 Firebase 설정을 확인해주세요.');
          setSubmitting(false);
        });
    }, 'image/jpeg', 0.95);
  };

  // Helper: format timestamp nicely
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '방금 전';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) + ' (' + date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ')';
  };

  // Reset the wizard to start again
  const handleRestart = () => {
    setSelectedEmotion(null);
    setStep(1);
  };

  return (
    <>
      {/* App Header */}
      <header className="app-header">
        <span className="logo-icon" role="img" aria-label="crayon">🖍️</span>
        <h1 className="app-title">마음 그림판</h1>
        <p className="app-subtitle">오늘 내 마음은 어떤 색깔일까? 그림으로 그려보아요!</p>
      </header>

      {/* Progress Stepper (Only visible when doing inputs) */}
      {step < 4 && (
        <div className="progress-container">
          <div className="progress-line">
            <div 
              className="progress-line-fill" 
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            ></div>
          </div>
          <div className={`progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>1</div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>2</div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>3</div>
        </div>
      )}

      {/* Main card */}
      <main className="cute-card">
        {step === 1 && (
          <div className="name-input-container">
            <h2 className="step-title">친구의 이름을 가르쳐주세요!</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--secondary-text)' }}>
              <User size={20} />
              <label htmlFor="name-input" className="cute-label">이름을 입력해줘요</label>
            </div>
            <input
              id="name-input"
              type="text"
              className="cute-input"
              placeholder="예: 홍길동"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              maxLength={15}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && studentName.trim()) {
                  setStep(2);
                }
              }}
            />
            <div className="navigation-bar">
              <button
                className="cute-btn cute-btn-primary"
                disabled={!studentName.trim()}
                onClick={() => setStep(2)}
              >
                다음으로 갈래요 <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="step-title">{studentName} 친구, 지금 마음이 어때요?</h2>
            
            <div className="emotions-grid">
              {(Object.keys(EMOTIONS) as EmotionKey[]).map((key) => {
                const item = EMOTIONS[key];
                const isSelected = selectedEmotion === key;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`emotion-card ${item.class} ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedEmotion(key)}
                  >
                    <span className="emotion-emoji">{item.emoji}</span>
                    <span className="emotion-label">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="navigation-bar">
              <button
                className="cute-btn cute-btn-back"
                onClick={() => setStep(1)}
              >
                <ArrowLeft size={20} /> 이름 바꾸기
              </button>
              <button
                className="cute-btn cute-btn-primary"
                disabled={!selectedEmotion}
                onClick={() => setStep(3)}
              >
                그림 그리러 가기 <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && selectedEmotion && (
          <div className="canvas-wrapper">
            <h2 className="step-title">
              지금 내 기분({EMOTIONS[selectedEmotion].emoji} {EMOTIONS[selectedEmotion].label})을 그림으로 자유롭게 표현해보세요!
            </h2>

            {/* Drawing Canvas */}
            <div className="canvas-container">
              <canvas
                ref={canvasRef}
                className="emotion-canvas"
                onMouseDown={handleStartDrawing}
                onMouseMove={handleDraw}
                onMouseUp={handleStopDrawing}
                onMouseLeave={handleStopDrawing}
                onTouchStart={handleStartDrawing}
                onTouchMove={handleDraw}
                onTouchEnd={handleStopDrawing}
              />
            </div>

            {/* Crayon / Tool Menu */}
            <div className="drawing-toolbar">
              {/* Palette */}
              <div className="toolbar-group">
                <span className="toolbar-label"><Palette size={16} style={{ display: 'inline', verticalAlign: 'middle' }} /> 크레파스:</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {EMOTIONS[selectedEmotion].colors.map((color) => (
                    <button
                      key={color}
                      className={`color-circle ${brushColor === color && mode === 'draw' ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        setBrushColor(color);
                        setMode('draw');
                      }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Brush size */}
              <div className="toolbar-group">
                <span className="toolbar-label"><Brush size={16} style={{ display: 'inline', verticalAlign: 'middle' }} /> 두께:</span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    className={`brush-size-btn brush-thin ${brushSize === 4 ? 'active' : ''}`}
                    onClick={() => setBrushSize(4)}
                    title="얇게"
                  >
                    <div className="brush-size-dot" />
                  </button>
                  <button
                    className={`brush-size-btn brush-medium ${brushSize === 8 ? 'active' : ''}`}
                    onClick={() => setBrushSize(8)}
                    title="보통"
                  >
                    <div className="brush-size-dot" />
                  </button>
                  <button
                    className={`brush-size-btn brush-thick ${brushSize === 14 ? 'active' : ''}`}
                    onClick={() => setBrushSize(14)}
                    title="두껍게"
                  >
                    <div className="brush-size-dot" />
                  </button>
                </div>
              </div>

              {/* Tools */}
              <div className="toolbar-group" style={{ marginLeft: 'auto', gap: '8px' }}>
                <button
                  className={`tool-btn ${mode === 'erase' ? 'active' : ''}`}
                  onClick={() => setMode(mode === 'erase' ? 'draw' : 'erase')}
                >
                  지우개
                </button>
                <button
                  className="tool-btn"
                  onClick={handleClearCanvas}
                  style={{ border: '3px solid #FFC9C9', color: '#FA5252' }}
                >
                  <Trash2 size={16} /> 다 지우기
                </button>
              </div>
            </div>

            {/* Error notifications */}
            {submitError && (
              <div style={{
                color: '#C92A2A',
                background: '#FFF5F5',
                padding: '12px 16px',
                borderRadius: '16px',
                border: '2px solid #FFA8A8',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '1.1rem'
              }}>
                <AlertCircle size={20} />
                <span>{submitError}</span>
              </div>
            )}

            {/* Submitting Loading screen overlay */}
            {submitting ? (
              <div className="loading-overlay">
                <div className="spinner" />
                <span className="loading-text">친구의 예쁜 그림을 하늘나라 보관함(Firebase)에 넣고 있어요...</span>
              </div>
            ) : (
              <div className="navigation-bar">
                <button
                  className="cute-btn cute-btn-back"
                  disabled={submitting}
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft size={20} /> 기분 다시 정하기
                </button>
                <button
                  className="cute-btn cute-btn-primary"
                  disabled={submitting}
                  onClick={handleSubmit}
                >
                  다 그렸어요! 제출하기 <Sparkles size={20} />
                </button>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="success-screen">
            <span className="success-character" role="img" aria-label="sparkling heart">💖</span>
            <h2 className="success-message">저장이 잘 되었어요! 정말 멋진 그림이에요!</h2>
            <p style={{ color: 'var(--secondary-text)', margin: '0 0 12px 0' }}>
              {studentName} 친구의 오늘의 기분이 기록 보관실에 예쁘게 저장되었답니다.
            </p>
            <button
              className="cute-btn cute-btn-primary"
              style={{ maxWidth: '300px' }}
              onClick={handleRestart}
            >
              <RefreshCw size={20} /> 다른 그림 또 그리기
            </button>
          </div>
        )}
      </main>

      {/* Real-time dashboard panel */}
      <section className="history-section">
        <h2 className="section-title">
          <span><Smile size={24} style={{ color: '#FFA94D' }} /> 실시간 친구들의 마음 보드</span>
          <span style={{ fontSize: '1rem', color: 'var(--secondary-text)', fontWeight: 'normal' }}>
            실시간 업데이트 중 <RefreshCw size={14} className="spinner" style={{ animationDuration: '3s', border: 'none', borderRadius: 0, width: 'auto', height: 'auto' }} />
          </span>
        </h2>

        <div className="history-grid">
          {submissions.length === 0 ? (
            <div className="no-history">
              <div className="no-history-icon">🎨</div>
              <div>아직 등록된 그림이 없어요.</div>
              <div style={{ fontSize: '1rem', marginTop: '4px' }}>가장 먼저 그림을 제출해보세요!</div>
            </div>
          ) : (
            submissions.map((sub) => {
              const emotionDetails = EMOTIONS[sub.emotion];
              return (
                <div key={sub.id} className="history-card">
                  <div className="history-card-header">
                    <span className="student-name-badge">{sub.name}</span>
                    <span className={`emotion-badge ${emotionDetails?.class}`}>
                      {emotionDetails?.emoji} {emotionDetails?.label}
                    </span>
                  </div>
                  
                  <div className="history-drawing-container">
                    {sub.imageUrl ? (
                      <img 
                        src={sub.imageUrl} 
                        alt={`${sub.name}의 감정 그림`} 
                        className="history-drawing"
                        loading="lazy"
                      />
                    ) : (
                      <div style={{ fontSize: '0.9rem', color: '#ADB5BD' }}>그림을 불러오는 중...</div>
                    )}
                  </div>

                  <div className="history-card-footer">
                    <span>{formatDate(sub.createdAt)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}

export default App;
