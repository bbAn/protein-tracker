import { useCallback, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  DayRecord,
  DailyRecord,
  FoodItem,
  MealType,
  SupabaseUser,
} from "../types";
import {
  dateStringToDateKey,
  dateKeyToDateString,
  getKoreanDateString,
} from "../utils/dateUtils";

export const useDailyRecords = (
  user: SupabaseUser | null,
  foodDatabase: FoodItem[]
) => {
  const [dailyRecords, setDailyRecords] = useState<Record<string, DayRecord>>(
    {}
  );
  const [userProfileId, setUserProfileId] = useState<string | null>(null);

  // user_profiles의 id 가져오기 (daily_records의 user_id로 사용)
  const getUserProfileId = useCallback(
    async (authUserId: string): Promise<string | null> => {
      if (userProfileId) return userProfileId;

      try {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("auth_id", authUserId)
          .single();

        if (profile) {
          setUserProfileId(profile.id);
          return profile.id;
        }
      } catch (error) {
        console.error("Error getting user profile id:", error);
      }
      return null;
    },
    [userProfileId]
  );

  // 일일 기록 로드
  const loadDailyRecords = useCallback(
    async (authUserId: string) => {
      try {
        // user_profiles의 id 가져오기
        const profileId = await getUserProfileId(authUserId);
        if (!profileId) {
          console.error("User profile not found");
          return;
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const koreanDateFrom = getKoreanDateString(thirtyDaysAgo);

        console.log("📅 기록 조회 기간:", {
          from: koreanDateFrom,
          profileId,
        });

        const { data: records, error: recordsError } = await supabase
          .from("daily_records")
          .select("*")
          .eq("user_id", profileId)
          .gte("record_date", koreanDateFrom)
          .order("record_date", { ascending: false });

        console.log("📊 기록 조회 결과:", {
          records: records?.length,
          recordsError,
        });

        if (records) {
          const recordsMap: Record<string, DayRecord> = {};
          records.forEach((record: DailyRecord) => {
            const dateKey = dateStringToDateKey(record.record_date);

            if (!recordsMap[dateKey]) {
              recordsMap[dateKey] = {
                breakfast: [],
                lunch: [],
                dinner: [],
                isWorkoutDay: record.is_workout_day || false,
                hasCardio: false,
                hasStrength: false,
              };
            }
            recordsMap[dateKey][record.meal_type].push({
              id: record.id,
              name: record.food_name,
              protein: record.protein_amount,
            });
          });

          console.log("📊 로드된 날짜별 기록:");
          Object.keys(recordsMap).forEach((dateKey) => {
            const dayData = recordsMap[dateKey];
            const totalItems = [
              ...dayData.breakfast,
              ...dayData.lunch,
              ...dayData.dinner,
            ].length;
            console.log(`  ${dateKey}: ${totalItems}개 항목`);
          });

          setDailyRecords(recordsMap);
        }
      } catch (error) {
        console.error("💥 사용자 데이터 로드 실패:", error);
      }
    },
    [getUserProfileId]
  );

  // 특정 날짜의 기록 가져오기
  const getDayRecord = (dateString: string): DayRecord => {
    return dailyRecords[dateString] || {
      breakfast: [],
      lunch: [],
      dinner: [],
      isWorkoutDay: false,
      hasCardio: false,
      hasStrength: false,
    };
  };

  // 특정 날짜의 총 단백질량 계산
  const getTotalProtein = (dateString: string): number => {
    const record = getDayRecord(dateString);
    return [...record.breakfast, ...record.lunch, ...record.dinner].reduce(
      (total, food) => total + food.protein,
      0
    );
  };

  // 음식 추가
  const addFoodToMeal = async (
    meal: MealType,
    foodId: number,
    selectedDate: string
  ): Promise<boolean> => {
    const food = foodDatabase.find((f) => f.id === foodId);
    if (!food || !user) return false;

    try {
      // user_profiles의 id 가져오기
      const profileId = await getUserProfileId(user.id);
      if (!profileId) {
        console.error("User profile not found");
        return false;
      }

      const currentRecord = getDayRecord(selectedDate);
      const dbDateString = dateKeyToDateString(selectedDate);

      console.log("🍽️ 음식 추가:", {
        selectedDate,
        dbDateString,
        meal,
        food: food.name,
        profileId,
      });

      const { data, error } = await supabase
        .from("daily_records")
        .insert({
          user_id: profileId,
          record_date: dbDateString,
          meal_type: meal,
          food_name: food.name,
          protein_amount: food.protein,
          is_workout_day: currentRecord.isWorkoutDay,
        })
        .select();

      if (error) throw error;

      // 로컬 상태 업데이트
      const updatedRecords = { ...dailyRecords };
      if (!updatedRecords[selectedDate]) {
        updatedRecords[selectedDate] = {
          breakfast: [],
          lunch: [],
          dinner: [],
          isWorkoutDay: false,
          hasCardio: false,
          hasStrength: false,
        };
      }

      const newRecord = data[0];
      updatedRecords[selectedDate][meal].push({
        id: newRecord.id,
        name: food.name,
        protein: food.protein,
      });

      setDailyRecords(updatedRecords);
      console.log("✅ 음식 추가 성공!");
      return true;
    } catch (error) {
      console.error("❌ 음식 추가 실패:", error);
      alert("음식 추가 중 오류가 발생했습니다.");
      return false;
    }
  };

  // 직접 음식 추가 (음식명과 단백질량으로)
  const addDirectFoodToMeal = async (
    meal: MealType,
    foodName: string,
    proteinAmount: number,
    selectedDate: string
  ): Promise<boolean> => {
    if (!user || !foodName || proteinAmount <= 0) return false;

    try {
      // user_profiles의 id 가져오기
      const profileId = await getUserProfileId(user.id);
      if (!profileId) {
        console.error("User profile not found");
        return false;
      }

      const currentRecord = getDayRecord(selectedDate);
      const dbDateString = dateKeyToDateString(selectedDate);

      const { data, error } = await supabase
        .from("daily_records")
        .insert({
          user_id: profileId,
          record_date: dbDateString,
          meal_type: meal,
          food_name: foodName,
          protein_amount: proteinAmount,
          is_workout_day: currentRecord.isWorkoutDay,
        })
        .select();

      if (error) throw error;

      // 로컬 상태 업데이트
      const updatedRecords = { ...dailyRecords };
      if (!updatedRecords[selectedDate]) {
        updatedRecords[selectedDate] = {
          breakfast: [],
          lunch: [],
          dinner: [],
          isWorkoutDay: false,
          hasCardio: false,
          hasStrength: false,
        };
      }

      const newRecord = data[0];
      updatedRecords[selectedDate][meal].push({
        id: newRecord.id,
        name: foodName,
        protein: proteinAmount,
      });

      setDailyRecords(updatedRecords);
      return true;
    } catch (error) {
      console.error("❌ 직접 음식 추가 실패:", error);
      return false;
    }
  };

  // 음식 삭제
  const removeFoodFromMeal = async (
    meal: MealType,
    foodId: number,
    selectedDate: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from("daily_records")
        .delete()
        .eq("id", foodId)
        .select();

      if (error) {
        console.error("데이터베이스 삭제 실패:", error);
        alert("삭제 중 오류가 발생했습니다: " + error.message);
        return false;
      }

      if (data && data.length > 0) {
        const updatedRecords = { ...dailyRecords };
        if (updatedRecords[selectedDate]) {
          updatedRecords[selectedDate][meal] = updatedRecords[selectedDate][
            meal
          ].filter((food) => food.id !== foodId);
          setDailyRecords(updatedRecords);
          console.log("✅ 음식 삭제 성공!");
        }
        return true;
      } else {
        alert("삭제할 항목을 찾을 수 없습니다.");
        return false;
      }
    } catch (error) {
      console.error("❌ 음식 삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
      return false;
    }
  };

  // 운동 여부 토글
  const toggleWorkoutDay = async (selectedDate: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // user_profiles의 id 가져오기
      const profileId = await getUserProfileId(user.id);
      if (!profileId) {
        console.error("User profile not found");
        return false;
      }

      const updatedRecords = { ...dailyRecords };
      if (!updatedRecords[selectedDate]) {
        updatedRecords[selectedDate] = {
          breakfast: [],
          lunch: [],
          dinner: [],
          isWorkoutDay: false,
          hasCardio: false,
          hasStrength: false,
        };
      }

      const newWorkoutStatus = !updatedRecords[selectedDate].isWorkoutDay;
      updatedRecords[selectedDate].isWorkoutDay = newWorkoutStatus;

      const dbDateString = dateKeyToDateString(selectedDate);

      const { error } = await supabase
        .from("daily_records")
        .update({ is_workout_day: newWorkoutStatus })
        .eq("user_id", profileId)
        .eq("record_date", dbDateString)
        .select();

      if (error) {
        console.error("운동 여부 업데이트 실패:", error);
        updatedRecords[selectedDate].isWorkoutDay = !newWorkoutStatus;
        return false;
      }

      setDailyRecords(updatedRecords);
      return true;
    } catch (error) {
      console.error("❌ 운동 여부 토글 실패:", error);
      return false;
    }
  };

  // 유산소 운동 토글
  const toggleCardio = (selectedDate: string): void => {
    const updatedRecords = { ...dailyRecords };
    if (!updatedRecords[selectedDate]) {
      updatedRecords[selectedDate] = {
        breakfast: [],
        lunch: [],
        dinner: [],
        isWorkoutDay: false,
        hasCardio: false,
        hasStrength: false,
      };
    }
    updatedRecords[selectedDate].hasCardio = !updatedRecords[selectedDate].hasCardio;
    setDailyRecords(updatedRecords);
  };

  // 근력 운동 토글
  const toggleStrength = (selectedDate: string): void => {
    const updatedRecords = { ...dailyRecords };
    if (!updatedRecords[selectedDate]) {
      updatedRecords[selectedDate] = {
        breakfast: [],
        lunch: [],
        dinner: [],
        isWorkoutDay: false,
        hasCardio: false,
        hasStrength: false,
      };
    }
    updatedRecords[selectedDate].hasStrength = !updatedRecords[selectedDate].hasStrength;
    setDailyRecords(updatedRecords);
  };

  return {
    // 상태
    dailyRecords,

    // 유틸리티
    getDayRecord,
    getTotalProtein,

    // 액션
    loadDailyRecords,
    addFoodToMeal,
    addDirectFoodToMeal,
    removeFoodFromMeal,
    toggleWorkoutDay,
    toggleCardio,
    toggleStrength,
  };
};