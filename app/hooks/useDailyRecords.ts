import { useCallback, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { withTimeout } from "../../lib/withTimeout";
import {
  DailyRecord,
  DayRecord,
  FoodItem,
  MealType,
  SupabaseUser,
  SupplementRecord,
} from "../types";
import {
  dateKeyToDateString,
  dateStringToDateKey,
  getKoreanDateString,
} from "../utils/dateUtils";

const monthKey = (year: number, month: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}`;

const emptyDayRecord = (): DayRecord => ({
  breakfast: [],
  lunch: [],
  dinner: [],
  supplements: { breakfast: [], lunch: [], dinner: [] },
  hasCardio: false,
  hasStrength: false,
});

export const useDailyRecords = (
  user: SupabaseUser | null,
  foodDatabase: FoodItem[]
) => {
  const [dailyRecords, setDailyRecords] = useState<Record<string, DayRecord>>(
    {}
  );
  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  // state 대신 ref: 동기적으로 즉시 반영돼야 개발 모드 StrictMode의 이중 effect
  // 호출처럼 짧은 시간 안에 같은 달이 두 번 요청되는 것을 막을 수 있음
  const loadedMonthsRef = useRef<Set<string>>(new Set());
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);

  // user_profiles의 id 가져오기 (daily_records의 user_id로 사용)
  const getUserProfileId = useCallback(
    async (authUserId: string): Promise<string | null> => {
      if (userProfileId) return userProfileId;

      try {
        const { data: profile } = await withTimeout(
          supabase
            .from("user_profiles")
            .select("id")
            .eq("auth_id", authUserId)
            .single(),
          8000,
          "프로필 조회 요청이 시간 초과됐습니다."
        );

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

  // 특정 달의 기록만 로드 (이미 로드한 달이면 재요청하지 않음)
  const loadMonth = useCallback(
    async (authUserId: string, year: number, month: number) => {
      const key = monthKey(year, month);
      if (loadedMonthsRef.current.has(key)) return;
      loadedMonthsRef.current.add(key);

      setIsLoadingMonth(true);
      try {
        const profileId = await getUserProfileId(authUserId);
        if (!profileId) {
          console.error("User profile not found");
          loadedMonthsRef.current.delete(key);
          return;
        }

        const monthStart = getKoreanDateString(new Date(year, month, 1));
        const monthEnd = getKoreanDateString(new Date(year, month + 1, 1));

        // 네트워크 요청이 응답 없이 멈추면 로딩 스피너가 영원히 도는 걸
        // 막기 위한 타임아웃 안전장치
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("기록 조회 요청이 시간 초과됐습니다.")),
            15000
          )
        );

        const [
          { data: records, error: recordsError },
          { data: supplementRecords, error: supplementError },
        ] = await Promise.race([
          Promise.all([
            supabase
              .from("daily_records")
              .select("*")
              .eq("user_id", profileId)
              .gte("record_date", monthStart)
              .lt("record_date", monthEnd)
              .order("record_date", { ascending: false }),
            supabase
              .from("supplement_records")
              .select("*")
              .eq("user_id", profileId)
              .gte("record_date", monthStart)
              .lt("record_date", monthEnd)
              .order("record_date", { ascending: false }),
          ]),
          timeout,
        ]);

        if (recordsError) console.error("일일 기록 조회 실패:", recordsError);
        if (supplementError)
          console.error("영양제 기록 조회 실패:", supplementError);

        if (records || supplementRecords) {
          setDailyRecords((prev) => {
            const recordsMap: Record<string, DayRecord> = { ...prev };

            records?.forEach((record: DailyRecord) => {
              const dateKey = dateStringToDateKey(record.record_date);

              if (!recordsMap[dateKey]) {
                recordsMap[dateKey] = emptyDayRecord();
              }
              recordsMap[dateKey][record.meal_type].push({
                id: record.id,
                name: record.food_name,
                protein: record.protein_amount,
              });
              recordsMap[dateKey].hasCardio = record.has_cardio;
              recordsMap[dateKey].hasStrength = record.has_strength;
            });

            supplementRecords?.forEach((record: SupplementRecord) => {
              const dateKey = dateStringToDateKey(record.record_date);

              if (!recordsMap[dateKey]) {
                recordsMap[dateKey] = emptyDayRecord();
              }
              recordsMap[dateKey].supplements[record.meal_type].push({
                id: record.id,
                name: record.name,
                note: record.note ?? undefined,
              });
            });

            return recordsMap;
          });
        }
      } catch (error) {
        console.error("💥 월별 기록 로드 실패:", error);
        // 실패했으면 다시 시도할 수 있게 로드 완료 표시를 되돌림
        loadedMonthsRef.current.delete(key);
      } finally {
        setIsLoadingMonth(false);
      }
    },
    [getUserProfileId]
  );

  // 특정 날짜의 기록 가져오기
  const getDayRecord = (dateString: string): DayRecord => {
    return dailyRecords[dateString] || emptyDayRecord();
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
          food_name: food.name,
          protein_amount: food.protein,
          has_cardio: currentRecord.hasCardio,
          has_strength: currentRecord.hasStrength,
        })
        .select();

      if (error) throw error;

      const updatedRecords = { ...dailyRecords };
      if (!updatedRecords[selectedDate]) {
        updatedRecords[selectedDate] = {
          ...emptyDayRecord(),
          hasCardio: currentRecord.hasCardio,
          hasStrength: currentRecord.hasStrength,
        };
      }

      const newRecord = data[0];
      updatedRecords[selectedDate][meal].push({
        id: newRecord.id,
        name: food.name,
        protein: food.protein,
      });

      setDailyRecords(updatedRecords);
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
      const profileId = await getUserProfileId(user.id);
      if (!profileId) {
        console.error("User profile not found");
        alert("사용자 프로필을 찾을 수 없습니다.");
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
          has_cardio: currentRecord.hasCardio,
          has_strength: currentRecord.hasStrength,
        })
        .select();

      if (error) throw error;

      const updatedRecords = { ...dailyRecords };
      if (!updatedRecords[selectedDate]) {
        updatedRecords[selectedDate] = {
          ...emptyDayRecord(),
          hasCardio: currentRecord.hasCardio,
          hasStrength: currentRecord.hasStrength,
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
      alert(
        "음식 추가 중 오류가 발생했습니다: " + (error as Error)?.message
      );
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

  // 영양제·건강식품 추가
  const addSupplement = async (
    meal: MealType,
    name: string,
    note: string,
    selectedDate: string
  ): Promise<boolean> => {
    if (!user || !name) return false;

    try {
      const profileId = await getUserProfileId(user.id);
      if (!profileId) {
        console.error("User profile not found");
        alert("사용자 프로필을 찾을 수 없습니다.");
        return false;
      }

      const dbDateString = dateKeyToDateString(selectedDate);

      const { data, error } = await supabase
        .from("supplement_records")
        .insert({
          user_id: profileId,
          record_date: dbDateString,
          meal_type: meal,
          name,
          note: note || null,
        })
        .select();

      if (error) throw error;

      const currentRecord = getDayRecord(selectedDate);
      const updatedRecords = { ...dailyRecords };
      if (!updatedRecords[selectedDate]) {
        updatedRecords[selectedDate] = {
          ...emptyDayRecord(),
          hasCardio: currentRecord.hasCardio,
          hasStrength: currentRecord.hasStrength,
        };
      }

      const newRecord = data[0];
      updatedRecords[selectedDate].supplements[meal].push({
        id: newRecord.id,
        name,
        note: note || undefined,
      });

      setDailyRecords(updatedRecords);
      return true;
    } catch (error) {
      console.error("❌ 영양제 추가 실패:", error);
      alert(
        "영양제 추가 중 오류가 발생했습니다: " + (error as Error)?.message
      );
      return false;
    }
  };

  // 영양제·건강식품 삭제
  const removeSupplement = async (
    meal: MealType,
    supplementId: number,
    selectedDate: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from("supplement_records")
        .delete()
        .eq("id", supplementId)
        .select();

      if (error) {
        console.error("영양제 삭제 실패:", error);
        alert("삭제 중 오류가 발생했습니다: " + error.message);
        return false;
      }

      if (data && data.length > 0) {
        const updatedRecords = { ...dailyRecords };
        if (updatedRecords[selectedDate]) {
          updatedRecords[selectedDate].supplements[meal] = updatedRecords[
            selectedDate
          ].supplements[meal].filter((item) => item.id !== supplementId);
          setDailyRecords(updatedRecords);
        }
        return true;
      } else {
        alert("삭제할 항목을 찾을 수 없습니다.");
        return false;
      }
    } catch (error) {
      console.error("❌ 영양제 삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
      return false;
    }
  };

  // 유산소 운동 토글
  const toggleCardio = async (selectedDate: string): Promise<void> => {
    const updatedRecords = { ...dailyRecords };
    if (!updatedRecords[selectedDate]) {
      updatedRecords[selectedDate] = emptyDayRecord();
    }
    const newStatus = !updatedRecords[selectedDate].hasCardio;
    updatedRecords[selectedDate].hasCardio = newStatus;
    setDailyRecords(updatedRecords);

    // DB 업데이트
    await updateWorkoutStatus(selectedDate, { has_cardio: newStatus });
  };

  // 근력 운동 토글
  const toggleStrength = async (selectedDate: string): Promise<void> => {
    if (!user) return;

    try {
      const updatedRecords = { ...dailyRecords };
      if (!updatedRecords[selectedDate]) {
        updatedRecords[selectedDate] = emptyDayRecord();
      }

      const newStrengthStatus = !updatedRecords[selectedDate].hasStrength;
      updatedRecords[selectedDate].hasStrength = newStrengthStatus;

      const dbDateString = dateKeyToDateString(selectedDate);

      await supabase
        .from("daily_records")
        .update({ has_strength: newStrengthStatus })
        .eq("user_id", user.id)
        .eq("record_date", dbDateString);

      setDailyRecords(updatedRecords);
    } catch (error) {
      console.error("❌ 근력운동 토글 실패:", error);
    }
  };

  // 운동 여부 업데이트 함수
  const updateWorkoutStatus = async (
    selectedDate: string,
    newStatus: Partial<{ has_cardio: boolean; has_strength: boolean }>
  ) => {
    if (!user) return;

    const profileId = await getUserProfileId(user.id);
    if (!profileId) {
      console.error("User profile not found");
      return;
    }

    const dbDateString = dateKeyToDateString(selectedDate);

    try {
      // 해당 날짜의 모든 기록에 대해 운동 여부를 업데이트합니다.
      const { error } = await supabase
        .from("daily_records")
        .update(newStatus)
        .eq("user_id", profileId)
        .eq("record_date", dbDateString);

      if (error) throw error;
    } catch (error) {
      console.error("❌ 운동 상태 DB 업데이트 실패:", error);
      // 여기서 원래 상태로 되돌리는 로직을 추가할 수 있습니다.
      alert("운동 상태 업데이트 중 오류가 발생했습니다.");
    }
  };

  return {
    // 상태
    dailyRecords,
    isLoadingMonth,

    // 유틸리티
    getDayRecord,
    getTotalProtein,

    // 액션
    loadMonth,
    addFoodToMeal,
    addDirectFoodToMeal,
    removeFoodFromMeal,
    addSupplement,
    removeSupplement,
    toggleCardio,
    toggleStrength,
  };
};
