export type EmotionType = 'happy' | 'calm' | 'anxious' | 'sad' | 'angry' | 'tired';

export interface EmotionOption {
  id: EmotionType;
  label: string;
  emoji: string;
  description: string;
  pastelBg: string;
  borderColor: string;
  textColor: string;
  tagColor: string;
}

export const EMOTION_OPTIONS: EmotionOption[] = [
  {
    id: 'happy',
    label: '행복해요',
    emoji: '😊',
    description: '기분이 아주 좋고 즐거워요',
    pastelBg: '#FFF9E6',
    borderColor: '#FFD97D',
    textColor: '#8D6E16',
    tagColor: '#FFEAA7'
  },
  {
    id: 'calm',
    label: '평온해요',
    emoji: '🌿',
    description: '마음이 차분하고 편안해요',
    pastelBg: '#F0F9F1',
    borderColor: '#A8E6CF',
    textColor: '#2E7D4F',
    tagColor: '#D4EDDA'
  },
  {
    id: 'anxious',
    label: '불안해요',
    emoji: '💭',
    description: '걱정이 되거나 두근거려요',
    pastelBg: '#F5F0FF',
    borderColor: '#D8B9FF',
    textColor: '#6A38B3',
    tagColor: '#E8D7FF'
  },
  {
    id: 'sad',
    label: '슬퍼요',
    emoji: '😢',
    description: '눈물이 나거나 속상해요',
    pastelBg: '#EFF7FF',
    borderColor: '#A0D2EB',
    textColor: '#20639B',
    tagColor: '#D0E8FF'
  },
  {
    id: 'angry',
    label: '화나요',
    emoji: '🔥',
    description: '답답하거나 마음이 부글부글해요',
    pastelBg: '#FFF0F0',
    borderColor: '#FFAAA6',
    textColor: '#C0392B',
    tagColor: '#FFD3D1'
  },
  {
    id: 'tired',
    label: '피곤해요',
    emoji: '🥱',
    description: '기운이 없고 쉬고 싶어요',
    pastelBg: '#F7F6F9',
    borderColor: '#D5D5E2',
    textColor: '#575766',
    tagColor: '#E6E6EE'
  }
];

export interface EmotionRecord {
  id?: string;
  studentName: string;
  emotion: EmotionType;
  emotionLabel: string;
  emotionEmoji: string;
  imageUrl: string;
  createdAt: any;
}
