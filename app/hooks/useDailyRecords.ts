import { useCallback, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { withTimeout } from "../../lib/withTimeout";
import {
  BodyWeightRecord,
  DailyRecord,
  DayRecord,
  FoodItem,
  MealType,
  PeriodRecord,
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
  snack: [],
  dinner: [],
  postWorkout: [],
  supplements: {
    breakfast: [],
    lunch: [],
    snack: [],
    dinner: [],
    postWorkout: [],
  },
  hasCardio: false,
  hasStrength: false,
  isPeriod: false,
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
  const [weightHistory, setWeightHistory] = useState<
    { date: string; weight: number }[]
  >([]);

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

  // 최근 N일간의 체중 기록 (체중 추이 그래프용, 월 단위 로딩과 무관하게 항상 최근 구간을 봄)
  const loadWeightHistory = useCallback(
    async (authUserId: string, days = 30) => {
      const profileId = await getUserProfileId(authUserId);
      if (!profileId) return;

      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceDateString = getKoreanDateString(since);

      try {
        const { data, error } = await supabase
          .from("body_weight_records")
          .select("record_date, weight")
          .eq("user_id", profileId)
          .gte("record_date", sinceDateString)
          .order("record_date", { ascending: true });

        if (error) throw error;

        if (data) {
          setWeightHistory(
            data.map((r) => ({ date: r.record_date, weight: r.weight }))
          );
        }
      } catch (error) {
        console.error("체중 히스토리 로드 실패:", error);
      }
    },
    [getUserProfileId]
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
          { data: weightRecords, error: weightError },
          { data: periodRecords, error: periodError },
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
            supabase
              .from("body_weight_records")
              .select("*")
              .eq("user_id", profileId)
              .gte("record_date", monthStart)
              .lt("record_date", monthEnd),
            supabase
              .from("period_records")
              .select("*")
              .eq("user_id", profileId)
              .gte("record_date", monthStart)
              .lt("record_date", monthEnd),
          ]),
          timeout,
        ]);

        if (recordsError) console.error("일일 기록 조회 실패:", recordsError);
        if (supplementError)
          console.error("영양제 기록 조회 실패:", supplementError);
        if (weightError) console.error("체중 기록 조회 실패:", weightError);
        if (periodError) console.error("생리기간 기록 조회 실패:", periodError);

        if (records || supplementRecords || weightRecords || periodRecords) {
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

            weightRecords?.forEach((record: BodyWeightRecord) => {
              const dateKey = dateStringToDateKey(record.record_date);

              if (!recordsMap[dateKey]) {
                recordsMap[dateKey] = emptyDayRecord();
              }
              recordsMap[dateKey].bodyWeight = record.weight;
            });

            periodRecords?.forEach((record: PeriodRecord) => {
              const dateKey = dateStringToDateKey(record.record_date);

              if (!recordsMap[dateKey]) {
                recordsMap[dateKey] = emptyDayRecord();
              }
              recordsMap[dateKey].isPeriod = true;
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
    return [
      ...record.breakfast,
      ...record.lunch,
      ...record.snack,
      ...record.dinner,
      ...record.postWorkout,
    ].reduce((total, food) => total + food.protein, 0);
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
    const updatedRecords = { ...dailyRecords };
    if (!updatedRecords[selectedDate]) {
      updatedRecords[selectedDate] = emptyDayRecord();
    }
    const newStatus = !updatedRecords[selectedDate].hasStrength;
    updatedRecords[selectedDate].hasStrength = newStatus;
    setDailyRecords(updatedRecords);

    // DB 업데이트
    await updateWorkoutStatus(selectedDate, { has_strength: newStatus });
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

  // 생리기간 토글 (행 존재 여부로 표시: insert/delete)
  const togglePeriod = async (selectedDate: string): Promise<void> => {
    if (!user) return;

    const updatedRecords = { ...dailyRecords };
    if (!updatedRecords[selectedDate]) {
      updatedRecords[selectedDate] = emptyDayRecord();
    }
    const newStatus = !updatedRecords[selectedDate].isPeriod;
    updatedRecords[selectedDate] = {
      ...updatedRecords[selectedDate],
      isPeriod: newStatus,
    };
    setDailyRecords(updatedRecords);

    try {
      const profileId = await getUserProfileId(user.id);
      if (!profileId) {
        alert("사용자 프로필을 찾을 수 없습니다.");
        return;
      }

      const dbDateString = dateKeyToDateString(selectedDate);

      if (newStatus) {
        const { error } = await supabase
          .from("period_records")
          .insert({ user_id: profileId, record_date: dbDateString });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("period_records")
          .delete()
          .eq("user_id", profileId)
          .eq("record_date", dbDateString);
        if (error) throw error;
      }
    } catch (error) {
      console.error("❌ 생리기간 토글 실패:", error);
      alert("생리기간 기록 중 오류가 발생했습니다.");
    }
  };

  // dateKey 기준 하루씩 앞뒤로 훑어서, 선택한 날짜가 포함된 연속된
  // 생리기간 구간을 찾음 (입력창을 기존 기간으로 채워주기 위함)
  const getPeriodRangeForDate = (
    dateKey: string
  ): { start: string; end: string } | null => {
    if (!dailyRecords[dateKey]?.isPeriod) return null;

    let start = new Date(dateKey);
    while (true) {
      const prev = new Date(start.getTime() - 86400000);
      if (!dailyRecords[prev.toDateString()]?.isPeriod) break;
      start = prev;
    }

    let end = new Date(dateKey);
    while (true) {
      const next = new Date(end.getTime() + 86400000);
      if (!dailyRecords[next.toDateString()]?.isPeriod) break;
      end = next;
    }

    return {
      start: dateKeyToDateString(start.toDateString()),
      end: dateKeyToDateString(end.toDateString()),
    };
  };

  // YYYY-MM-DD 문자열 범위(양 끝 포함)를 UTC 기준으로 하루씩 나열
  const enumerateDateStrings = (
    startDateString: string,
    endDateString: string
  ): string[] => {
    const [sy, sm, sd] = startDateString.split("-").map(Number);
    const [ey, em, ed] = endDateString.split("-").map(Number);
    const startUTC = Date.UTC(sy, sm - 1, sd);
    const endUTC = Date.UTC(ey, em - 1, ed);

    const dateStrings: string[] = [];
    for (let t = startUTC; t <= endUTC; t += 86400000) {
      const d = new Date(t);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      dateStrings.push(`${y}-${m}-${day}`);
    }
    return dateStrings;
  };

  // 생리기간을 시작일~종료일로 한 번에 기록 (양 끝 날짜 포함, YYYY-MM-DD 문자열).
  // oldStart/oldEnd를 함께 주면 그 구간을 먼저 지우고 새 구간으로 대체함
  // (기존에 기록한 기간을 수정하는 경우)
  const setPeriodRange = async (
    startDateString: string,
    endDateString: string,
    oldStartDateString?: string,
    oldEndDateString?: string
  ): Promise<boolean> => {
    if (!user) return false;

    const [sy, sm, sd] = startDateString.split("-").map(Number);
    const [ey, em, ed] = endDateString.split("-").map(Number);
    const startUTC = Date.UTC(sy, sm - 1, sd);
    const endUTC = Date.UTC(ey, em - 1, ed);

    if (isNaN(startUTC) || isNaN(endUTC) || startUTC > endUTC) {
      alert("올바른 기간을 입력해주세요.");
      return false;
    }

    const daySpan = (endUTC - startUTC) / 86400000 + 1;
    if (
      daySpan > 60 &&
      !confirm(`${daySpan}일 기간을 기록하려고 합니다. 계속할까요?`)
    ) {
      return false;
    }

    const dateStrings = enumerateDateStrings(startDateString, endDateString);
    const oldDateStrings =
      oldStartDateString && oldEndDateString
        ? enumerateDateStrings(oldStartDateString, oldEndDateString)
        : [];

    try {
      const profileId = await getUserProfileId(user.id);
      if (!profileId) {
        alert("사용자 프로필을 찾을 수 없습니다.");
        return false;
      }

      if (oldDateStrings.length > 0) {
        const { error: deleteError } = await supabase
          .from("period_records")
          .delete()
          .eq("user_id", profileId)
          .gte("record_date", oldDateStrings[0])
          .lte("record_date", oldDateStrings[oldDateStrings.length - 1]);
        if (deleteError) throw deleteError;
      }

      const { error } = await supabase.from("period_records").upsert(
        dateStrings.map((record_date) => ({
          user_id: profileId,
          record_date,
        })),
        { onConflict: "user_id,record_date" }
      );

      if (error) throw error;

      const updatedRecords = { ...dailyRecords };
      oldDateStrings.forEach((dateStr) => {
        const dateKey = dateStringToDateKey(dateStr);
        if (updatedRecords[dateKey]) {
          updatedRecords[dateKey] = {
            ...updatedRecords[dateKey],
            isPeriod: false,
          };
        }
      });
      dateStrings.forEach((dateStr) => {
        const dateKey = dateStringToDateKey(dateStr);
        if (!updatedRecords[dateKey]) {
          updatedRecords[dateKey] = emptyDayRecord();
        }
        updatedRecords[dateKey] = {
          ...updatedRecords[dateKey],
          isPeriod: true,
        };
      });
      setDailyRecords(updatedRecords);

      return true;
    } catch (error) {
      console.error("❌ 생리기간 범위 기록 실패:", error);
      alert(
        "생리기간 기록 중 오류가 발생했습니다: " + (error as Error)?.message
      );
      return false;
    }
  };

  // 특정 날짜의 체중 기록
  const setBodyWeightForDate = async (
    selectedDate: string,
    weight: number
  ): Promise<boolean> => {
    if (!user || isNaN(weight) || weight <= 0) return false;

    try {
      const profileId = await getUserProfileId(user.id);
      if (!profileId) {
        alert("사용자 프로필을 찾을 수 없습니다.");
        return false;
      }

      const dbDateString = dateKeyToDateString(selectedDate);

      const { error } = await supabase.from("body_weight_records").upsert(
        {
          user_id: profileId,
          record_date: dbDateString,
          weight,
        },
        { onConflict: "user_id,record_date" }
      );

      if (error) throw error;

      const updatedRecords = { ...dailyRecords };
      if (!updatedRecords[selectedDate]) {
        updatedRecords[selectedDate] = emptyDayRecord();
      }
      updatedRecords[selectedDate] = {
        ...updatedRecords[selectedDate],
        bodyWeight: weight,
      };
      setDailyRecords(updatedRecords);

      // 체중 추이 그래프용 히스토리에도 반영
      setWeightHistory((prev) => {
        const filtered = prev.filter((w) => w.date !== dbDateString);
        return [...filtered, { date: dbDateString, weight }].sort((a, b) =>
          a.date.localeCompare(b.date)
        );
      });

      return true;
    } catch (error) {
      console.error("❌ 체중 기록 실패:", error);
      alert("체중 기록 중 오류가 발생했습니다: " + (error as Error)?.message);
      return false;
    }
  };

  // 로그아웃 시 초기화 (캐시된 프로필 ID와 로드된 달 기록을 남겨두면
  // 다른 계정으로 재로그인했을 때 이전 계정의 데이터를 그대로 써버림)
  const resetDailyRecords = (): void => {
    setDailyRecords({});
    setUserProfileId(null);
    setWeightHistory([]);
    loadedMonthsRef.current.clear();
  };

  return {
    // 상태
    dailyRecords,
    isLoadingMonth,
    weightHistory,

    // 유틸리티
    getDayRecord,
    getTotalProtein,
    getPeriodRangeForDate,

    // 액션
    loadMonth,
    loadWeightHistory,
    addFoodToMeal,
    addDirectFoodToMeal,
    removeFoodFromMeal,
    addSupplement,
    removeSupplement,
    toggleCardio,
    toggleStrength,
    togglePeriod,
    setPeriodRange,
    setBodyWeightForDate,
    resetDailyRecords,
  };
};
