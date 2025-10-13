import { useCallback, useState } from "react";
import { supabase } from "../../lib/supabase";
import { DEFAULT_FOODS } from "../constants";
import { CalcResult, FoodItem, SupabaseUser } from "../types";

export const useFood = (user: SupabaseUser | null) => {
  const [foodDatabase, setFoodDatabase] = useState<FoodItem[]>(DEFAULT_FOODS);
  const [editingFood, setEditingFood] = useState<number | null>(null);
  const [newFood, setNewFood] = useState<{ name: string; protein: string }>({
    name: "",
    protein: "",
  });
  const [userProfileId, setUserProfileId] = useState<string | null>(null);

  // 계산기 상태
  const [calcFood, setCalcFood] = useState<string>("");
  const [calcAmount, setCalcAmount] = useState<string>("");
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);

  // user_profiles의 id 가져오기
  const getUserProfileId = useCallback(
    async (authUserId: string): Promise<string | null> => {
      if (userProfileId) return userProfileId;

      try {
        console.log("🔍 프로필 ID 조회 시작:", authUserId);
        const { data: profile, error } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("auth_id", authUserId)
          .single();

        console.log("📝 프로필 ID 조회 결과:", { profile, error });

        if (error) throw error;

        if (profile) {
          setUserProfileId(profile.id);
          console.log("✅ 프로필 ID 저장:", profile.id);
          return profile.id;
        }
      } catch (error) {
        console.error("❌ 프로필 ID 조회 실패:", error);
      }
      return null;
    },
    [userProfileId]
  );

  // 음식 데이터베이스 로드
  const loadFoodDatabase = useCallback(
    async (authUserId: string) => {
      try {
        console.log("🍔 음식 DB 로드 시작");
        // user_profiles의 id 가져오기
        const profileId = await getUserProfileId(authUserId);
        if (!profileId) {
          console.error("❌ User profile not found");
          return;
        }

        const { data: foods, error } = await supabase
          .from("food_database")
          .select("*")
          .or(`is_default.eq.true,user_id.eq.${profileId}`);

        console.log("📝 음식 DB 조회 결과:", { foods, error });

        if (error) throw error;

        if (foods) {
          setFoodDatabase(foods);
          console.log("✅ 음식 DB 로드 완료:", foods.length, "개");
        }
      } catch (error) {
        console.error("❌ 음식 DB 로드 실패:", error);
      }
    },
    [getUserProfileId]
  );

  // 새 음식 추가
  const addNewFood = async (): Promise<boolean> => {
    console.log("➕ 음식 추가 시작:", { newFood, user });

    if (!newFood.name || !newFood.protein) {
      alert("음식명과 단백질량을 입력해주세요.");
      return false;
    }

    if (!user) {
      alert("로그인이 필요합니다.");
      return false;
    }

    const proteinAmount = parseFloat(newFood.protein);
    if (isNaN(proteinAmount) || proteinAmount <= 0) {
      alert("올바른 단백질량을 입력해주세요.");
      return false;
    }

    try {
      // user_profiles의 id 가져오기
      const profileId = await getUserProfileId(user.id);
      console.log("📝 사용할 프로필 ID:", profileId);

      if (!profileId) {
        alert("사용자 프로필을 찾을 수 없습니다.");
        return false;
      }

      console.log("🔄 INSERT 시작:", {
        user_id: profileId,
        name: newFood.name,
        protein: proteinAmount,
        is_default: false,
      });

      const { data, error } = await supabase
        .from("food_database")
        .insert({
          user_id: profileId,
          name: newFood.name,
          protein: proteinAmount,
          is_default: false,
        })
        .select()
        .single();

      console.log("📝 음식 추가 결과:", { data, error });

      if (error) {
        console.error("❌ INSERT 에러 상세:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      if (!data) {
        console.error("❌ 데이터가 반환되지 않음");
        throw new Error("음식이 추가되었지만 데이터가 반환되지 않았습니다.");
      }

      // 로컬 상태 업데이트
      setFoodDatabase([...foodDatabase, data]);
      setNewFood({ name: "", protein: "" });

      console.log("✅ 음식 추가 완료:", data);
      alert("음식이 추가되었습니다!");
      return true;
    } catch (error) {
      console.error("❌ 음식 추가 실패 (catch):", error);
      console.error("❌ 에러 타입:", typeof error);
      console.error("❌ 에러 전체:", JSON.stringify(error, null, 2));
      alert("음식 추가 중 오류가 발생했습니다: " + (error as Error)?.message);
      return false;
    }
  };

  // 음식 삭제
  const deleteFood = async (id: number): Promise<boolean> => {
    console.log("🗑️ 음식 삭제 시작:", id);

    if (!user) {
      alert("로그인이 필요합니다.");
      return false;
    }

    // 삭제 확인
    if (!confirm("이 음식을 삭제하시겠습니까?")) {
      return false;
    }

    try {
      // user_profiles의 id 가져오기
      const profileId = await getUserProfileId(user.id);
      console.log("📝 사용할 프로필 ID:", profileId);

      if (!profileId) {
        alert("사용자 프로필을 찾을 수 없습니다.");
        return false;
      }

      const { error } = await supabase
        .from("food_database")
        .delete()
        .eq("id", id)
        .eq("user_id", profileId);

      console.log("📝 음식 삭제 결과:", { error });

      if (error) throw error;

      // 로컬 상태 업데이트
      setFoodDatabase(foodDatabase.filter((food) => food.id !== id));

      console.log("✅ 음식 삭제 완료");
      return true;
    } catch (error) {
      console.error("❌ 음식 삭제 실패:", error);
      alert("음식 삭제 중 오류가 발생했습니다: " + (error as Error)?.message);
      return false;
    }
  };

  // 음식 수정
  const updateFood = async (
    id: number,
    updatedFood: Partial<FoodItem>
  ): Promise<boolean> => {
    console.log("✏️ 음식 수정 시작:", { id, updatedFood });

    if (!user) {
      alert("로그인이 필요합니다.");
      return false;
    }

    try {
      // user_profiles의 id 가져오기
      const profileId = await getUserProfileId(user.id);
      if (!profileId) {
        alert("사용자 프로필을 찾을 수 없습니다.");
        return false;
      }

      const { error } = await supabase
        .from("food_database")
        .update(updatedFood)
        .eq("id", id)
        .eq("user_id", profileId);

      console.log("📝 음식 수정 결과:", { error });

      if (error) throw error;

      // 로컬 상태 업데이트
      setFoodDatabase(
        foodDatabase.map((food) =>
          food.id === id ? { ...food, ...updatedFood } : food
        )
      );

      // 편집 모드 종료
      setEditingFood(null);

      console.log("✅ 음식 수정 완료");
      return true;
    } catch (error) {
      console.error("❌ 음식 수정 실패:", error);
      alert("음식 수정 중 오류가 발생했습니다: " + (error as Error)?.message);
      return false;
    }
  };

  // 계산기 기능
  const calculateProtein = (): void => {
    const food = foodDatabase.find(
      (f) => f.name.toLowerCase() === calcFood.toLowerCase()
    );
    const amount = parseFloat(calcAmount);

    if (!food || isNaN(amount) || amount <= 0) {
      alert("올바른 음식과 수량을 입력해주세요.");
      return;
    }

    const protein = ((food.protein * amount) / 100).toFixed(1);
    setCalcResult({
      food: food.name,
      amount: calcAmount,
      protein,
    });
  };

  const resetCalculator = (): void => {
    setCalcFood("");
    setCalcAmount("");
    setCalcResult(null);
  };

  return {
    // 상태
    foodDatabase,
    editingFood,
    newFood,
    calcFood,
    calcAmount,
    calcResult,

    // 상태 변경
    setEditingFood,
    setNewFood,
    setCalcFood,
    setCalcAmount,

    // 액션
    loadFoodDatabase,
    addNewFood,
    deleteFood,
    updateFood,
    calculateProtein,
    resetCalculator,
  };
};
