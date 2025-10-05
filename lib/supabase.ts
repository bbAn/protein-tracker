import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
