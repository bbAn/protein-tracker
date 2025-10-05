import { useCallback, useState } from "react";
import { supabase } from "../../lib/supabase";
import { SupabaseUser, ProteinGoal, Gender } from "../types";
import { DEFAULT_BODY_WEIGHT, PROTEIN_GOALS } from "../constants";

export const useBodyWeight = (user: SupabaseUser | null) => {
  const [bodyWeight, setBodyWeight] = useState<number>(DEFAULT_BODY_WEIGHT);
  const [tempBodyWeight, setTempBodyWeight] = useState<string>(
    String(DEFAULT_BODY_WEIGHT)
  );
  const [proteinGoal, setProteinGoal] = useState<ProteinGoal>("maintain");
  const [gender, setGender] = useState<Gender>("male");

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

        // "general" → "maintain" 변환
        let userGoal = userProfile.protein_goal as ProteinGoal;
        if (!userGoal || userGoal === ("general" as unknown as ProteinGoal)) {
          userGoal = "maintain";
        }

        // gender 기본값
        let userGender = (userProfile.gender as Gender) || "male";
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
    if (!user) {
      setGender(newGender);
      return true;
    }

    try {
      // 로컬 상태는 즉시 업데이트
      setGender(newGender);

      // DB 업데이트는 선택적 (테이블 구조 확인 필요)
      // TODO: 나중에 DB 저장 추가
      console.log("✅ 성별 업데이트 성공 (로컬):", newGender);
      return true;
    } catch (error) {
      console.error("❌ 성별 업데이트 실패:", error);
      return false;
    }
  };

  // 단백질 목적 업데이트
  const updateProteinGoal = async (newGoal: ProteinGoal): Promise<boolean> => {
    if (!user) {
      setProteinGoal(newGoal);
      return true;
    }

    try {
      // 로컬 상태는 즉시 업데이트
      setProteinGoal(newGoal);

      // DB 업데이트는 선택적 (테이블 구조 확인 필요)
      // TODO: 나중에 DB 저장 추가
      console.log("✅ 단백질 목적 업데이트 성공 (로컬):", newGoal);
      return true;
    } catch (error) {
      console.error("❌ 단백질 목적 업데이트 실패:", error);
      return false;
    }
  };

  // 현재 단백질 목적에 따른 배수 정보 가져오기
  const getProteinMultipliers = () => {
    try {
      const currentGender = gender || "male";
      const currentGoal = proteinGoal || "maintain";

      if (
        !PROTEIN_GOALS[currentGender] ||
        !PROTEIN_GOALS[currentGender][currentGoal]
      ) {
        return {
          normal: 1.2,
          workout: 2.0,
          goalName: "체중 유지",
          goalIcon: "⚖️",
          description: "현재 체중과 근육량 유지",
        };
      }

      const goal = PROTEIN_GOALS[currentGender][currentGoal];
      return {
        normal: goal.normal,
        workout: goal.workout,
        goalName: goal.name,
        goalIcon: goal.icon,
        description: goal.description,
      };
    } catch {
      return {
        normal: 1.2,
        workout: 2.0,
        goalName: "체중 유지",
        goalIcon: "⚖️",
        description: "현재 체중과 근육량 유지",
      };
    }
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
