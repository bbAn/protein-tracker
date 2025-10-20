import { useCallback, useState } from "react";
import { supabase } from "../../lib/supabase";
import { DEFAULT_BODY_WEIGHT, PROTEIN_GOALS } from "../constants";
import { Gender, ProteinGoal, SupabaseUser } from "../types";

export const useBodyWeight = (user: SupabaseUser | null) => {
  const [bodyWeight, setBodyWeight] = useState<number>(DEFAULT_BODY_WEIGHT);
  const [tempBodyWeight, setTempBodyWeight] = useState<string>(
    String(DEFAULT_BODY_WEIGHT)
  );
  const [proteinGoal, setProteinGoal] = useState<ProteinGoal>("maintain");
  const [gender, setGender] = useState<Gender>("male");

  // 사용자 프로필 로드 - auth_id 기반
  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      console.log("👤 프로필 조회 시작:", userId);

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("auth_id", userId)
        .single();

      console.log("👤 프로필 조회 결과:", { profile, profileError });

      if (profileError) {
        console.error("프로필 로드 에러:", profileError);
      } else if (profile) {
        const weight = profile.body_weight || DEFAULT_BODY_WEIGHT;

        // 기본값 및 호환성 처리
        let userGoal = profile.protein_goal as ProteinGoal;
        if (!userGoal || !["diet", "maintain", "bulk"].includes(userGoal)) {
          // "general", "cut", "build" 같은 이전 값들을 "maintain"으로 변환
          userGoal = "maintain";
        }

        // gender 기본값
        let userGender = (profile.gender as Gender) || "male";
        if (userGender !== "male" && userGender !== "female") {
          userGender = "male";
        }

        setBodyWeight(weight);
        setTempBodyWeight(String(weight));
        setGender(userGender);
        setProteinGoal(userGoal);
        console.log("✅ 프로필 로드 성공:", {
          weight,
          gender: userGender,
          goal: userGoal,
        });
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  }, []);

  // 체중 업데이트 - auth_id 기반
  const updateBodyWeight = async (newWeight: number): Promise<boolean> => {
    if (!user || newWeight <= 0) return false;

    console.log("💪 체중 업데이트 시작:", { userId: user.id, newWeight });

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ body_weight: newWeight })
        .eq("auth_id", user.id);

      console.log("📝 체중 업데이트 결과:", { error });

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

  // 목표 단백질량 계산 (운동 타입에 따라)
  const getTargetProtein = (
    hasCardio: boolean,
    hasStrength: boolean
  ): number => {
    try {
      const currentGender = gender || "male";
      const currentGoal = proteinGoal || "maintain";

      if (
        !PROTEIN_GOALS[currentGender] ||
        !PROTEIN_GOALS[currentGender][currentGoal]
      ) {
        return bodyWeight * (hasStrength ? 2.0 : 1.2);
      }

      const multipliers = PROTEIN_GOALS[currentGender][currentGoal];

      if (hasStrength) {
        return bodyWeight * multipliers.workout;
      }
      return bodyWeight * multipliers.normal;
    } catch (error) {
      console.error("❌ 단백질 계산 오류:", error);
      return bodyWeight * (hasStrength ? 2.0 : 1.2);
    }
  };

  // 성별 업데이트
  const updateGender = async (newGender: Gender): Promise<boolean> => {
    console.log("👤 성별 업데이트 시작:", newGender);

    // 로컬 상태는 즉시 업데이트
    setGender(newGender);

    if (!user) {
      return true;
    }

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ gender: newGender })
        .eq("auth_id", user.id);

      console.log("📝 성별 업데이트 결과:", { error });

      if (error) throw error;

      console.log("✅ 성별 업데이트 성공:", newGender);
      return true;
    } catch (error) {
      console.error("❌ 성별 업데이트 실패:", error);
      alert("성별 업데이트 실패: " + (error as Error)?.message);
      return false;
    }
  };

  // 단백질 목적 업데이트
  const updateProteinGoal = async (newGoal: ProteinGoal): Promise<boolean> => {
    console.log("🎯 단백질 목표 업데이트 시작:", newGoal);

    // 로컬 상태는 즉시 업데이트
    setProteinGoal(newGoal);

    if (!user) {
      return true;
    }

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ protein_goal: newGoal })
        .eq("auth_id", user.id);

      console.log("📝 단백질 목표 업데이트 결과:", { error });

      if (error) throw error;

      console.log("✅ 단백질 목표 업데이트 성공:", newGoal);
      return true;
    } catch (error) {
      console.error("❌ 단백질 목표 업데이트 실패:", error);
      alert("단백질 목표 업데이트 실패: " + (error as Error)?.message);
      return false;
    }
  };

  // 현재 설정된 단백질 목표의 배수 가져오기
  const getProteinMultipliers = () => {
    const multipliers = PROTEIN_GOALS[gender][proteinGoal];
    return {
      normal: multipliers.normal,
      workout: multipliers.workout,
      name: multipliers.name,
      icon: multipliers.icon,
      description: multipliers.description,
    };
  };

  // 로그아웃 시 초기화
  const resetBodyWeight = (): void => {
    setBodyWeight(DEFAULT_BODY_WEIGHT);
    setTempBodyWeight(String(DEFAULT_BODY_WEIGHT));
    setProteinGoal("maintain");
    setGender("male");
  };

  return {
    // 상태
    bodyWeight,
    tempBodyWeight,
    proteinGoal,
    gender,

    // 상태 변경
    setTempBodyWeight,

    // 액션
    loadUserProfile,
    updateBodyWeight,
    handleBodyWeightSubmit,
    getTargetProtein,
    updateGender,
    updateProteinGoal,
    getProteinMultipliers,
    resetBodyWeight,
  };
};
