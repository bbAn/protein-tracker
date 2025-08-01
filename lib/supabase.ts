import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 타입 정의
export interface UserProfile {
  id: string;
  username?: string; // 추가
  email: string;
  body_weight: number;
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
  is_workout_day: boolean;
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
  isWorkoutDay: boolean;
}
