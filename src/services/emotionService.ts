import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import type { EmotionType } from '../types/emotion';

export interface SaveEmotionParams {
  studentName: string;
  emotion: EmotionType;
  emotionLabel: string;
  emotionEmoji: string;
  imageBlob: Blob;
}

export interface SaveResult {
  docId: string;
  imageUrl: string;
}

/**
 * 그림 Blob을 Firebase Cloud Storage에 JPG 파일로 업로드하고,
 * 학생 정보와 감정 상태, 이미지 URL을 Firestore에 저장합니다.
 */
export async function saveEmotionRecord({
  studentName,
  emotion,
  emotionLabel,
  emotionEmoji,
  imageBlob
}: SaveEmotionParams): Promise<SaveResult> {
  const timestamp = Date.now();
  // 파일명 안전하게 처리 (특수문자 제거)
  const safeName = studentName.replace(/[^a-zA-Z0-9가-힣_-]/g, '') || 'student';
  const filePath = `drawings/${timestamp}_${safeName}.jpg`;
  
  // 1. Firebase Storage에 JPG 이미지 업로드
  const storageRef = ref(storage, filePath);
  const metadata = {
    contentType: 'image/jpeg',
    customMetadata: {
      studentName,
      emotion
    }
  };

  const uploadResult = await uploadBytes(storageRef, imageBlob, metadata);
  const imageUrl = await getDownloadURL(uploadResult.ref);

  // 2. Firestore에 학생 이름, 감정 상태, 그림 주소, 저장 시각 저장
  const docRef = await addDoc(collection(db, 'emotions'), {
    studentName: studentName.trim(),
    emotion,
    emotionLabel,
    emotionEmoji,
    imageUrl,
    createdAt: serverTimestamp()
  });

  return {
    docId: docRef.id,
    imageUrl
  };
}
