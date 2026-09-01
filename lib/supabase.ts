import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // supabase-js가 기본으로 쓰는 navigator.locks 기반 탭간 동시성 잠금이
    // 배포 환경에서 간헐적으로 걸려서 풀리지 않는 경우가 있고, 한번 걸리면
    // 그 잠금을 기다리는 모든 후속 요청(로그인 이후의 모든 DB 조회 포함)이
    // 네트워크 요청조차 나가지 못한 채 함께 멈춰버림. 이 앱은 개인용으로
    // 여러 탭 간 세션 동기화가 중요하지 않으므로 잠금 자체를 쓰지 않음
    lock: (_name, _acquireTimeout, fn) => fn(),
  },
});

// 타입 정의
export interface UserProfile {
  id: string;
  username?: string;
  email: string;
  body_weight: number;
  gender?: string;
  protein_goal?: string;
  created_at: string;
}

export interface FoodItem {
  id: number;
  user_id?: string;
  name: string;
  protein: number;
  is_default?: boolean;
  created_at: string;
}

export interface DailyRecord {
  id: number;
  user_id: string;
  record_date: string;
  meal_type: "breakfast" | "lunch" | "dinner";
  food_name: string;
  protein_amount: number;
  has_cardio: boolean;
  has_strength: boolean;
  // 하위 호환성을 위한 옵셔널 필드
  is_workout_day?: boolean;
  created_at: string;
}

export interface MealData {
  id: number;
  name: string;
  protein: number;
}

export interface DayRecord {
  breakfast: MealData[];
  lunch: MealData[];
  dinner: MealData[];
  hasCardio: boolean;
  hasStrength: boolean;
}
