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

// 단백질 섭취 목적별 설정 (성별 구분)
export const PROTEIN_GOALS = {
  male: {
    diet: {
      name: "다이어트",
      icon: "🔥",
      description: "체중 감량 및 체지방 감소",
      normal: 1.2,
      workout: 1.8,
    },
    maintain: {
      name: "체중 유지",
      icon: "⚖️",
      description: "현재 체중과 근육량 유지",
      normal: 1.2,
      workout: 2.0,
    },
    bulk: {
      name: "벌크업",
      icon: "💪",
      description: "근육량 증가 및 체중 증량",
      normal: 1.6,
      workout: 2.2,
    },
  },
  female: {
    diet: {
      name: "다이어트",
      icon: "🔥",
      description: "체중 감량 및 체지방 감소",
      normal: 1.0,
      workout: 1.6,
    },
    maintain: {
      name: "체중 유지",
      icon: "⚖️",
      description: "현재 체중과 근육량 유지",
      normal: 1.0,
      workout: 1.8,
    },
    bulk: {
      name: "근육량 증가",
      icon: "💪",
      description: "근육량 증가 및 탄탄한 몸매",
      normal: 1.4,
      workout: 2.0,
    },
  },
} as const;

// 비밀번호 최소 길이
export const MIN_PASSWORD_LENGTH = 6;

// 아이디 최소 길이
export const MIN_USERNAME_LENGTH = 3;

// 아이디 정규식 (영문, 숫자, 밑줄만)
export const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
