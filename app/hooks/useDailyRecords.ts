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
              isWorkoutDay: record.is_workout_day,
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

        // 중복 데이터 정리 (백그라운드)
        // setTimeout(() => removeDuplicateRecords(userId), 2000);
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
        isWorkoutDay: false,
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

  // 운동 여부 토글
  const toggleWorkoutDay = async (selectedDate: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const updatedRecords = { ...dailyRecords };
      if (!updatedRecords[selectedDate]) {
        updatedRecords[selectedDate] = {
          breakfast: [],
          lunch: [],
          dinner: [],
          isWorkoutDay: false,
        };
      }

      const newWorkoutStatus = !updatedRecords[selectedDate].isWorkoutDay;
      updatedRecords[selectedDate].isWorkoutDay = newWorkoutStatus;

      const dbDateString = dateKeyToDateString(selectedDate);

      const { error } = await supabase
        .from("daily_records")
        .update({ is_workout_day: newWorkoutStatus })
        .eq("user_id", user.id)
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

  // 중복 데이터 제거
  // const removeDuplicateRecords = async (userId?: string): Promise<void> => {
  //   const targetUserId = userId || user?.id;
  //   if (!targetUserId) return;

  //   try {
  //     console.log("🧹 중복 데이터 정리 시작...");

  //     const sevenDaysAgo = new Date();
  //     sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  //     const dateFrom = getKoreanDateString(sevenDaysAgo);

  //     const { data: allRecords, error } = await supabase
  //       .from("daily_records")
  //       .select("*")
  //       .eq("user_id", targetUserId)
  //       .gte("record_date", dateFrom)
  //       .order("created_at", { ascending: true });

  //     if (error || !allRecords) {
  //       console.log("중복 정리 스킵:", error);
  //       return;
  //     }

  //     const seen = new Set<string>();
  //     const duplicates: number[] = [];

  //     allRecords.forEach((record) => {
  //       const key = `${record.record_date}-${record.meal_type}-${record.food_name}-${record.protein_amount}`;
  //       if (seen.has(key)) {
  //         duplicates.push(record.id);
  //         console.log("🔍 중복 발견:", {
  //           id: record.id,
  //           date: record.record_date,
  //           meal: record.meal_type,
  //           food: record.food_name,
  //         });
  //       } else {
  //         seen.add(key);
  //       }
  //     });

  //     if (duplicates.length > 0) {
  //       console.log(`🗑️ ${duplicates.length}개 중복 데이터 삭제 중...`);

  //       const { error: deleteError } = await supabase
  //         .from("daily_records")
  //         .delete()
  //         .in("id", duplicates);

  //       if (deleteError) {
  //         console.error("중복 삭제 실패:", deleteError);
  //       } else {
  //         console.log("✅ 중복 데이터 정리 완료!");
  //         await loadDailyRecords(targetUserId);
  //       }
  //     } else {
  //       console.log("✅ 중복 데이터 없음");
  //     }
  //   } catch (error) {
  //     console.error("중복 정리 중 오류:", error);
  //   }
  // };

  return {
    // 상태
    dailyRecords,

    // 유틸리티
    getDayRecord,
    getTotalProtein,

    // 액션
    loadDailyRecords,
    addFoodToMeal,
    removeFoodFromMeal,
    toggleWorkoutDay,
    // removeDuplicateRecords,
  };
};
