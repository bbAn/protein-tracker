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

  // 일일 기록 로드
  const loadDailyRecords = useCallback(async (userId: string) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const koreanDateFrom = getKoreanDateString(thirtyDaysAgo);

      console.log("📅 기록 조회 기간:", { from: koreanDateFrom, userId });

      const { data: records, error: recordsError } = await supabase
        .from("daily_records")
        .select("*")
        .eq("user_id", userId)
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
              hasCardio: record.has_cardio || false,
              hasStrength: record.has_strength || false,
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
          console.log(
            `  ${dateKey}: ${totalItems}개 항목, 유산소: ${dayData.hasCardio}, 근력: ${dayData.hasStrength}`
          );
        });

        setDailyRecords(recordsMap);
      }
    } catch (error) {
      console.error("💥 사용자 데이터 로드 실패:", error);
    }
  }, []);

  // 특정 날짜의 기록 가져오기
  const getDayRecord = (dateString: string): DayRecord => {
    return (
      dailyRecords[dateString] || {
        breakfast: [],
        lunch: [],
        dinner: [],
        hasCardio: false,
        hasStrength: false,
      }
    );
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
      const currentRecord = getDayRecord(selectedDate);
      const dbDateString = dateKeyToDateString(selectedDate);

      console.log("🍽️ 음식 추가:", {
        selectedDate,
        dbDateString,
        meal,
        food: food.name,
        hasCardio: currentRecord.hasCardio,
        hasStrength: currentRecord.hasStrength,
        currentTime: new Date().toLocaleString("ko-KR"),
      });

      const { data, error } = await supabase
        .from("daily_records")
        .insert({
          user_id: user.id,
          record_date: dbDateString,
          meal_type: meal,
          food_name: food.name,
          protein_amount: food.protein,
          has_cardio: currentRecord.hasCardio,
          has_strength: currentRecord.hasStrength,
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
        .eq("user_id", user.id)
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

  // 운동 타입 토글
  const toggleCardio = async (selectedDate: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const updatedRecords = { ...dailyRecords };
      if (!updatedRecords[selectedDate]) {
        updatedRecords[selectedDate] = {
          breakfast: [],
          lunch: [],
          dinner: [],
          hasCardio: false,
          hasStrength: false,
        };
      }

      const newCardioStatus = !updatedRecords[selectedDate].hasCardio;
      updatedRecords[selectedDate].hasCardio = newCardioStatus;

      const dbDateString = dateKeyToDateString(selectedDate);

      const { error } = await supabase
        .from("daily_records")
        .update({ has_cardio: newCardioStatus })
        .eq("user_id", user.id)
        .eq("record_date", dbDateString)
        .select();

      if (error) {
        console.error("유산소 업데이트 실패:", error);
        updatedRecords[selectedDate].hasCardio = !newCardioStatus;
        return false;
      }

      setDailyRecords(updatedRecords);
      console.log("✅ 유산소 변경 성공:", newCardioStatus);
      return true;
    } catch (error) {
      console.error("❌ 유산소 변경 실패:", error);
      return false;
    }
  };

  const toggleStrength = async (selectedDate: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const updatedRecords = { ...dailyRecords };
      if (!updatedRecords[selectedDate]) {
        updatedRecords[selectedDate] = {
          breakfast: [],
          lunch: [],
          dinner: [],
          hasCardio: false,
          hasStrength: false,
        };
      }

      const newStrengthStatus = !updatedRecords[selectedDate].hasStrength;
      updatedRecords[selectedDate].hasStrength = newStrengthStatus;

      const dbDateString = dateKeyToDateString(selectedDate);

      const { error } = await supabase
        .from("daily_records")
        .update({ has_strength: newStrengthStatus })
        .eq("user_id", user.id)
        .eq("record_date", dbDateString)
        .select();

      if (error) {
        console.error("근력운동 업데이트 실패:", error);
        updatedRecords[selectedDate].hasStrength = !newStrengthStatus;
        return false;
      }

      setDailyRecords(updatedRecords);
      console.log("✅ 근력운동 변경 성공:", newStrengthStatus);
      return true;
    } catch (error) {
      console.error("❌ 근력운동 변경 실패:", error);
      return false;
    }
  };

  // 직접 입력으로 음식 추가
  const addDirectFoodToMeal = async (
    meal: MealType,
    foodName: string,
    proteinAmount: number,
    selectedDate: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const currentRecord = getDayRecord(selectedDate);
      const dbDateString = dateKeyToDateString(selectedDate);

      console.log("🍽️ 직접 입력 음식 추가:", {
        selectedDate,
        dbDateString,
        meal,
        foodName,
        proteinAmount,
        hasCardio: currentRecord.hasCardio,
        hasStrength: currentRecord.hasStrength,
      });

      const { data, error } = await supabase
        .from("daily_records")
        .insert({
          user_id: user.id,
          record_date: dbDateString,
          meal_type: meal,
          food_name: foodName,
          protein_amount: proteinAmount,
          has_cardio: currentRecord.hasCardio,
          has_strength: currentRecord.hasStrength,
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
      console.log("✅ 직접 입력 음식 추가 성공!");
      return true;
    } catch (error) {
      console.error("❌ 직접 입력 음식 추가 실패:", error);
      alert("음식 추가 중 오류가 발생했습니다.");
      return false;
    }
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
    toggleCardio,
    toggleStrength,
  };
};
