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

// 단백질 계산 배수
export const PROTEIN_MULTIPLIERS = {
  normal: 1.6,
  workout: 2.2,
} as const;

// 비밀번호 최소 길이
export const MIN_PASSWORD_LENGTH = 6;

// 아이디 최소 길이
export const MIN_USERNAME_LENGTH = 3;

// 아이디 정규식 (영문, 숫자, 밑줄만)
export const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
