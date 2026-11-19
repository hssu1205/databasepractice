import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 환경 변수 설정 여부 체크 (사용자 친화적 안내를 위함)
export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket
  );
};

// Firebase 앱 싱글톤 초기화
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Firestore, Cloud Storage, Auth 인스턴스
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// 교사 UID 검증 헬퍼
export const checkIsTeacher = (uid: string | undefined | null): boolean => {
  if (!uid) return false;
  const configuredUids = (import.meta.env.VITE_TEACHER_UID || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  return configuredUids.includes(uid);
};

export default app;
