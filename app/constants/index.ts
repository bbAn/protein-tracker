// 기본 음식 데이터
export const DEFAULT_FOODS = [
  { id: 1, name: "닭가슴살 100g", protein: 23 },
  { id: 2, name: "계란 1개", protein: 6 },
  { id: 3, name: "우유 200ml", protein: 6.6 },
  { id: 4, name: "참치캔 1개", protein: 25 },
  { id: 5, name: "두부 100g", protein: 8 },
  { id: 6, name: "쇠고기 100g", protein: 26 },
  { id: 7, name: "연어 100g", protein: 25 },
  { id: 8, name: "그릭요거트 100g", protein: 10 },
];

// 식사 타입과 한국어 이름 매핑
export const MEAL_NAMES = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
} as const;

// 요일 이름
export const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

// 기본 체중
export const DEFAULT_BODY_WEIGHT = 70;

// 단백질 목적 타입
export type ProteinGoal = "general" | "muscle" | "diet";

// 단백질 목적별 배수
export const PROTEIN_GOALS = {
  general: {
    name: "일반인",
    description: "기본적인 건강 유지",
    normal: 1.2, // 비운동일
    workout: 1.8, // 운동일
    icon: "👤",
  },
  muscle: {
    name: "근비대 목적",
    description: "근육량 증가가 목표",
    normal: 1.6, // 비운동일
    workout: 2.2, // 운동일
    icon: "💪",
  },
  diet: {
    name: "다이어트",
    description: "근손실 방지하며 체중 감량",
    normal: 1.4, // 비운동일
    workout: 2.0, // 운동일
    icon: "🔥",
  },
} as const;

// 기본 단백질 목적
export const DEFAULT_PROTEIN_GOAL: ProteinGoal = "muscle";

// 하위 호환성을 위한 기존 PROTEIN_MULTIPLIERS (근비대 목적 기본값)
export const PROTEIN_MULTIPLIERS = {
  normal: PROTEIN_GOALS.muscle.normal,
  workout: PROTEIN_GOALS.muscle.workout,
} as const;

// 비밀번호 최소 길이
export const MIN_PASSWORD_LENGTH = 6;

// 아이디 최소 길이
export const MIN_USERNAME_LENGTH = 3;

// 아이디 정규식 (영문, 숫자, 밑줄만)
export const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
