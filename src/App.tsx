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
  Smile,
  GraduationCap,
  LogOut,
  Home,
  BarChart3,
  Image as ImageIcon
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { db, storage, auth } from './firebase';

// Pre-registered Teacher UID from environment variables
const TEACHER_UID = import.meta.env.VITE_TEACHER_UID || '';

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
    colors: ['#FFA8A8', '#FA5252', '#F03E3E', '#FD7E14', '#FF922B', '#000000']
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
  // App Role: 'select' = Landing selector, 'student' = Student flow, 'teacher' = Teacher flow
  const [role, setRole] = useState<'select' | 'student' | 'teacher'>('select');
  
  // Auth state
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Student Wizard Steps: 1 = Name, 2 = Emotion, 3 = Canvas, 4 = Success
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

  // 1. Listen to Authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      if (!usr) {
        setRole('select');
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch submissions from Firestore in real-time (up to 100 for stats)
  useEffect(() => {
    const q = query(
      collection(db, 'emotions'),
      orderBy('createdAt', 'desc'),
      limit(100)
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
        
        // Fill canvas background as white
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

  // Google Login handler
  const handleGoogleLogin = () => {
    setLoginLoading(true);
    setLoginError(null);
    const provider = new GoogleAuthProvider();

    signInWithPopup(auth, provider)
      .then(() => {
        setLoginLoading(false);
      })
      .catch((error) => {
        console.error("Google login error:", error);
        setLoginError("구글 로그인 중에 문제가 생겼어요. 다시 시도해볼까요?");
        setLoginLoading(false);
      });
  };

  // Logout handler
  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        setRole('select');
      })
      .catch((err) => {
        console.error("Logout error:", err);
      });
  };

  // Delete submission (Teacher only)
  const handleDeleteSubmission = async (id: string, imageUrl: string) => {
    if (!window.confirm('정말 이 정서 기록과 그림을 삭제하시겠어요? 삭제하면 되돌릴 수 없어요!')) return;
    
    try {
      // 1. Delete document from Firestore
      await deleteDoc(doc(db, 'emotions', id));
      
      // 2. Attempt to delete image from Storage
      try {
        if (imageUrl) {
          const decodedUrl = decodeURIComponent(imageUrl);
          const pathStart = decodedUrl.indexOf('/o/');
          const pathEnd = decodedUrl.indexOf('?');
          if (pathStart !== -1) {
            const fullPath = decodedUrl.substring(pathStart + 3, pathEnd !== -1 ? pathEnd : undefined);
            const fileRef = ref(storage, fullPath);
            await deleteObject(fileRef);
          }
        }
      } catch (storageErr) {
        console.warn("Storage cleanup failed or file not found (ignored):", storageErr);
      }
    } catch (err) {
      console.error("Deletion error:", err);
      alert('정서 기록을 지우는 도중 에러가 났어요.');
    }
  };

  // Helper: format timestamp nicely
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '방금 전';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) + ' (' + date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ')';
  };

  // Reset the student wizard
  const handleRestartStudent = () => {
    setSelectedEmotion(null);
    setStep(1);
  };

  // Calculate statistics from submissions (total 100 max)
  const stats = submissions.reduce((acc, sub) => {
    if (sub.emotion in acc) {
      acc[sub.emotion]++;
    }
    return acc;
  }, { happy: 0, calm: 0, anxious: 0, sad: 0, angry: 0, tired: 0 } as Record<EmotionKey, number>);

  const totalStatsCount = submissions.length;

  // Authorization Check: Does the current Google UID match the registered Teacher UID?
  const isTeacher = user ? user.uid === TEACHER_UID : false;

  return (
    <>
      {/* App Header */}
      <header className="app-header">
        <span className="logo-icon" role="img" aria-label="crayon">🖍️</span>
        <h1 className="app-title">마음 그림판</h1>
        <p className="app-subtitle">오늘 내 마음은 어떤 색깔일까? 그림으로 그려보아요!</p>
      </header>

      {/* STATE A: Google Login Required */}
      {!user && (
        <main className="cute-card" style={{ maxWidth: '500px', margin: '30px auto', textAlign: 'center' }}>
          <h2 className="step-title">만나서 반가워요!</h2>
          <p style={{ color: 'var(--secondary-text)', marginBottom: '24px' }}>
            마음 그림판을 시작하기 위해 구글 로그인이 필요해요.
          </p>

          {loginError && (
            <div style={{
              color: '#C92A2A',
              background: '#FFF5F5',
              padding: '12px',
              borderRadius: '12px',
              border: '2px solid #FFA8A8',
              fontSize: '1rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <AlertCircle size={18} />
              <span>{loginError}</span>
            </div>
          )}

          <button
            type="button"
            className="google-login-btn"
            disabled={loginLoading}
            onClick={handleGoogleLogin}
          >
            {loginLoading ? (
              <>
                <RefreshCw size={20} className="spinner" /> 연결 중...
              </>
            ) : (
              <>
                {/* Cute custom Google SVG logo */}
                <svg className="google-icon-svg" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.67 0 3.19.57 4.37 1.7l3.26-3.26C17.65 1.58 14.97 1 12 1 7.37 1 3.4 3.65 1.58 7.5l3.86 3C6.37 7.74 8.97 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.45 12.3c0-.82-.07-1.6-.2-2.3H12v4.4h6.43c-.28 1.47-1.11 2.7-2.36 3.55l3.66 2.84c2.14-1.97 3.36-4.88 3.36-8.49z" />
                  <path fill="#FBBC05" d="M5.44 14.5c-.24-.72-.37-1.48-.37-2.5s.13-1.78.37-2.5L1.58 6.5C.57 8.5 0 10.7 0 13s.57 4.5 1.58 6.5l3.86-3z" />
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.3 1.09-3.8 1.09-3.03 0-5.63-2.7-6.56-5.46l-3.86 3C3.4 20.35 7.37 23 12 23z" />
                </svg>
                Google 계정으로 로그인하기
              </>
            )}
          </button>
        </main>
      )}

      {/* STATE B: Logged In user selection */}
      {user && role === 'select' && (
        <main className="cute-card" style={{ maxWidth: '500px', margin: '30px auto' }}>
          {/* User profile card */}
          <div className="selection-user-card">
            {user.photoURL && (
              <img src={user.photoURL} alt="프로필 사진" className="selection-user-avatar" />
            )}
            <h2 className="selection-user-name">반가워요, {user.displayName || '친구'}!</h2>
            <span className="selection-user-email">{user.email}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button 
              type="button" 
              className="cute-btn cute-btn-primary" 
              onClick={() => {
                setRole('student');
                handleRestartStudent();
              }}
            >
              🧒 학생 입장 (그림 그리기)
            </button>

            {/* Show Teacher mode entrance only if user matches the teacher UID */}
            {isTeacher && (
              <button 
                type="button" 
                className="cute-btn" 
                style={{ background: '#E2F9E5', color: '#2B8A3E', borderColor: '#A3E9B9', boxShadow: '0 4px 0px #A3E9B9' }}
                onClick={() => setRole('teacher')}
              >
                👩‍🏫 교사 입장 (모니터링 대시보드)
              </button>
            )}

            <button 
              type="button" 
              className="cute-btn cute-btn-back" 
              style={{ marginTop: '12px' }}
              onClick={handleLogout}
            >
              <LogOut size={20} /> 로그아웃
            </button>
          </div>
        </main>
      )}

      {/* STUDENT FLOW */}
      {user && role === 'student' && (
        <>
          {/* Header Action to go back to Home */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
            <button 
              className="tool-btn" 
              onClick={() => setRole('select')}
              style={{ borderRadius: '16px', padding: '8px 16px' }}
            >
              <Home size={18} /> 처음 화면으로
            </button>
          </div>

          {/* Student Progress Stepper */}
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

          {/* Student Card Wizard */}
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

                {/* Submitting Loading overlay */}
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
                  onClick={handleRestartStudent}
                >
                  <RefreshCw size={20} /> 다른 그림 또 그리기
                </button>
              </div>
            )}
          </main>

          {/* Simple Student Feed (Last 6 entries only) */}
          <section className="history-section">
            <h2 className="section-title">
              <span><Smile size={24} style={{ color: '#FFA94D' }} /> 실시간 친구들의 마음 보드</span>
            </h2>

            <div className="history-grid">
              {submissions.length === 0 ? (
                <div className="no-history">
                  <div className="no-history-icon">🎨</div>
                  <div>아직 등록된 그림이 없어요.</div>
                </div>
              ) : (
                submissions.slice(0, 6).map((sub) => {
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
      )}

      {/* TEACHER FLOW */}
      {user && role === 'teacher' && isTeacher && (
        <div>
          {/* Dashboard Navigation/Header Bar */}
          <div className="dashboard-header-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="teacher-badge-info">
                <GraduationCap size={18} /> 교사 모드
              </span>
              <span style={{ color: 'var(--secondary-text)', fontSize: '1.1rem' }}>
                {user.email} 계정으로 관리 중
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="tool-btn"
                onClick={() => setRole('select')}
              >
                <Home size={16} /> 첫 화면으로
              </button>
              <button 
                className="tool-btn" 
                onClick={handleLogout}
                style={{ border: '3px solid #FFC9C9', color: '#FA5252' }}
              >
                <LogOut size={16} /> 로그아웃
              </button>
            </div>
          </div>

          {/* Main Dashboard Two-Column Grid */}
          <div className="teacher-dashboard-layout">
            {/* LEFT COLUMN: Statistics Panel */}
            <section className="cute-card" style={{ padding: '24px' }}>
              <h3 className="dashboard-panel-title">
                <BarChart3 size={20} style={{ color: '#E8590C' }} /> 
                우리 반 마음 통계 현황
              </h3>

              <div className="cute-bar-chart">
                {(Object.keys(EMOTIONS) as EmotionKey[]).map((key) => {
                  const item = EMOTIONS[key];
                  const count = stats[key];
                  const percent = totalStatsCount > 0 ? Math.round((count / totalStatsCount) * 100) : 0;
                  
                  return (
                    <div key={key} className="cute-bar-row">
                      <span className="cute-bar-label">
                        <span>{item.emoji}</span>
                        <span>{item.label.substring(0,2)}</span>
                      </span>
                      
                      <div className="cute-bar-container">
                        <div 
                          className={`cute-bar-fill ${item.class}`}
                          style={{ width: `${percent}%`, minWidth: percent > 0 ? '12px' : '0' }}
                        />
                      </div>

                      <span className="cute-bar-value">
                        {count}명
                        <span className="cute-bar-percent">({percent}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ 
                marginTop: '24px', 
                padding: '16px', 
                background: '#FFFDF9', 
                border: '2px dashed #E6DCD0', 
                borderRadius: '16px',
                fontSize: '1rem',
                color: 'var(--secondary-text)',
                textAlign: 'center'
              }}>
                총 제출 건수: <strong>{totalStatsCount}건</strong> (최근 100개 기준)
              </div>
            </section>

            {/* RIGHT COLUMN: Gallery Panel */}
            <section className="cute-card" style={{ padding: '24px' }}>
              <h3 className="dashboard-panel-title">
                <ImageIcon size={20} style={{ color: '#E8590C' }} /> 
                우리 반 마음 그림 갤러리
              </h3>

              <div className="history-grid">
                {submissions.length === 0 ? (
                  <div className="no-history">
                    <div className="no-history-icon">🎨</div>
                    <div>아직 학생들이 그린 그림이 없어요.</div>
                  </div>
                ) : (
                  submissions.map((sub) => {
                    const emotionDetails = EMOTIONS[sub.emotion];
                    return (
                      <div key={sub.id} className="history-card">
                        <div className="history-card-header">
                          <span className="student-name-badge">{sub.name}</span>
                          <div className="history-card-header-actions">
                            <span className={`emotion-badge ${emotionDetails?.class}`}>
                              {emotionDetails?.emoji} {emotionDetails?.label}
                            </span>
                            <button
                              type="button"
                              className="delete-submission-btn"
                              onClick={() => handleDeleteSubmission(sub.id, sub.imageUrl)}
                              title="그림 삭제"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="history-drawing-container">
                          {sub.imageUrl ? (
                            <img 
                              src={sub.imageUrl} 
                              alt={`${sub.name}의 그림`} 
                              className="history-drawing"
                            />
                          ) : (
                            <div style={{ fontSize: '0.9rem', color: '#ADB5BD' }}>불러오는 중...</div>
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
          </div>
        </div>
      )}
    </>
  );
}

export default App;
