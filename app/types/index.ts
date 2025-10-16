import { User as SupabaseUser } from "@supabase/supabase-js";

export interface MealData {
  id: number;
  name: string;
  protein: number;
}

export interface DayRecord {
  breakfast: MealData[];
  lunch: MealData[];
  dinner: MealData[];
  isWorkoutDay: boolean; // 하위 호환성을 위해 유지
  hasCardio: boolean;
  hasStrength: boolean;
}

export interface CalcResult {
  food: string;
  amount: string;
  protein: string;
}

export interface FoodItem {
  id: number;
  user_id?: string;
  name: string;
  protein: number;
  is_default?: boolean;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  username?: string;
  body_weight: number;
  created_at: string;
}

export interface DailyRecord {
  id: number;
  user_id: string;
  record_date: string;
  meal_type: "breakfast" | "lunch" | "dinner";
  food_name: string;
  protein_amount: number;
  is_workout_day: boolean; // 하위 호환성을 위해 유지
  has_cardio: boolean;
  has_strength: boolean;
  created_at: string;
}

export type MealType = "breakfast" | "lunch" | "dinner";

export type AuthMode = "login" | "signup";

export type ProteinGoal = "diet" | "maintain" | "bulk";

export type Gender = "male" | "female";

export type { SupabaseUser };
