import { useCallback, useState } from "react";
import { supabase } from "../../lib/supabase";
import { SupabaseUser } from "../types";
import { DEFAULT_BODY_WEIGHT, PROTEIN_MULTIPLIERS } from "../constants";

export const useBodyWeight = (user: SupabaseUser | null) => {
  const [bodyWeight, setBodyWeight] = useState<number>(DEFAULT_BODY_WEIGHT);
  const [tempBodyWeight, setTempBodyWeight] = useState<string>(
    String(DEFAULT_BODY_WEIGHT)
  );

  // 사용자 프로필 로드
  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase.rpc(
        "get_user_profile",
        {
          p_user_id: userId,
        }
      );

      console.log("👤 프로필 조회 결과:", { profile, profileError });

      if (profileError) {
        console.error("프로필 로드 에러:", profileError);
      } else if (profile && profile.length > 0) {
        const userProfile = profile[0];
        const weight = userProfile.body_weight || DEFAULT_BODY_WEIGHT;
        setBodyWeight(weight);
        setTempBodyWeight(String(weight));
        console.log("✅ 프로필 로드 성공:", userProfile);
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  }, []);

  // 체중 업데이트
  const updateBodyWeight = async (newWeight: number): Promise<boolean> => {
    if (!user || newWeight <= 0) return false;

    console.log("💪 체중 업데이트 시작:", { userId: user.id, newWeight });

    try {
      const { data, error } = await supabase.rpc("update_user_weight", {
        p_user_id: user.id,
        p_new_weight: newWeight,
      });

      console.log("📝 체중 업데이트 결과:", { data, error });

      if (error) throw error;

      setBodyWeight(newWeight);
      setTempBodyWeight(String(newWeight));
      console.log("✅ 체중 업데이트 성공!");
      return true;
    } catch (error) {
      console.error("❌ 체중 업데이트 실패:", error);
      setTempBodyWeight(String(bodyWeight));
      alert("체중 업데이트 실패: " + (error as Error)?.message);
      return false;
    }
  };

  // 체중 입력 완료 처리
  const handleBodyWeightSubmit = (): void => {
    const newWeight = parseFloat(tempBodyWeight);
    if (isNaN(newWeight) || newWeight <= 0) {
      setTempBodyWeight(String(bodyWeight));
      alert("올바른 체중을 입력해주세요.");
      return;
    }
    updateBodyWeight(newWeight);
  };

  // 목표 단백질량 계산
  const getTargetProtein = (isWorkoutDay: boolean): number => {
    return isWorkoutDay
      ? bodyWeight * PROTEIN_MULTIPLIERS.workout
      : bodyWeight * PROTEIN_MULTIPLIERS.normal;
  };

  // 로그아웃 시 초기화
  const resetBodyWeight = (): void => {
    setBodyWeight(DEFAULT_BODY_WEIGHT);
    setTempBodyWeight(String(DEFAULT_BODY_WEIGHT));
  };

  return {
    // 상태
    bodyWeight,
    tempBodyWeight,

    // 상태 변경
    setTempBodyWeight,

    // 액션
    loadUserProfile,
    updateBodyWeight,
    handleBodyWeightSubmit,
    getTargetProtein,
    resetBodyWeight,
  };
};
